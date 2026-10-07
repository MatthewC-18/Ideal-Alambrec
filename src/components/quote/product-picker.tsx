"use client";

import { useMemo, useState } from "react";
import { PackagePlus, Plus, Search } from "lucide-react";
import type { ClientCatalog } from "@/lib/server/catalog-types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import { NumberInput } from "./number-input";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const prettyFamily = (f: string) => f.replace(/^CERCAS PRO /i, "CercasPro ").replace(/\s+-\s+/g, " · ").toLowerCase().replace(/(^|\s|·\s)\S/g, (m) => m.toUpperCase()).replace("Cercaspro", "CercasPro");

export function ProductPicker({
  open,
  onOpenChange,
  catalog,
  priceOf,
  onAdd,
  onAddFree,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  catalog: ClientCatalog;
  priceOf: (pvs: number) => number;
  onAdd: (sap: string, qty: number) => void;
  onAddFree: (description: string, qty: number, unitPrice: number) => void;
}) {
  const [tab, setTab] = useState<"catalogo" | "libre">("catalogo");
  const [query, setQuery] = useState("");
  const families = useMemo(() => [...new Set(catalog.products.map((p) => p.family))], [catalog]);
  const defaultFamily = families.find((f) => /PUERTAS|PORTONES/i.test(f)) ?? "todas";
  const [family, setFamily] = useState<string>(defaultFamily);
  const [free, setFree] = useState({ description: "", qty: 1 as number | null, price: null as number | null });

  const list = useMemo(() => {
    const q = norm(query.trim());
    return catalog.products.filter((p) => (family === "todas" || p.family === family) && (!q || norm(`${p.sap} ${p.name}`).includes(q)));
  }, [catalog, family, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Agregar productos" description="Puertas, portones, cerraduras, accesorios o cualquier ítem del catálogo vigente." wide>
      <div className="mb-4 inline-flex rounded-lg bg-page p-1 text-[13px]">
        {(["catalogo", "libre"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("rounded-md px-3 py-1.5 font-medium", tab === t ? "bg-white shadow-sm" : "text-ink-2")}>
            {t === "catalogo" ? "Del catálogo" : "Ítem libre (servicio, transporte…)"}
          </button>
        ))}
      </div>

      {tab === "catalogo" ? (
        <>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="input pl-9" placeholder="Buscar por código SAP o nombre…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {["todas", ...families].map((f) => (
              <button
                key={f}
                onClick={() => setFamily(f)}
                className={cn("rounded-full border px-2.5 py-1 text-[12px]", family === f ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-ink-2 hover:bg-page")}
              >
                {f === "todas" ? "Todas" : prettyFamily(f)}
              </button>
            ))}
          </div>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {list.length === 0 && <li className="p-4 text-[13px] text-muted">No hay productos que coincidan.</li>}
            {list.map((p) => (
              <li key={p.sap} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-[14px]">{p.name}</div>
                  <div className="text-[12px] text-muted">
                    SAP {p.sap} · {p.weightKg} kg
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="tabular text-[14px] font-medium">{fmtMoney(priceOf(p.pvs))}</span>
                  <Button size="sm" variant="secondary" onClick={() => onAdd(p.sap, 1)} aria-label={`Agregar ${p.name}`}>
                    <Plus className="h-3.5 w-3.5" /> Agregar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <form
          className="grid gap-4 sm:grid-cols-[1fr_120px_160px]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!free.description.trim() || !free.qty || free.price === null) return;
            onAddFree(free.description.trim(), free.qty, free.price);
            setFree({ description: "", qty: 1, price: null });
          }}
        >
          <div>
            <label className="label" htmlFor="free-desc">Descripción</label>
            <input id="free-desc" className="input" value={free.description} onChange={(e) => setFree((f) => ({ ...f, description: e.target.value }))} placeholder="Ej. Transporte a obra en Cumbayá" />
          </div>
          <div>
            <label className="label" htmlFor="free-qty">Cantidad</label>
            <NumberInput id="free-qty" value={free.qty} onValueChange={(n) => setFree((f) => ({ ...f, qty: n }))} />
          </div>
          <div>
            <label className="label" htmlFor="free-price">Precio unitario</label>
            <NumberInput id="free-price" prefix="$" value={free.price} onValueChange={(n) => setFree((f) => ({ ...f, price: n }))} />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={!free.description.trim() || !free.qty || free.price === null}>
              <PackagePlus className="h-4 w-4" /> Agregar ítem
            </Button>
            <p className="mt-2 text-[12px] text-muted">Los ítems libres no salen de la lista de precios: quedan marcados en la cotización y en la auditoría.</p>
          </div>
        </form>
      )}
    </Dialog>
  );
}
