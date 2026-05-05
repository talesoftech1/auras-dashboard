import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { Bot } from "@/lib/types";

/**
 * Returns the signed-in user + their primary (most recent) bot.
 * Redirects if not signed in or if the user has no bot.
 * Use from Server Components only.
 *
 * Both the auth check and the bot lookup are wrapped in React's cache(),
 * so calling requireBot() from multiple Server Components in the same
 * request only hits Supabase once.
 */
export const requireBot = cache(async (): Promise<{
  userId: string;
  userEmail: string;
  bot: Bot;
}> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("bots")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const bot = data as Bot | null;

  if (!bot) redirect("/onboarding");

  return { userId: user.id, userEmail: user.email ?? "", bot };
});
