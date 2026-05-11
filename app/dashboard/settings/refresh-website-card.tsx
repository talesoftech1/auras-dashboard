"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const COUNTDOWN_SECONDS = 60;
const STORAGE_KEY_PREFIX = "auras_refresh_started_";

interface Props {
  botId: string;
  defaultUrl: string;
  lastRefreshedLabel: string;
  refreshAction: (formData: FormData) => Promise<void>;
}

/**
 * Website knowledge refresh card with a 60-second countdown.
 *
 * The customer clicks Refresh → the server action returns immediately (Bot
 * Factory runs in the background via after()) → we kick off a local 60s
 * countdown so they know the work is happening. When it hits zero, the
 * button morphs into a Reload button that calls router.refresh() to pull
 * the new system_prompt from Supabase.
 *
 * Countdown start time is persisted in localStorage keyed by bot_id so a
 * mid-countdown page reload picks up where we left off.
 */
export function RefreshWebsiteCard({
  botId,
  defaultUrl,
  lastRefreshedLabel,
  refreshAction,
}: Props) {
  const [url, setUrl] = useState(defaultUrl);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Resume an in-flight countdown if the user reloaded the page mid-refresh.
  useEffect(() => {
    const startedAtRaw = window.localStorage.getItem(
      STORAGE_KEY_PREFIX + botId,
    );
    if (!startedAtRaw) return;
    const elapsed = (Date.now() - Number(startedAtRaw)) / 1000;
    const left = Math.max(0, COUNTDOWN_SECONDS - Math.floor(elapsed));
    if (left > 0) setRemaining(left);
    else setRemaining(0); // already done — show the reload button
  }, [botId]);

  // Tick the countdown.
  useEffect(() => {
    if (remaining === null || remaining <= 0) return;
    const t = setTimeout(() => setRemaining((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || (remaining !== null && remaining > 0)) return;

    setError(null);
    const fd = new FormData();
    fd.set("bot_id", botId);
    fd.set("website_url", url.trim());

    startTransition(async () => {
      try {
        await refreshAction(fd);
        window.localStorage.setItem(
          STORAGE_KEY_PREFIX + botId,
          String(Date.now()),
        );
        setRemaining(COUNTDOWN_SECONDS);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Refresh failed");
      }
    });
  }

  function handleReload() {
    window.localStorage.removeItem(STORAGE_KEY_PREFIX + botId);
    setRemaining(null);
    router.refresh();
  }

  const counting = remaining !== null && remaining > 0;
  const ready = remaining === 0;
  const buttonDisabled = pending || counting || url.trim().length === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label
          className="text-xs font-medium text-muted-foreground"
          htmlFor="website_url"
        >
          Website URL
        </label>
        <input
          id="website_url"
          type="text"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="mangocafe.co.za"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={pending || counting}
          className="w-full rounded-md border bg-transparent px-3 py-2 shadow-sm disabled:opacity-60"
        />
        <p className="text-[11px] text-muted-foreground">
          Type it however — bare domain, www., or full https:// URL all work.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {counting
            ? "Scraping and rebuilding..."
            : ready
              ? "Refresh ready — reload to see your new prompt."
              : lastRefreshedLabel}
        </p>

        {ready ? (
          <button
            type="button"
            onClick={handleReload}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:bg-primary/90"
          >
            Reload page
          </button>
        ) : (
          <button
            type="submit"
            disabled={buttonDisabled}
            aria-busy={pending || counting || undefined}
            className={cn(
              "h-9 min-w-[180px] rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:bg-primary/90",
              buttonDisabled && "cursor-wait opacity-60",
            )}
          >
            {pending
              ? "Starting..."
              : counting
                ? `Refreshing... ${remaining}s`
                : "Refresh website knowledge"}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        Scraping and recomposing usually takes 60-90 seconds. Your FAQs and
        uploaded documents are kept as-is.
      </p>
    </form>
  );
}
