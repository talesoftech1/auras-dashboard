import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Bot } from "@/lib/types";

/**
 * Returns the signed-in user + their primary (most recent) bot.
 * Redirects if not signed in or if the user has no bot.
 * Use from Server Components only.
 */
export async function requireBot(): Promise<{
  userId: string;
  userEmail: string;
  bot: Bot;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
}
