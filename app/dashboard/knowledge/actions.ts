"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callN8n } from "@/lib/n8n";

/**
 * Kick off a system-prompt rebuild in the background. The user's action
 * returns as soon as the primary write succeeds; the rebuild lands a
 * second or two later. We swallow any error since the prompt will rebuild
 * on the next change anyway, and surfacing it would mask the primary write.
 */
function scheduleRebuild(userId: string, botId: string) {
  after(async () => {
    try {
      await callN8n("rebuild_prompt", userId, { bot_id: botId });
    } catch (err) {
      console.error("Background rebuild_prompt failed", err);
    }
  });
}

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

  return { userId: user.id, supabase };
}

/**
 * Step 1 of upload: create a signed upload URL the browser can PUT to.
 * The storage path is namespaced by bot id so the RLS-ish storage policy
 * can scope cleanup.
 */
export async function createUploadUrl(formData: FormData): Promise<{
  url: string;
  token: string;
  path: string;
}> {
  const botId = String(formData.get("bot_id") ?? "");
  const fileName = String(formData.get("file_name") ?? "upload.bin");
  const { supabase } = await requireUser(botId);

  const ext = fileName.includes(".")
    ? "." + fileName.split(".").pop()!.toLowerCase()
    : "";
  const path = `${botId}/${randomUUID()}${ext}`;

  const { data, error } = await supabase.storage
    .from("bot-documents")
    .createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "Signed URL failed");

  return { url: data.signedUrl, token: data.token, path };
}

/**
 * Step 2: the browser finished the upload, tell n8n to ingest it.
 */
export async function ingestUploadedDoc(formData: FormData) {
  const botId = String(formData.get("bot_id") ?? "");
  const fileName = String(formData.get("file_name") ?? "");
  const storagePath = String(formData.get("storage_path") ?? "");
  const mimeType = String(formData.get("mime_type") ?? "");

  const { userId } = await requireUser(botId);
  await callN8n("ingest_doc", userId, {
    bot_id: botId,
    file_name: fileName,
    storage_path: storagePath,
    mime_type: mimeType,
  });
  // Rebuild the prompt in the background so the user gets a fast response.
  scheduleRebuild(userId, botId);
  revalidatePath("/dashboard/knowledge");
  revalidatePath("/dashboard/settings");
}

export async function deleteDocument(formData: FormData) {
  const botId = String(formData.get("bot_id") ?? "");
  const docId = String(formData.get("doc_id") ?? "");
  const storagePath = String(formData.get("storage_path") ?? "");
  const { userId, supabase } = await requireUser(botId);

  // Delete from storage first (best effort; row delete is the source of truth).
  await supabase.storage.from("bot-documents").remove([storagePath]);
  await supabase.from("documents").delete().eq("id", docId);

  // Rebuild in the background — the row is gone, so the UI updates immediately.
  scheduleRebuild(userId, botId);
  revalidatePath("/dashboard/knowledge");
}

export async function saveFaq(formData: FormData) {
  const botId = String(formData.get("bot_id") ?? "");
  const faqId = String(formData.get("faq_id") ?? "") || null;
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  if (!question || !answer) throw new Error("Question and answer required");

  const { userId } = await requireUser(botId);
  await callN8n("save_faq", userId, {
    bot_id: botId,
    faq_id: faqId,
    question,
    answer,
  });
  // Rebuild in the background so the FAQ appears in the prompt within a couple seconds.
  scheduleRebuild(userId, botId);
  revalidatePath("/dashboard/knowledge");
  revalidatePath("/dashboard/settings");
}

export async function deleteFaq(formData: FormData) {
  const botId = String(formData.get("bot_id") ?? "");
  const faqId = String(formData.get("faq_id") ?? "");
  const { userId } = await requireUser(botId);
  await callN8n("save_faq", userId, {
    bot_id: botId,
    faq_id: faqId,
    question: "",
    answer: "",
    delete: true,
  });
  // Rebuild in the background.
  scheduleRebuild(userId, botId);
  revalidatePath("/dashboard/knowledge");
  revalidatePath("/dashboard/settings");
}
