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
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          {primary.company_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Trigger keyword:{" "}
          <span className="font-mono">{primary.trigger_keyword}</span>
          {" · "}
          Status:{" "}
          <span className="capitalize">{primary.status ?? "pending"}</span>
        </p>
      </div>

      {/* Compact 4-up stat row. Two columns on phones (so each card is still
          readable), four from sm: up so the heatmap + chart show above the
          fold on a laptop. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          label="Conversations (7d)"
          value={conversations7d.toLocaleString()}
          hint="Customers this week"
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
              <Link
                href="/dashboard/unanswered"
                className="underline underline-offset-2"
              >
                Review the queue
              </Link>
            ) : (
              "Nothing waiting"
            )
          }
        />
        <StatCard
          label="Time saved"
          value={formatHours(timeSaved.hours)}
          hint={
            timeSaved.answered === 0
              ? "Counting starts on first answer"
              : `${timeSaved.answered.toLocaleString()} questions answered`
          }
          valueClassName="text-emerald-600"
        />
        <CostMeterCard used={cost.used} limit={cost.limit} pct={cost.pct} />
      </div>

      <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <div>
          <h2 className="text-base font-semibold">When customers chat</h2>
          <p className="text-xs text-muted-foreground">
            Customer messages by hour and weekday — last 30 days, SAST.
          </p>
        </div>
        <div className="mt-3">
          <ActivityHeatmap grid={heatmap.grid} max={heatmap.max} />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <div>
          <h2 className="text-base font-semibold">Answer quality</h2>
          <p className="text-xs text-muted-foreground">
            Daily share of bot replies that gave a confident, useful answer.
          </p>
        </div>
        <div className="mt-3">
          <AnswerRateChart data={answerRate} />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold">Next steps</h2>
        <p className="text-xs text-muted-foreground">
          Quick links to the most common tweaks.
        </p>
        <ul className="mt-3 space-y-1.5 text-sm">
          <li>
            <Link
              href="/dashboard/knowledge"
              className="underline underline-offset-4"
            >
              Upload a price list or FAQ document
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/settings"
              className="underline underline-offset-4"
            >
              Review the system prompt &amp; tone
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/unanswered"
              className="underline underline-offset-4"
            >
              Check the unanswered queue
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}

/**
 * Cost meter shown in the 4-up stat row. Matches StatCard sizing so heights
 * align, but adds a progress bar underneath that tints amber > 75% / red > 90%
 * so owners get a nudge before they hit their monthly cap.
 */
function CostMeterCard({
  used,
  limit,
  pct,
}: {
  used: number;
  limit: number;
  pct: number;
}) {
  const barColor =
    pct >= 90
      ? "bg-red-500"
      : pct >= 75
        ? "bg-amber-500"
        : "bg-primary";

  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
        Messages this month
      </div>
      <div className="mt-1 text-xl font-semibold leading-tight sm:text-2xl">
        {used.toLocaleString()}
        <span className="ml-1 text-xs font-normal text-muted-foreground sm:text-sm">
          / {limit.toLocaleString()}
        </span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="mt-1 line-clamp-2 text-[10px] text-muted-foreground sm:text-xs">
        {pct < 100
          ? `${(100 - pct).toFixed(0)}% remaining`
          : "Monthly limit reached"}
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
