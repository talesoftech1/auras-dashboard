import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// SA is UTC+2 year-round (no DST). All queries hit Supabase in UTC and we
// shift in-memory before bucketing into hour-of-day / day-of-week.
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

// Soft monthly message ceiling we display in the cost meter. Tune later when
// the actual plan tiers are wired into the bot row.
const MESSAGES_LIMIT_PER_MONTH = 5_000;

// Rough estimate of how long a human takes to read a customer message and
// type a useful reply. Used for "time saved" — multiply by fully-answered count.
const MINUTES_SAVED_PER_ANSWER = 2.5;

type MessageLite = {
  created_at: string;
  direction: string;
  fully_answered: boolean | null;
};

/**
 * Pull the last 30 days of messages for this bot once per request and let
 * the heat map / answer-rate computations share that fetch via cache().
 */
const getMessages30d = cache(async (botId: string): Promise<MessageLite[]> => {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("messages")
    .select("created_at, direction, fully_answered, conversations!inner(bot_id)")
    .eq("conversations.bot_id", botId)
    .gte("created_at", since);
  return ((data ?? []) as unknown) as MessageLite[];
});

/** 7×24 grid of inbound-message counts in SAST. grid[day][hour] = count. */
export async function getActivityHeatmap(botId: string) {
  const msgs = await getMessages30d(botId);
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  let max = 0;
  for (const m of msgs) {
    if (m.direction !== "user") continue;
    const t = new Date(m.created_at).getTime() + SAST_OFFSET_MS;
    const sast = new Date(t);
    const day = sast.getUTCDay(); // 0 = Sunday
    const hour = sast.getUTCHours();
    grid[day][hour] += 1;
    if (grid[day][hour] > max) max = grid[day][hour];
  }
  return { grid, max };
}

/** Daily fully-answered rate for the last 30 days. */
export async function getAnswerRateTrend(botId: string) {
  const msgs = await getMessages30d(botId);
  const buckets = new Map<string, { total: number; answered: number }>();
  for (const m of msgs) {
    if (m.direction !== "bot") continue;
    const t = new Date(m.created_at).getTime() + SAST_OFFSET_MS;
    const dayKey = new Date(t).toISOString().slice(0, 10);
    const cur = buckets.get(dayKey) ?? { total: 0, answered: 0 };
    cur.total += 1;
    if (m.fully_answered) cur.answered += 1;
    buckets.set(dayKey, cur);
  }
  // Walk the last 30 days even where there was no traffic, so the chart has a
  // continuous x-axis instead of a sparse one.
  const out: { date: string; rate: number; total: number }[] = [];
  const today = new Date(Date.now() + SAST_OFFSET_MS);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dayKey = d.toISOString().slice(0, 10);
    const b = buckets.get(dayKey);
    out.push({
      date: dayKey,
      rate: b && b.total > 0 ? Math.round((b.answered / b.total) * 100) : 0,
      total: b?.total ?? 0,
    });
  }
  return out;
}

/** Calendar-month message count vs. plan limit. */
export async function getCostMeter(botId: string) {
  const supabase = await createClient();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("messages")
    .select("id, conversations!inner(bot_id)", { count: "exact", head: true })
    .eq("conversations.bot_id", botId)
    .gte("created_at", start.toISOString());
  const used = count ?? 0;
  return {
    used,
    limit: MESSAGES_LIMIT_PER_MONTH,
    pct: Math.min(100, Math.round((used / MESSAGES_LIMIT_PER_MONTH) * 100)),
  };
}

/** Calendar-month "questions confidently answered" → estimated hours saved. */
export async function getTimeSaved(botId: string) {
  const supabase = await createClient();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("messages")
    .select("id, conversations!inner(bot_id)", { count: "exact", head: true })
    .eq("conversations.bot_id", botId)
    .eq("direction", "bot")
    .eq("fully_answered", true)
    .gte("created_at", start.toISOString());
  const answered = count ?? 0;
  const minutes = answered * MINUTES_SAVED_PER_ANSWER;
  return {
    answered,
    minutes,
    hours: minutes / 60,
  };
}

/** Conversations with any activity in the last 7 days. */
export async function getConversationsCount7d(botId: string) {
  const supabase = await createClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("bot_id", botId)
    .gte("last_message_at", since);
  return count ?? 0;
}

/** Open items on the unanswered queue. */
export async function getOpenUnansweredCount(botId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("unanswered_questions")
    .select("id", { count: "exact", head: true })
    .eq("bot_id", botId)
    .eq("status", "open");
  return count ?? 0;
}

/** Total documents in the knowledge base for this bot. */
export async function getDocumentsCount(botId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("bot_id", botId);
  return count ?? 0;
}
