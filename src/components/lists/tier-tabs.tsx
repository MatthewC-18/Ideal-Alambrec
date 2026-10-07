"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

export function TierTabs({ tiers, value }: { tiers: { key: string; label: string; pct: string }[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Categoría de precio">
      {tiers.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={t.key === value}
          onClick={() => {
            const next = new URLSearchParams(sp.toString());
            next.set("categoria", t.key);
            router.replace(`${pathname}?${next.toString()}`, { scroll: false });
          }}
          className={cn("rounded-full border px-3 py-1.5 text-[13px] transition", t.key === value ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-2 hover:bg-page")}
        >
          {t.label} <span className={cn("ml-1 text-[11.5px]", t.key === value ? "text-white/80" : "text-muted")}>{t.pct}</span>
        </button>
      ))}
    </div>
  );
}
