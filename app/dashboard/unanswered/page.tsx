import { requireBot } from "@/lib/bot";
import { createClient } from "@/lib/supabase/server";
import type { UnansweredQuestion } from "@/lib/types";
import { formatDistanceToNow } from "@/lib/format";
import { saveAsFaq, markResolved, ignoreQuestion } from "./actions";

export default async function UnansweredPage() {
  const { bot } = await requireBot();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("unanswered_questions")
    .select("*")
    .eq("bot_id", bot.id)
    .eq("status", "open")
    .order("asked_at", { ascending: false })
    .limit(100);
  const items = (rows ?? []) as UnansweredQuestion[];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Unanswered questions</h1>
        <p className="text-muted-foreground">
          Every time the bot couldn&apos;t answer a customer, we flag the question
          here. Teach it the answer in one click.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <h2 className="text-lg font-medium">You&apos;re all caught up</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The bot answered every question in the last batch.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((q) => (
            <QuestionCard key={q.id} question={q} botId={bot.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  botId,
}: {
  question: UnansweredQuestion;
  botId: string;
}) {
  return (
    <div className="rounded-xl border bg-card shadow">
      <div className="p-5">
        <div className="flex items-baseline justify-between gap-4">
          <div className="font-medium">&ldquo;{question.question}&rdquo;</div>
          <div className="text-xs text-muted-foreground">
            {question.user_phone} · {formatDistanceToNow(question.asked_at)}
          </div>
        </div>

        <form action={saveAsFaq} className="mt-4 space-y-2">
          <input type="hidden" name="bot_id" value={botId} />
          <input type="hidden" name="question_id" value={question.id} />
          <input type="hidden" name="question" value={question.question} />
          <label className="text-xs font-medium text-muted-foreground">
            Teach the bot
          </label>
          <textarea
            name="answer"
            rows={2}
            placeholder="Type the answer the bot should have given..."
            className="w-full rounded-md border bg-transparent p-2 text-sm shadow-sm"
            required
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Save as FAQ
            </button>
            <button
              type="submit"
              formAction={markResolved}
              className="h-8 rounded-md border px-3 text-xs hover:bg-muted"
            >
              Mark resolved
            </button>
            <button
              type="submit"
              formAction={ignoreQuestion}
              className="h-8 rounded-md border px-3 text-xs text-muted-foreground hover:bg-muted"
            >
              Ignore
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
