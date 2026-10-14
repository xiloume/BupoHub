/** Mini graphique en barres (SVG pur, sans dépendance). */
export function SignupsChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  const w = 100 / data.length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums">{total}</span>
        <span className="text-sm text-fg-muted">inscription{total > 1 ? "s" : ""} sur la période</span>
      </div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-36 w-full overflow-visible">
        {data.map((d, i) => {
          const h = (d.count / max) * 36;
          return (
            <g key={d.date}>
              <rect x={i * w + w * 0.2} y={40 - h} width={w * 0.6} height={h} rx={0.6} className="fill-accent/80 transition-all hover:fill-accent" vectorEffect="non-scaling-stroke">
                <title>{`${new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} : ${d.count}`}</title>
              </rect>
            </g>
          );
        })}
        <line x1="0" y1="40" x2="100" y2="40" className="stroke-border-strong" strokeWidth="0.3" />
      </svg>
      <div className="flex justify-between text-[11px] text-fg-subtle">
        <span>{new Date(data[0].date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
        <span>{new Date(data[data.length - 1].date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
      </div>
    </div>
  );
}
