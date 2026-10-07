"use client";

import { useMemo, useRef, useState } from "react";
import { Building2, Pencil, Plus, Search, UserRound } from "lucide-react";
import type { CustomerDTO } from "@/app/actions/customers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomerDialog } from "./customer-form";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function CustomerPicker({
  customers,
  value,
  onChange,
  tiers,
  onCustomerSaved,
}: {
  customers: CustomerDTO[];
  value: string;
  onChange: (c: CustomerDTO | null) => void;
  tiers: { key: string; label: string }[];
  onCustomerSaved: (c: CustomerDTO) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [dialog, setDialog] = useState<null | "new" | "edit">(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = customers.find((c) => c.id === value);

  const results = useMemo(() => {
    const q = norm(query.trim());
    const list = q ? customers.filter((c) => norm(`${c.company ?? ""} ${c.name} ${c.city ?? ""} ${c.taxId ?? ""}`).includes(q)) : customers;
    return list.slice(0, 8);
  }, [customers, query]);

  const choose = (c: CustomerDTO) => {
    onChange(c);
    setQuery("");
    setOpen(false);
  };

  return (
    <div>
      {selected ? (
        <div className="flex flex-col gap-3 rounded-xl border border-brand-100 bg-brand-50/50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 ring-1 ring-brand-100">
              {selected.company ? <Building2 className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium">{selected.company || selected.name}</div>
              <div className="truncate text-[13px] text-ink-2">
                {[selected.company ? selected.name : null, selected.city, selected.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}
              </div>
            </div>
            <Badge tone="brand" className="hidden sm:inline-flex">{selected.tierKey}</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDialog("edit")}>
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Button>
            <Button variant="outline" size="sm" onClick={() => { onChange(null); setTimeout(() => inputRef.current?.focus(), 0); }}>
              Cambiar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              ref={inputRef}
              className="input pl-9"
              placeholder="Buscar cliente por empresa, contacto, ciudad o RUC…"
              value={query}
              role="combobox"
              aria-expanded={open}
              aria-controls="customer-results"
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
                setOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                if (e.key === "Enter" && results[active]) { e.preventDefault(); choose(results[active]); }
              }}
            />
            {open && (
              <ul id="customer-results" role="listbox" className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-line bg-white p-1 shadow-[var(--shadow-pop)]">
                {results.length === 0 && <li className="px-3 py-3 text-[13px] text-muted">Sin resultados. Crea el cliente con el botón “Nuevo cliente”.</li>}
                {results.map((c, i) => (
                  <li
                    key={c.id}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => { e.preventDefault(); choose(c); }}
                    onMouseEnter={() => setActive(i)}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 ${i === active ? "bg-brand-50" : ""}`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-medium">{c.company || c.name}</div>
                      <div className="truncate text-[12px] text-muted">{[c.company ? c.name : null, c.city].filter(Boolean).join(" · ")}</div>
                    </div>
                    <Badge>{c.tierKey}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button variant="secondary" onClick={() => setDialog("new")}>
            <Plus className="h-4 w-4" /> Nuevo cliente
          </Button>
        </div>
      )}
      {dialog && (
        <CustomerDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          tiers={tiers}
          initial={dialog === "edit" ? selected : { name: query }}
          onSaved={(c) => {
            onCustomerSaved(c);
            onChange(c);
          }}
        />
      )}
    </div>
  );
}
