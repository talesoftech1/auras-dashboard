"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callN8n } from "@/lib/n8n";

async function requireUser(botId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: bot } = await supabase
    .from("bots")
    .select("id")
    .eq("id", botId)
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!bot) throw new Error("Bot not found or not yours");

  return { userId: user.id };
}

export async function updateBusinessDetails(formData: FormData) {
  const botId = String(formData.get("bot_id") ?? "");
  const { userId } = await requireUser(botId);

  await callN8n("update_bot", userId, {
    bot_id: botId,
    patch: {
      company_name: String(formData.get("company_name") ?? ""),
      contact_email: String(formData.get("contact_email") ?? ""),
      contact_phone: String(formData.get("contact_phone") ?? ""),
    },
  });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

export async function updateSystemPrompt(formData: FormData) {
  const botId = String(formData.get("bot_id") ?? "");
  const systemPrompt = String(formData.get("system_prompt") ?? "");
  const { userId } = await requireUser(botId);

  await callN8n("update_bot", userId, {
    bot_id: botId,
    patch: {
      system_prompt: systemPrompt,
      system_prompt_source: "manual",
    },
  });
  revalidatePath("/dashboard/settings");
}

/**
 * Re-scrape the customer's website and recompose the system prompt without
 * touching their FAQs or uploaded docs. Bot Factory writes raw_scrape and
 * pings Rebuild — the dashboard returns immediately and the work happens in
 * the background (~60-90s end to end).
 */
export async function refreshWebsiteKnowledge(formData: FormData) {
  const botId = String(formData.get("bot_id") ?? "");
  const websiteUrl = String(formData.get("website_url") ?? "").trim();
  if (!websiteUrl) throw new Error("Website URL required");

  const { userId } = await requireUser(botId);
  const supabase = await createClient();

  const { data: bot, error } = await supabase
    .from("bots")
    .select(
      "company_name, trigger_keyword, contact_email, contact_phone, website_url",
    )
    .eq("id", botId)
    .single();
  if (error || !bot) throw new Error("Bot not found");

  // If the customer changed their URL on the same form, persist that first
  // so the dashboard reflects the new URL even if the scrape itself fails.
  if (bot.website_url !== websiteUrl) {
    const { error: updateErr } = await supabase
      .from("bots")
      .update({ website_url: websiteUrl })
      .eq("id", botId);
    if (updateErr) throw new Error(updateErr.message);
  }

  // Fire Bot Factory in the background. Bot Factory scrapes, writes
  // raw_scrape + raw_scrape_updated_at, then pings Rebuild to recompose
  // the system_prompt from raw_scrape + docs + FAQs.
  after(async () => {
    try {
      await callN8n("bot_factory", userId, {
        bot_id: botId,
        company_name: bot.company_name,
        trigger_keyword: bot.trigger_keyword,
        website_url: websiteUrl,
        contact_email: bot.contact_email ?? "",
        phone: bot.contact_phone ?? "",
        owner_user_id: userId,
      });
    } catch (err) {
      console.error("Background website refresh failed", err);
    }
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

export async function rebuildFromKnowledge(formData: FormData) {
  const botId = String(formData.get("bot_id") ?? "");
  const { userId } = await requireUser(botId);

  // Flip source back to auto so the rebuild webhook will overwrite.
  await callN8n("update_bot", userId, {
    bot_id: botId,
    patch: { system_prompt_source: "auto" },
  });
  await callN8n("rebuild_prompt", userId, { bot_id: botId });
  revalidatePath("/dashboard/settings");
}
