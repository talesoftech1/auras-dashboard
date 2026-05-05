interface Point {
  date: string; // YYYY-MM-DD
  rate: number; // 0..100
  total: number;
}

interface Props {
  data: Point[];
}

const W = 720;
const H = 220;
const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

/**
 * Inline SVG line+area chart. Avoids pulling in a chart library for one view.
 * Renders the % fully-answered per day, with day-total messages as a faint
 * bar in the background so empty days are obviously empty.
 */
export function AnswerRateChart({ data }: Props) {
  const totalMessages = data.reduce((s, d) => s + d.total, 0);

  if (totalMessages === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No bot replies yet — once your bot starts answering customers, you'll
        see the daily &ldquo;confidently answered&rdquo; rate here.
      </div>
    );
  }

  const innerW = W - PAD_LEFT - PAD_RIGHT;
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const xStep = innerW / Math.max(1, data.length - 1);
  const maxTotal = Math.max(1, ...data.map((d) => d.total));

  const pts = data.map((d, i) => ({
    x: PAD_LEFT + i * xStep,
    y: PAD_TOP + (1 - d.rate / 100) * innerH,
    barH: (d.total / maxTotal) * innerH,
    rate: d.rate,
    total: d.total,
    date: d.date,
  }));

  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    pts.length > 0
      ? `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${PAD_TOP + innerH} L${pts[0].x.toFixed(1)},${PAD_TOP + innerH} Z`
      : "";

  // Average rate, weighted by daily volume (so a quiet day with 100% doesn't
  // dominate a busy day with 80%).
  const totalAnswered = data.reduce((s, d) => s + (d.rate / 100) * d.total, 0);
  const avg = totalMessages > 0 ? Math.round((totalAnswered / totalMessages) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">
        Average <span className="font-semibold text-foreground">{avg}%</span> answered confidently this month — across{" "}
        {totalMessages.toLocaleString()} bot {totalMessages === 1 ? "reply" : "replies"}.
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full text-foreground"
        preserveAspectRatio="none"
      >
        {/* gridlines */}
        {[0, 25, 50, 75, 100].map((p) => {
          const y = PAD_TOP + (1 - p / 100) * innerH;
          return (
            <g key={p}>
              <line
                x1={PAD_LEFT}
                x2={W - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.08"
              />
              <text
                x={PAD_LEFT - 6}
                y={y + 3}
                fontSize="9"
                textAnchor="end"
                fill="currentColor"
                fillOpacity="0.5"
              >
                {p}%
              </text>
            </g>
          );
        })}

        {/* daily message-volume bars (faint background) */}
        {pts.map((p, i) => (
          <rect
            key={`bar-${i}`}
            x={p.x - Math.max(1, xStep * 0.35)}
            y={PAD_TOP + innerH - p.barH}
            width={Math.max(2, xStep * 0.7)}
            height={p.barH}
            fill="currentColor"
            fillOpacity="0.05"
          />
        ))}

        {/* area + line */}
        <path d={areaPath} fill="hsl(var(--primary))" fillOpacity="0.15" />
        <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />

        {/* dots on days with traffic */}
        {pts.map((p, i) =>
          p.total > 0 ? (
            <g key={`pt-${i}`}>
              <circle cx={p.x} cy={p.y} r="3" fill="hsl(var(--primary))" />
              <title>
                {p.date} · {p.rate}% answered ({p.total} {p.total === 1 ? "reply" : "replies"})
              </title>
            </g>
          ) : null
        )}

        {/* x-axis labels: first, mid, last */}
        {pts.length > 0 && (
          <>
            <XLabel x={pts[0].x} y={H - 8} text={shortDate(pts[0].date)} anchor="start" />
            {pts.length > 6 && (
              <XLabel
                x={pts[Math.floor(pts.length / 2)].x}
                y={H - 8}
                text={shortDate(pts[Math.floor(pts.length / 2)].date)}
                anchor="middle"
              />
            )}
            <XLabel
              x={pts[pts.length - 1].x}
              y={H - 8}
              text={shortDate(pts[pts.length - 1].date)}
              anchor="end"
            />
          </>
        )}
      </svg>
    </div>
  );
}

function XLabel({
  x,
  y,
  text,
  anchor,
}: {
  x: number;
  y: number;
  text: string;
  anchor: "start" | "middle" | "end";
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize="10"
      textAnchor={anchor}
      fill="currentColor"
      fillOpacity="0.6"
    >
      {text}
    </text>
  );
}

function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}
