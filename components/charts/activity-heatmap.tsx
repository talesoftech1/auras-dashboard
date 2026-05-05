// Days are rotated so Monday is first (typical for biz weeks); the underlying
// grid is index 0=Sun..6=Sat coming out of getActivityHeatmap.
const DAY_ORDER: number[] = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  grid: number[][];
  max: number;
}

export function ActivityHeatmap({ grid, max }: Props) {
  const totalMessages = grid.flat().reduce((a, b) => a + b, 0);

  if (totalMessages === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No customer messages in the last 30 days yet — once people start
        chatting your bot, the busy hours will show up here.
      </div>
    );
  }

  // Hour labels along the top; we show 4 anchors so it stays readable.
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="flex items-center text-[10px] uppercase tracking-wide text-muted-foreground">
          <div className="w-10 shrink-0" />
          <div className="grid flex-1 grid-cols-[repeat(24,minmax(0,1fr))]">
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={h} className="text-center">
                {h % 6 === 0 ? formatHour(h) : ""}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-1 space-y-1">
          {DAY_ORDER.map((dow, rowIdx) => (
            <div key={dow} className="flex items-center gap-1">
              <div className="w-10 shrink-0 text-xs text-muted-foreground">
                {DAY_LABELS[rowIdx]}
              </div>
              <div className="grid flex-1 grid-cols-[repeat(24,minmax(0,1fr))] gap-[2px]">
                {grid[dow].map((count, h) => (
                  <Cell key={h} count={count} max={max} hour={h} day={DAY_LABELS[rowIdx]} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>quiet</span>
          <Legend max={max} />
          <span>busy</span>
          <span className="ml-auto">{totalMessages.toLocaleString()} messages · last 30d</span>
        </div>
      </div>
    </div>
  );
}

function Cell({
  count,
  max,
  hour,
  day,
}: {
  count: number;
  max: number;
  hour: number;
  day: string;
}) {
  // Map count to opacity 0..1 with a small floor so cells stay visible.
  const intensity = max > 0 ? Math.min(1, count / max) : 0;
  const alpha = count === 0 ? 0.05 : 0.15 + intensity * 0.85;
  return (
    <div
      title={`${day} ${formatHour(hour)} · ${count} ${count === 1 ? "message" : "messages"}`}
      className="aspect-square rounded-sm"
      style={{ backgroundColor: `hsl(var(--primary) / ${alpha})` }}
    />
  );
}

function Legend({ max }: { max: number }) {
  const steps = 5;
  return (
    <div className="flex items-center gap-[2px]">
      {Array.from({ length: steps }).map((_, i) => {
        const alpha = 0.15 + ((i + 1) / steps) * 0.85;
        return (
          <div
            key={i}
            className="h-3 w-4 rounded-sm"
            style={{ backgroundColor: `hsl(var(--primary) / ${alpha})` }}
          />
        );
      })}
      <span className="ml-1 text-muted-foreground">peak {max}</span>
    </div>
  );
}

function formatHour(h: number): string {
  if (h === 0) return "12a";
  if (h === 12) return "12p";
  if (h < 12) return `${h}a`;
  return `${h - 12}p`;
}
