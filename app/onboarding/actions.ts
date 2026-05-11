"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { notifyOps } from "@/lib/notify";
import { callN8n } from "@/lib/n8n";
import { normalizeWebsiteUrl } from "@/lib/url";

/**
 * Mirrors the format used by the FindBusiness lead-gen pipeline:
 * 3 uppercase letters from the company name + 3 random digits, e.g.
 * "Mango Café" -> "MAN417". Matching the format means a customer's code
 * looks the same whether they came in cold or via self-serve signup.
 *
 * Falls back to "AUR" when the company name has no usable letters (rare).
 */
function generateCode(companyName: string): string {
  const letters =
    (companyName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3) || "AUR")
      .padEnd(3, "X");
  const digits = Math.floor(100 + Math.random() * 900).toString();
  return `${letters}${digits}`;
}

/** Sane default while the customer hasn't uploaded any docs/FAQs yet. */
function buildStubPrompt(companyName: string): string {
  return [
    `You are a friendly WhatsApp customer service assistant for ${companyName}.`,
    "",
    "Respond in short, casual messages (2-4 sentences). Never use markdown.",
    "If you don't know something specific, say so honestly and offer to have someone follow up.",
    "",
    "The owner hasn't uploaded business documents or FAQs yet — when customers ask specifics like prices, hours, or addresses, say you'll find out and get back to them.",
    "",
    "When calling send_text_reply, set fully_answered=true only if you gave a concrete useful answer. Otherwise false.",
  ].join("\n");
}

/**
 * Step 1 of onboarding: collect business basics, mint a unique 6-char code
 * for the shared-number routing, and create the bot row. The bot is created
 * with status='active' and whatsapp_setup_status='using_shared' so the user
 * can immediately test it on the Auras shared WhatsApp number.
 */
export async function createBot(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const companyName = String(formData.get("company_name") ?? "").trim();
  if (!companyName) throw new Error("Business name is required");

  // Accept the casual forms (bare domain, www.foo, http://, https://) — the
  // normalizer hands back a clean URL or throws a friendly error.
  const websiteUrl = normalizeWebsiteUrl(
    formData.get("website_url") as string | null,
  );
  const contactPhone =
    String(formData.get("contact_phone") ?? "").trim() || null;

  const supabase = await createClient();

  // Retry on the rare collision against bots_trigger_keyword_unique.
  let bot: { id: string; trigger_keyword: string } | null = null;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode(companyName);
    const { data, error } = await supabase
      .from("bots")
      .insert({
        owner_user_id: user.id,
        company_name: companyName,
        contact_email: user.email ?? null,
        contact_phone: contactPhone,
        website_url: websiteUrl,
        trigger_keyword: code,
        // Stays 'pending' until the customer messages the trigger code from
        // their own phone — Inbound Handler v2 flips status='active' on claim.
        status: "pending",
        whatsapp_setup_status: "using_shared",
        system_prompt: buildStubPrompt(companyName),
        system_prompt_source: "auto",
      })
      .select("id, trigger_keyword")
      .single();

    if (!error && data) {
      bot = data;
      break;
    }
    lastError = new Error(error?.message ?? "Bot insert failed");
    // Postgres unique-violation: try again with a fresh code.
    if (error?.code === "23505") continue;
    // Anything else is a real error — break and surface.
    break;
  }

  if (!bot) {
    throw lastError ?? new Error("Couldn't create bot");
  }

  // Background notification so ops sees the new signup.
  notifyOps({
    title: "New customer signed up",
    body: `${companyName} (${user.email ?? "no email"}) — code: ${
      bot.trigger_keyword
    }, phone: ${contactPhone ?? "not given"}, website: ${
      websiteUrl ?? "none"
    }`,
    botId: bot.id,
  });

  // If a website was provided, kick off Bot Factory to scrape it and
  // overwrite the stub system_prompt with a real Claude-built knowledge base.
  // The webhook responds immediately (responseMode: onReceived) and the
  // n8n workflow continues running on its own — usually finishes in 60-90s.
  // Bot Factory's update path filters on system_prompt_source='auto', so if
  // the customer manually edits their prompt before enrichment lands, their
  // edit wins.
  if (websiteUrl) {
    try {
      await callN8n("bot_factory", user.id, {
        bot_id: bot.id,
        company_name: companyName,
        trigger_keyword: bot.trigger_keyword,
        website_url: websiteUrl,
        contact_email: user.email ?? "",
        phone: contactPhone ?? "",
        owner_user_id: user.id,
      });
    } catch (err) {
      // Enrichment failing isn't fatal — the customer still has a working
      // bot with the stub prompt and can upload docs manually.
      console.error("Bot Factory enrichment kickoff failed", err);
    }
  }

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
}

/**
 * Settings-side action: customer asks to upgrade from shared number to their
 * own dedicated WhatsApp Business number. Stores the number on the bot row,
 * flips status to pending_provisioning, pings ops to do the Meta side.
 *
 * Bot stays operational on the shared number until ops flips it to connected.
 */
export async function requestOwnNumber(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const botId = String(formData.get("bot_id") ?? "");
  const phoneNumber = String(formData.get("phone_number") ?? "").trim();

  if (!botId) throw new Error("Missing bot id");
  if (!phoneNumber) throw new Error("WhatsApp number is required");

  const cleaned = phoneNumber.replace(/[\s-]/g, "");
  if (!/^\+?\d{8,15}$/.test(cleaned)) {
    throw new Error(
      "Phone number doesn't look right — use international format like +27821234567."
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("bots")
    .update({
      whatsapp_phone_number: cleaned,
      whatsapp_setup_status: "pending_provisioning",
    })
    .eq("id", botId)
    .eq("owner_user_id", user.id);

  if (error) throw new Error(error.message);

  notifyOps({
    title: "WhatsApp upgrade requested",
    body: `Add ${cleaned} to Meta Business Manager and link it to this bot, then set whatsapp_setup_status='connected'.`,
    botId,
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}
