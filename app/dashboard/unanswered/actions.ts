"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { callN8n } from "@/lib/n8n";

async function requireUserAndBot(botId: string) {
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

export async function saveAsFaq(formData: FormData) {
  const botId = String(formData.get("bot_id") ?? "");
  const questionId = String(formData.get("question_id") ?? "");
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  if (!answer) throw new Error("Answer is required");

  const { userId } = await requireUserAndBot(botId);

  await callN8n("save_faq", userId, {
    bot_id: botId,
    question,
    answer,
  });

  // Mark the unanswered question as resolved.
  const supabase = await createClient();
  await supabase
    .from("unanswered_questions")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolution_note: answer,
    })
    .eq("id", questionId);

  revalidatePath("/dashboard/unanswered");
}

export async function markResolved(formData: FormData) {
  const botId = String(formData.get("bot_id") ?? "");
  const questionId = String(formData.get("question_id") ?? "");
  await requireUserAndBot(botId);

  const supabase = await createClient();
  await supabase
    .from("unanswered_questions")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", questionId);

  revalidatePath("/dashboard/unanswered");
}

export async function ignoreQuestion(formData: FormData) {
  const botId = String(formData.get("bot_id") ?? "");
  const questionId = String(formData.get("question_id") ?? "");
  await requireUserAndBot(botId);

  const supabase = await createClient();
  await supabase
    .from("unanswered_questions")
    .update({ status: "ignored" })
    .eq("id", questionId);

  revalidatePath("/dashboard/unanswered");
}
