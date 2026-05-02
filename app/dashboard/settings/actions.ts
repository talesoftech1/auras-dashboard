"use server";

import { revalidatePath } from "next/cache";
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
