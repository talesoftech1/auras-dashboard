import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side cached current user. React's cache() dedupes within a single
 * request, so calling getCurrentUser() from the layout AND from requireBot()
 * in the same render only hits Supabase Auth once.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
