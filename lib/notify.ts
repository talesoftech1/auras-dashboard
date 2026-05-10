import "server-only";

/**
 * Best-effort ops notification for onboarding events. Posts to a Slack or
 * Discord-compatible incoming webhook when OPS_NOTIFY_URL is set; otherwise
 * just logs to the server console (visible in Vercel runtime logs).
 *
 * Always swallows errors — a notification failure must never break the user-
 * facing action that triggered it.
 */
export async function notifyOps(payload: {
  title: string;
  body: string;
  /** Optional bot id, for clickable references back into Supabase. */
  botId?: string;
}) {
  const url = process.env.OPS_NOTIFY_URL;
  const line = `[Auras] ${payload.title}\n${payload.body}${
    payload.botId ? `\nbot_id: ${payload.botId}` : ""
  }`;

  if (!url) {
    console.log(line);
    return;
  }

  try {
    // Slack expects { text }; Discord expects { content }. Sending both keys
    // works for either service — they each ignore the one they don't read.
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: line, content: line }),
    });
  } catch (err) {
    console.error("notifyOps failed", err);
  }
}
