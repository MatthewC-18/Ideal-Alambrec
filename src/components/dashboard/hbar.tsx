const SERIES_1 = "#1f5bcf";

export function HBarList({ items, valueLabel }: { items: { label: string; value: number; sub?: string }[]; valueLabel: (v: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li key={it.label} className="group" title={`${it.label}: ${valueLabel(it.value)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate">{it.label}</span>
            <span className="shrink-0 font-medium tabular">
              {valueLabel(it.value)}
              {it.sub && <span className="ml-1.5 font-normal text-muted">{it.sub}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-brand-50">
            <div className="h-2 rounded-full transition-all group-hover:opacity-85" style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: SERIES_1 }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
