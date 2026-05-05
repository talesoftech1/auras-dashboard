import Link from "next/link";
import { requireBot } from "@/lib/bot";
import {
  getActivityHeatmap,
  getAnswerRateTrend,
  getCostMeter,
  getTimeSaved,
  getConversationsCount7d,
  getOpenUnansweredCount,
} from "@/lib/analytics";
import { StatCard } from "@/components/stat-card";
import { ActivityHeatmap } from "@/components/charts/activity-heatmap";
import { AnswerRateChart } from "@/components/charts/answer-rate-chart";

export default async function DashboardHome() {
  const { bot: primary } = await requireBot();

  // Fan out the analytics queries — they're independent so Promise.all keeps
  // total dashboard latency at the slowest single query, not their sum.
  const [
    heatmap,
    answerRate,
    cost,
    timeSaved,
    conversations7d,
    unanswered,
  ] = await Promise.all([
    getActivityHeatmap(primary.id),
    getAnswerRateTrend(primary.id),
    getCostMeter(primary.id),
    getTimeSaved(primary.id),
    getConversationsCount7d(primary.id),
    getOpenUnansweredCount(primary.id),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">{primary.company_name}</h1>
        <p className="text-muted-foreground">
          Trigger keyword: <span className="font-mono">{primary.trigger_keyword}</span>
          {" · "}
          Status: <span className="capitalize">{primary.status ?? "pending"}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Conversations (7d)"
          value={conversations7d.toLocaleString()}
          hint="Customers your bot has chatted with this week"
        />
        <StatCard
          label="Unanswered"
          value={
            <span className={unanswered > 0 ? "text-amber-600" : undefined}>
              {unanswered.toLocaleString()}
            </span>
          }
          hint={
            unanswered > 0 ? (
              <Link href="/dashboard/unanswered" className="underline underline-offset-4">
                Review the queue
              </Link>
            ) : (
              "Nothing waiting on you — nice."
            )
          }
        />
        <StatCard
          label="Time saved"
          value={formatHours(timeSaved.hours)}
          hint={
            timeSaved.answered === 0
              ? "We start counting once your bot answers customers"
              : `${timeSaved.answered.toLocaleString()} questions confidently answered this month`
          }
          valueClassName="text-emerald-600"
        />
        <CostMeterCard used={cost.used} limit={cost.limit} pct={cost.pct} />
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-lg font-semibold">When customers chat</h2>
            <p className="text-sm text-muted-foreground">
              Customer messages by hour and weekday — last 30 days, SAST.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <ActivityHeatmap grid={heatmap.grid} max={heatmap.max} />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Answer quality</h2>
          <p className="text-sm text-muted-foreground">
            Daily share of bot replies that gave a confident, useful answer.
          </p>
        </div>
        <div className="mt-4">
          <AnswerRateChart data={answerRate} />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Next steps</h2>
        <p className="text-sm text-muted-foreground">
          Quick links to the most common tweaks.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <Link href="/dashboard/knowledge" className="underline underline-offset-4">
              Upload a price list or FAQ document
            </Link>
          </li>
          <li>
            <Link href="/dashboard/settings" className="underline underline-offset-4">
              Review the system prompt &amp; tone
            </Link>
          </li>
          <li>
            <Link href="/dashboard/unanswered" className="underline underline-offset-4">
              Check the unanswered queue
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}

function CostMeterCard({
  used,
  limit,
  pct,
}: {
  used: number;
  limit: number;
  pct: number;
}) {
  // Tint the bar amber > 75%, red > 90% so owners get a nudge before they hit it.
  const barColor =
    pct >= 90
      ? "bg-red-500"
      : pct >= 75
        ? "bg-amber-500"
        : "bg-primary";

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Messages this month
      </div>
      <div className="mt-2 text-3xl font-semibold leading-tight">
        {used.toLocaleString()}
        <span className="ml-1 text-base font-normal text-muted-foreground">
          / {limit.toLocaleString()}
        </span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {pct < 100
          ? `${(100 - pct).toFixed(0)}% of your monthly allowance still available`
          : "Monthly limit reached — message us to upgrade"}
      </div>
    </div>
  );
}

function formatHours(hours: number): string {
  if (hours <= 0) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 10) return `${hours.toFixed(1)} hrs`;
  return `${Math.round(hours)} hrs`;
}
