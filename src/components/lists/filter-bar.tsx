"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type FilterField =
  | { type: "search"; name: string; placeholder: string }
  | { type: "select"; name: string; label: string; options: { value: string; label: string }[] }
  | { type: "date"; name: string; label: string }
  | { type: "toggle"; name: string; label: string };

export function FilterBar({ fields }: { fields: FilterField[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const searchField = fields.find((f) => f.type === "search");
  const [text, setText] = useState(searchField ? sp.get(searchField.name) ?? "" : "");

  const update = (name: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete("pagina");
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  useEffect(() => {
    if (!searchField) return;
    const current = sp.get(searchField.name) ?? "";
    if (text === current) return;
    const t = setTimeout(() => update(searchField.name, text.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const active = fields.some((f) => f.type !== "search" && sp.get(f.name)) || !!text;

  return (
    <div className="mb-4 flex flex-wrap items-end gap-2">
      {fields.map((f) => {
        if (f.type === "search")
          return (
            <div key={f.name} className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
              <input className="input pl-9" placeholder={f.placeholder} value={text} onChange={(e) => setText(e.target.value)} aria-label={f.placeholder} />
            </div>
          );
        if (f.type === "select")
          return (
            <select key={f.name} className="input w-auto min-w-[150px]" value={sp.get(f.name) ?? ""} onChange={(e) => update(f.name, e.target.value)} aria-label={f.label}>
              <option value="">{f.label}: todos</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          );
        if (f.type === "date")
          return (
            <label key={f.name} className="flex items-center gap-2 text-[13px] text-ink-2">
              {f.label}
              <input type="date" className="input w-auto" value={sp.get(f.name) ?? ""} onChange={(e) => update(f.name, e.target.value)} />
            </label>
          );
        return (
          <button
            key={f.name}
            type="button"
            onClick={() => update(f.name, sp.get(f.name) ? "" : "1")}
            aria-pressed={!!sp.get(f.name)}
            className={cn("h-10 rounded-lg border px-3 text-[13px] transition", sp.get(f.name) ? "border-warn bg-warn-bg text-warn-ink" : "border-line-strong bg-white text-ink-2 hover:bg-page")}
          >
            {f.label}
          </button>
        );
      })}
      {active && (
        <button
          type="button"
          onClick={() => {
            setText("");
            start(() => router.replace(pathname, { scroll: false }));
          }}
          className="flex h-10 items-center gap-1 rounded-lg px-2 text-[13px] text-muted hover:text-ink"
        >
          <X className="h-4 w-4" /> Limpiar
        </button>
      )}
      {pending && <Loader2 className="mb-3 h-4 w-4 animate-spin text-muted" />}
    </div>
  );
}

export function Pagination({ page, pages, total }: { page: number; pages: number; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  if (pages <= 1) return <div className="px-4 py-3 text-[13px] text-muted">{total} resultado(s)</div>;
  const go = (p: number) => {
    const next = new URLSearchParams(sp.toString());
    next.set("pagina", String(p));
    router.push(`${pathname}?${next.toString()}`);
  };
  return (
    <div className="flex items-center justify-between px-4 py-3 text-[13px] text-ink-2">
      <span>
        {total} resultados · página {page} de {pages}
      </span>
      <div className="flex gap-2">
        <button disabled={page <= 1} onClick={() => go(page - 1)} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">
          Anterior
        </button>
        <button disabled={page >= pages} onClick={() => go(page + 1)} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">
          Siguiente
        </button>
      </div>
    </div>
  );
}
