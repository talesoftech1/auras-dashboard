"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

type Pending = "save" | "resolve" | "ignore" | null;

interface Props {
  botId: string;
  questionId: string;
  question: string;
  saveAsFaq: (formData: FormData) => Promise<void> | void;
  markResolved: (formData: FormData) => Promise<void> | void;
  ignoreQuestion: (formData: FormData) => Promise<void> | void;
}

/**
 * Per-card client wrapper around the three actions on an unanswered question.
 * Tracks which action is in flight so we can show a per-button loading label
 * (a single shared form via useFormStatus would only tell us "pending", not
 * which button caused it).
 */
export function UnansweredCardActions({
  botId,
  questionId,
  question,
  saveAsFaq,
  markResolved,
  ignoreQuestion,
}: Props) {
  const [answer, setAnswer] = useState("");
  const [pending, setPending] = useState<Pending>(null);
  const [, startTransition] = useTransition();
  const busy = pending !== null;

  function buildFormData() {
    const fd = new FormData();
    fd.set("bot_id", botId);
    fd.set("question_id", questionId);
    fd.set("question", question);
    fd.set("answer", answer);
    return fd;
  }

  function handle(
    kind: NonNullable<Pending>,
    action: (fd: FormData) => Promise<void> | void,
  ) {
    if (busy) return;
    if (kind === "save" && answer.trim().length === 0) return;
    setPending(kind);
    const fd = buildFormData();
    startTransition(async () => {
      try {
        await action(fd);
        // On success, revalidatePath() in the action removes this row from
        // the list, unmounting us. If the action errors and we're still here,
        // clear the pending state so the user can retry.
      } catch (err) {
        console.error(err);
      } finally {
        setPending(null);
      }
    });
  }

  return (
    <div className="mt-4 space-y-2">
      <label className="text-xs font-medium text-muted-foreground">
        Teach the bot
      </label>
      <textarea
        rows={2}
        placeholder="Type the answer the bot should have given..."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={busy}
        className="w-full rounded-md border bg-transparent p-2 text-sm shadow-sm disabled:opacity-60"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handle("save", saveAsFaq)}
          disabled={busy || answer.trim().length === 0}
          aria-busy={pending === "save" || undefined}
          className={cn(
            "h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity hover:bg-primary/90",
            (busy || answer.trim().length === 0) && "cursor-not-allowed opacity-60",
            pending === "save" && "cursor-wait",
          )}
        >
          {pending === "save" ? "Saving..." : "Save as FAQ"}
        </button>
        <button
          type="button"
          onClick={() => handle("resolve", markResolved)}
          disabled={busy}
          aria-busy={pending === "resolve" || undefined}
          className={cn(
            "h-8 rounded-md border px-3 text-xs transition-opacity hover:bg-muted",
            busy && "cursor-not-allowed opacity-60",
            pending === "resolve" && "cursor-wait",
          )}
        >
          {pending === "resolve" ? "Resolving..." : "Mark resolved"}
        </button>
        <button
          type="button"
          onClick={() => handle("ignore", ignoreQuestion)}
          disabled={busy}
          aria-busy={pending === "ignore" || undefined}
          className={cn(
            "h-8 rounded-md border px-3 text-xs text-muted-foreground transition-opacity hover:bg-muted",
            busy && "cursor-not-allowed opacity-60",
            pending === "ignore" && "cursor-wait",
          )}
        >
          {pending === "ignore" ? "Ignoring..." : "Ignore"}
        </button>
      </div>
    </div>
  );
}
