"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Percent, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { bulkAdjustDraft, deleteDraftList, publishPriceList, saveDraftList } from "@/app/actions/config";
import { NumberInput } from "@/components/quote/number-input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { fmtMoney, fmtPct } from "@/lib/format";

export type EditorItem = { itemId: string; sap: string; name: string; family: string; pvs: number; previous: number | null };
export type EditorTier = { key: string; label: string; discountPct: number; previous: number | null };

export function PriceListEditor({
  id,
  name: initialName,
  notes: initialNotes,
  editable,
  items,
  tiers: initialTiers,
  compareName,
}: {
  id: string;
  name: string;
  notes: string;
  editable: boolean;
  items: EditorItem[];
  tiers: EditorTier[];
  compareName: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(initialName);
  const [notes, setNotes] = useState(initialNotes);
  const [prices, setPrices] = useState<Record<string, number>>(() => Object.fromEntries(items.map((i) => [i.itemId, i.pvs])));
  const [tiers, setTiers] = useState(initialTiers);
  const [query, setQuery] = useState("");
  const [onlyChanges, setOnlyChanges] = useState(false);
  const [bulk, setBulk] = useState<{ family: string; pct: number | null }>({ family: "", pct: null });
  const [confirm, setConfirm] = useState<null | "publish" | "delete">(null);

  const families = useMemo(() => [...new Set(items.map((i) => i.family))], [items]);
  const dirtyPrices = items.filter((i) => Math.abs((prices[i.itemId] ?? i.pvs) - i.pvs) > 1e-9);
  const dirtyTiers = tiers.filter((t, idx) => Math.abs(t.discountPct - initialTiers[idx].discountPct) > 1e-12);
  const dirty = dirtyPrices.length > 0 || dirtyTiers.length > 0 || name !== initialName || notes !== initialNotes;

  const rows = items.filter((i) => {
    const q = query.trim().toLowerCase();
    if (q && !`${i.sap} ${i.name}`.toLowerCase().includes(q)) return false;
    if (onlyChanges) {
      const v = prices[i.itemId] ?? i.pvs;
      return i.previous === null || Math.abs(v - i.previous) > 1e-6;
    }
    return true;
  });
  const changedVsCompare = items.filter((i) => i.previous !== null && Math.abs((prices[i.itemId] ?? i.pvs) - i.previous) > 1e-6).length;
  const newVsCompare = items.filter((i) => i.previous === null).length;

  const save = (after?: () => void) =>
    start(async () => {
      const res = await saveDraftList(id, {
        name,
        notes,
        tiers: tiers.map((t) => ({ key: t.key, discountPct: t.discountPct })),
        prices: dirtyPrices.map((i) => ({ itemId: i.itemId, pvs: prices[i.itemId] })),
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Borrador guardado");
      router.refresh();
      after?.();
    });

  return (
    <div className="space-y-5">
      {editable && (
        <div className="card flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[240px] flex-1">
            <label className="label" htmlFor="pl-name">Nombre de la lista</label>
            <input id="pl-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="min-w-[240px] flex-[2]">
            <label className="label" htmlFor="pl-notes">Notas internas</label>
            <input id="pl-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. Incremento de acero 3 % aprobado por gerencia" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={!dirty || pending} onClick={() => save()}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
            </Button>
            <Button disabled={pending} onClick={() => setConfirm("publish")}>
              <CheckCircle2 className="h-4 w-4" /> Publicar
            </Button>
            <Button variant="ghost" className="hover:text-bad" disabled={pending} onClick={() => setConfirm("delete")} aria-label="Eliminar borrador">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card p-4">
          <h2 className="mb-1 text-[15px] font-semibold">Categorías de cliente</h2>
          <p className="mb-3 text-[13px] text-muted">Descuento sobre el PVS. El precio de cada categoría es PVS × (1 − %), redondeado a centavos.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiers.map((t, idx) => (
              <div key={t.key}>
                <label className="label" htmlFor={`tier-${t.key}`}>{t.label}</label>
                {editable && t.key !== "PVS" ? (
                  <NumberInput
                    id={`tier-${t.key}`}
                    suffix="%"
                    digits={3}
                    value={t.discountPct * 100}
                    onValueChange={(n) => setTiers((list) => list.map((x, j) => (j === idx ? { ...x, discountPct: Math.max(0, Math.min(95, n ?? 0)) / 100 } : x)))}
                  />
                ) : (
                  <div className="input flex items-center justify-end bg-page tabular">{fmtPct(t.discountPct, 3)}</div>
                )}
                {t.previous !== null && Math.abs(t.previous - t.discountPct) > 1e-12 && <p className="mt-1 text-[12px] text-warn-ink">Antes {fmtPct(t.previous, 3)}</p>}
              </div>
            ))}
          </div>
        </section>
        {editable && (
          <section className="card p-4">
            <h2 className="mb-1 flex items-center gap-2 text-[15px] font-semibold">
              <Percent className="h-4 w-4 text-brand-600" /> Ajuste masivo
            </h2>
            <p className="mb-3 text-[13px] text-muted">Sube o baja todos los PVS de una familia (o de toda la lista) en un %.</p>
            <select className="input mb-2" value={bulk.family} onChange={(e) => setBulk((b) => ({ ...b, family: e.target.value }))} aria-label="Familia">
              <option value="">Toda la lista</option>
              {families.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <NumberInput suffix="%" digits={2} value={bulk.pct} onValueChange={(n) => setBulk((b) => ({ ...b, pct: n }))} placeholder="Ej. 3 o -2" aria-label="Porcentaje" />
              <Button
                variant="secondary"
                disabled={pending || !bulk.pct}
                onClick={() =>
                  start(async () => {
                    if (dirty) {
                      toast.error("Guarda los cambios antes de aplicar un ajuste masivo.");
                      return;
                    }
                    const res = await bulkAdjustDraft(id, bulk.family || null, (bulk.pct ?? 0) / 100);
                    if (!res.ok) return void toast.error(res.error);
                    toast.success(`Se ajustaron ${res.data.count} precios`);
                    setBulk({ family: bulk.family, pct: null });
                    router.refresh();
                  })
                }
              >
                Aplicar
              </Button>
            </div>
          </section>
        )}
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div>
            <h2 className="text-[15px] font-semibold">Productos y PVS</h2>
            {compareName && (
              <p className="text-[13px] text-muted">
                Comparado con <strong>{compareName}</strong>: {changedVsCompare} precio(s) cambiados, {newVsCompare} producto(s) nuevos.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
              <input className="input w-64 pl-9" placeholder="Buscar SAP o producto…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            {compareName && (
              <button
                onClick={() => setOnlyChanges((v) => !v)}
                aria-pressed={onlyChanges}
                className={cn("h-10 rounded-lg border px-3 text-[13px]", onlyChanges ? "border-warn bg-warn-bg text-warn-ink" : "border-line-strong text-ink-2 hover:bg-page")}
              >
                Solo cambios
              </button>
            )}
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <th className="th">SAP</th>
                <th className="th">Producto</th>
                {compareName && <th className="th text-right">PVS anterior</th>}
                <th className="th text-right">PVS</th>
                {compareName && <th className="th text-right">Cambio</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const v = prices[i.itemId] ?? i.pvs;
                const change = i.previous ? v / i.previous - 1 : null;
                const edited = Math.abs(v - i.pvs) > 1e-9;
                return (
                  <tr key={i.itemId} className={cn(edited && "bg-brand-50/50")}>
                    <td className="td w-[96px] text-[13px] text-muted tabular">{i.sap}</td>
                    <td className="td">
                      <div className="text-[14px]">{i.name}</div>
                      <div className="text-[12px] text-muted">{i.family}</div>
                    </td>
                    {compareName && <td className="td w-[120px] text-right text-[13px] text-ink-2 tabular">{i.previous === null ? "Nuevo" : fmtMoney(i.previous)}</td>}
                    <td className="td w-[150px] text-right">
                      {editable ? (
                        <NumberInput className="h-8 text-[13px]" prefix="$" digits={4} value={v} onValueChange={(n) => n !== null && n >= 0 && setPrices((p) => ({ ...p, [i.itemId]: n }))} aria-label={`PVS ${i.name}`} />
                      ) : (
                        <span className="tabular">{fmtMoney(v)}</span>
                      )}
                    </td>
                    {compareName && (
                      <td className={cn("td w-[96px] text-right text-[13px] tabular", change === null ? "text-muted" : change > 1e-6 ? "text-bad-ink" : change < -1e-6 ? "text-good-ink" : "text-muted")}>
                        {change === null ? "—" : Math.abs(change) < 1e-6 ? "=" : `${change > 0 ? "+" : "−"}${fmtPct(Math.abs(change), 1)}`}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog
        open={confirm === "publish"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`¿Publicar "${name}"?`}
        description="Desde este momento todas las cotizaciones nuevas usarán esta lista. Las cotizaciones ya creadas conservan sus precios."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
            <Button
              disabled={pending}
              onClick={() => {
                const doPublish = () =>
                  start(async () => {
                    const res = await publishPriceList(id);
                    if (!res.ok) return void toast.error(res.error);
                    toast.success("Lista publicada. Ya está disponible para todos los asesores.");
                    setConfirm(null);
                    router.push("/configuracion/precios");
                  });
                if (dirty) save(doPublish);
                else doPublish();
              }}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Publicar ahora
            </Button>
          </>
        }
      >
        <ul className="list-disc space-y-1 pl-5 text-[14px] text-ink-2">
          {compareName && <li>{changedVsCompare} precio(s) cambian respecto a {compareName}.</li>}
          {compareName && <li>{newVsCompare} producto(s) nuevos.</li>}
          {dirty && <li>Se guardarán primero los cambios pendientes.</li>}
          <li>La publicación queda registrada en la auditoría con tu usuario.</li>
        </ul>
      </Dialog>
      <Dialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="¿Eliminar este borrador?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteDraftList(id);
                  if (!res.ok) return void toast.error(res.error);
                  router.push("/configuracion/precios");
                })
              }
            >
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-ink-2">La lista vigente no se modifica.</p>
      </Dialog>
    </div>
  );
}
