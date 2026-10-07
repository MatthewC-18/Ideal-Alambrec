"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Info, Loader2, PackagePlus, Plus, Save, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { CustomerDTO } from "@/app/actions/customers";
import { saveQuoteAction } from "@/app/actions/quotes";
import { calculateQuote } from "@/lib/engine/engine";
import type { ExtraLineInput, PriceBook, RuleSetData, SegmentInput } from "@/lib/engine/types";
import type { ClientCatalog } from "@/lib/server/catalog-types";
import { excelRound } from "@/lib/engine/expr";
import { fmtMoney, fmtNumber, fmtPct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { CustomerPicker } from "./customer-picker";
import { NumberInput } from "./number-input";
import { ProductPicker } from "./product-picker";
import { SegmentCard, SystemTiles } from "./segment-card";

export type BuilderInitial = {
  customerId: string;
  ownerId: string;
  tierKey: string;
  projectSite: string;
  notes: string;
  validityDays: number;
  descLivianos: number;
  descPesados: number;
  globalDiscountPct: number;
  segments: SegmentInput[];
  extras: ExtraLineInput[];
};

export type BuilderProps = {
  mode: "new" | "edit";
  quoteId?: string;
  quoteNumber?: string;
  initial: BuilderInitial;
  catalog: ClientCatalog;
  rules: RuleSetData;
  customers: CustomerDTO[];
  advisors: { id: string; name: string }[] | null;
  limits: { maxLivianos: number; maxPesados: number; priceOverride: number; globalDiscount: number };
  ivaRate: number;
  usingSnapshot: boolean;
};

let uid = 0;
const newId = () => `x${Date.now().toString(36)}${(uid++).toString(36)}`;

function Section({ step, title, subtitle, children, action }: { step: number; title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-[13px] font-semibold text-white">{step}</span>
          <div>
            <h2 className="text-[16px] font-semibold">{title}</h2>
            {subtitle && <p className="text-[13px] text-ink-2">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function QuoteBuilder(props: BuilderProps) {
  const router = useRouter();
  const [customers, setCustomers] = useState(props.customers);
  const [state, setState] = useState<BuilderInitial>(props.initial);
  const [adding, setAdding] = useState(props.initial.segments.length === 0);
  const [picker, setPicker] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [saving, startSaving] = useTransition();
  const set = (patch: Partial<BuilderInitial>) => setState((s) => ({ ...s, ...patch }));

  const tier = props.catalog.tiers.find((t) => t.key === state.tierKey) ?? props.catalog.tiers[props.catalog.tiers.length - 1];
  const book: PriceBook = useMemo(
    () => ({
      tierPct: tier?.discountPct ?? 0,
      products: Object.fromEntries(props.catalog.products.map((p) => [p.sap, { name: p.name, pvs: p.pvs, weightKg: p.weightKg, family: p.family }])),
    }),
    [props.catalog, tier],
  );
  const result = useMemo(
    () =>
      calculateQuote(props.rules, book, {
        segments: state.segments,
        extras: state.extras,
        descLivianos: state.descLivianos,
        descPesados: state.descPesados,
        globalDiscountPct: state.globalDiscountPct,
        ivaRate: props.ivaRate,
      }),
    [props.rules, book, state, props.ivaRate],
  );

  const limitProblems = useMemo(() => {
    const out: string[] = [];
    for (const l of result.lines) {
      if (!l.priceOverride || !l.listPrice) continue;
      const d = 1 - l.unitPrice / l.listPrice;
      if (d > props.limits.priceOverride + 1e-6) out.push(`${l.description}: ${fmtPct(d)} bajo lista (tu límite es ${fmtPct(props.limits.priceOverride)}).`);
    }
    if (state.globalDiscountPct > props.limits.globalDiscount + 1e-9) out.push(`Descuento adicional máximo para tu rol: ${fmtPct(props.limits.globalDiscount)}.`);
    if (state.descLivianos > props.limits.maxLivianos + 1e-9) out.push(`Descuento de livianos máximo: ${fmtPct(props.limits.maxLivianos)}.`);
    if (state.descPesados > props.limits.maxPesados + 1e-9) out.push(`Descuento de pesados máximo: ${fmtPct(props.limits.maxPesados)}.`);
    return out;
  }, [result, state, props.limits]);

  const errors = result.messages.filter((m) => m.level === "error");
  const generalMessages = result.messages.filter((m) => m.segmentIndex === null);
  const usesLivianos = result.lines.some((l) => l.pricing === "livianos");
  const usesPesados = result.lines.some((l) => l.pricing === "pesados");
  const canSave = !!state.customerId && result.ok && limitProblems.length === 0;
  const overridesCount = result.lines.filter((l) => l.priceOverride || l.qtyOverride).length;

  const addSegment = (systemKey: string) => {
    const sys = props.rules.systems.find((s) => s.key === systemKey)!;
    const defaultHeight = sys.heights.find((h) => Math.abs(h.value - 2.08) < 0.001)?.value ?? sys.heights[0].value;
    set({ segments: [...state.segments, { systemKey, length: 50, height: defaultHeight, placa: false, puas: false, incl: 0, overrides: {} }] });
    setAdding(false);
  };
  const updateSegment = (i: number, seg: SegmentInput) => set({ segments: state.segments.map((s, j) => (j === i ? seg : s)) });
  const updateExtra = (id: string, patch: Partial<ExtraLineInput>) => set({ extras: state.extras.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const save = () => {
    setProblems([]);
    startSaving(async () => {
      const res = await saveQuoteAction({
        id: props.quoteId,
        customerId: state.customerId,
        ownerId: props.advisors ? state.ownerId : undefined,
        tierKey: state.tierKey,
        projectSite: state.projectSite,
        notes: state.notes,
        validityDays: state.validityDays,
        descLivianos: state.descLivianos,
        descPesados: state.descPesados,
        globalDiscountPct: state.globalDiscountPct,
        segments: state.segments.map((s) => ({ ...s, label: s.label?.trim() || undefined })),
        extras: state.extras,
      });
      if (!res.ok) {
        setProblems(res.problems ?? [res.error]);
        toast.error(res.error);
        return;
      }
      toast.success(props.mode === "new" ? `Cotización ${res.data.number} creada` : `Cotización ${res.data.number} actualizada`);
      router.push(`/cotizaciones/${res.data.id}`);
      router.refresh();
    });
  };

  const selectedCustomer = customers.find((c) => c.id === state.customerId);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        {props.usingSnapshot && (
          <div className="flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-[13px] text-brand-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Estás editando con la lista de precios y reglas con las que se creó esta cotización ({props.catalog.priceListName}). Para usar los precios vigentes, duplica la cotización.
          </div>
        )}

        <Section step={1} title="Cliente y proyecto" subtitle="Busca un cliente existente o créalo en el momento.">
          <CustomerPicker
            customers={customers}
            value={state.customerId}
            tiers={props.catalog.tiers}
            onCustomerSaved={(c) => setCustomers((list) => [c, ...list.filter((x) => x.id !== c.id)])}
            onChange={(c) => set(c ? { customerId: c.id, tierKey: props.catalog.tiers.some((t) => t.key === c.tierKey) ? c.tierKey : state.tierKey } : { customerId: "" })}
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label" htmlFor="tier">Categoría de precio</label>
              <select id="tier" className="input" value={state.tierKey} onChange={(e) => set({ tierKey: e.target.value })}>
                {props.catalog.tiers.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label} {t.discountPct > 0 ? `· −${fmtPct(t.discountPct, 2)}` : "· precio sugerido"}
                  </option>
                ))}
              </select>
              {selectedCustomer && selectedCustomer.tierKey !== state.tierKey && (
                <p className="mt-1 text-[12px] text-warn-ink">El cliente está registrado como {selectedCustomer.tierKey}.</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="site">Sitio de obra</label>
              <input id="site" className="input" value={state.projectSite} onChange={(e) => set({ projectSite: e.target.value })} placeholder="Ej. Sangolquí, lote 14" />
            </div>
            {props.advisors && (
              <div>
                <label className="label" htmlFor="owner">Asesor responsable</label>
                <select id="owner" className="input" value={state.ownerId} onChange={(e) => set({ ownerId: e.target.value })}>
                  {props.advisors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </Section>

        <Section
          step={2}
          title="Cerramientos"
          subtitle="Puedes cotizar varios tramos y sistemas en una sola cotización."
          action={
            state.segments.length > 0 && !adding ? (
              <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" /> Agregar cerramiento
              </Button>
            ) : null
          }
        >
          {adding && (
            <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[13px] font-medium text-ink-2">Elige el sistema CercasPro</p>
                {state.segments.length > 0 && (
                  <button className="text-[13px] text-muted hover:text-ink" onClick={() => setAdding(false)}>
                    Cancelar
                  </button>
                )}
              </div>
              <SystemTiles systems={props.rules.systems} onSelect={addSegment} />
            </div>
          )}
          {state.segments.length === 0 && !adding && <p className="text-[13px] text-muted">Sin cerramientos.</p>}
        </Section>

        {state.segments.map((seg, i) => (
          <SegmentCard
            key={i}
            index={i}
            segment={seg}
            systems={props.rules.systems}
            result={result.segments.find((s) => s.index === i)}
            lines={result.lines.filter((l) => l.segmentIndex === i)}
            messages={result.messages.filter((m) => m.segmentIndex === i)}
            priceLimit={props.limits.priceOverride}
            editable
            onChange={(s) => updateSegment(i, s)}
            onRemove={() => set({ segments: state.segments.filter((_, j) => j !== i) })}
            onDuplicate={() => set({ segments: [...state.segments.slice(0, i + 1), { ...seg, label: undefined }, ...state.segments.slice(i + 1)] })}
          />
        ))}

        <Section
          step={3}
          title="Puertas, portones y otros"
          subtitle="Agrega productos del catálogo o ítems libres como transporte o instalación."
          action={
            <Button variant="secondary" size="sm" onClick={() => setPicker(true)}>
              <PackagePlus className="h-4 w-4" /> Agregar productos
            </Button>
          }
        >
          {state.extras.length === 0 ? (
            <p className="text-[13px] text-muted">No hay productos adicionales.</p>
          ) : (
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[600px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="th">Código</th>
                    <th className="th">Descripción</th>
                    <th className="th text-right">Cant.</th>
                    <th className="th text-right">P. unit.</th>
                    <th className="th text-right">Total</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody>
                  {state.extras.map((ex) => {
                    const line = result.lines.find((l) => l.key === `x:${ex.id}`);
                    const disc = line?.listPrice ? 1 - line.unitPrice / line.listPrice : 0;
                    const over = !!line?.priceOverride && disc > props.limits.priceOverride + 1e-6;
                    return (
                      <tr key={ex.id} className={cn(line?.priceOverride && "bg-warn-bg/40")}>
                        <td className="td w-[88px] text-[12px] text-muted tabular">{ex.sap ?? "Libre"}</td>
                        <td className="td min-w-[200px] text-[13.5px]">
                          {ex.sap ? (
                            line?.description ?? ex.sap
                          ) : (
                            <input className="input h-8 text-[13px]" value={ex.description ?? ""} onChange={(e) => updateExtra(ex.id, { description: e.target.value })} aria-label="Descripción del ítem libre" />
                          )}
                          {line?.priceOverride && line.listPrice !== null && (
                            <div className={cn("text-[11.5px]", over ? "font-medium text-bad-ink" : "text-warn-ink")}>
                              Lista: {fmtMoney(line.listPrice)} {over && `· supera tu límite de ${fmtPct(props.limits.priceOverride)}`}
                            </div>
                          )}
                        </td>
                        <td className="td w-[96px]">
                          <NumberInput className="h-8 text-[13px]" value={ex.qty} digits={3} onValueChange={(n) => n !== null && n > 0 && updateExtra(ex.id, { qty: n })} aria-label="Cantidad" />
                        </td>
                        <td className="td w-[118px]">
                          <NumberInput
                            className={cn("h-8 text-[13px]", over && "border-bad ring-2 ring-bad-bg")}
                            prefix="$"
                            fixed
                            value={line?.unitPrice ?? ex.unitPrice ?? 0}
                            onValueChange={(n) => n !== null && n >= 0 && updateExtra(ex.id, { unitPrice: ex.sap && line?.listPrice === n ? undefined : n })}
                            aria-label="Precio unitario"
                          />
                        </td>
                        <td className="td w-[112px] text-right font-medium tabular">{fmtMoney(line?.total ?? 0)}</td>
                        <td className="td w-[40px] px-1">
                          <button onClick={() => set({ extras: state.extras.filter((e) => e.id !== ex.id) })} className="rounded p-1 text-muted hover:text-bad" aria-label="Quitar">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section step={4} title="Condiciones" subtitle="Descuentos permitidos según tu rol, validez y observaciones para el cliente.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label" htmlFor="gd">Descuento adicional</label>
              <NumberInput id="gd" suffix="%" digits={2} value={excelRound(state.globalDiscountPct * 100, 4)} onValueChange={(n) => set({ globalDiscountPct: Math.max(0, (n ?? 0) / 100) })} />
              <p className="mt-1 text-[12px] text-muted">Máximo {fmtPct(props.limits.globalDiscount)} para tu rol.</p>
            </div>
            <div>
              <label className="label" htmlFor="validity">Validez de la oferta</label>
              <NumberInput id="validity" suffix="días" digits={0} value={state.validityDays} onValueChange={(n) => set({ validityDays: Math.max(1, Math.round(n ?? 15)) })} />
            </div>
            {(usesLivianos || state.descLivianos > 0) && (
              <div>
                <label className="label" htmlFor="dl">Descuento livianos (alambre)</label>
                <NumberInput id="dl" suffix="%" digits={2} value={excelRound(state.descLivianos * 100, 4)} onValueChange={(n) => set({ descLivianos: Math.max(0, (n ?? 0) / 100) })} />
                <p className="mt-1 text-[12px] text-muted">De 0 a {fmtPct(props.limits.maxLivianos)}.</p>
              </div>
            )}
            {(usesPesados || state.descPesados > 0) && (
              <div>
                <label className="label" htmlFor="dp">Descuento pesados</label>
                <NumberInput id="dp" suffix="%" digits={2} value={excelRound(state.descPesados * 100, 4)} onValueChange={(n) => set({ descPesados: Math.max(0, (n ?? 0) / 100) })} />
                <p className="mt-1 text-[12px] text-muted">De 0 a {fmtPct(props.limits.maxPesados)}.</p>
              </div>
            )}
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="label" htmlFor="notes">Observaciones (aparecen en el PDF)</label>
              <textarea id="notes" rows={3} className="input" value={state.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Ej. Precios no incluyen instalación. Entrega en obra en 5 días laborables." />
            </div>
          </div>
        </Section>
      </div>

      <aside className="xl:sticky xl:top-6">
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-navy to-brand-600 px-5 py-4 text-white">
            <div className="text-[12px] font-medium text-white/75">{props.mode === "edit" ? `Editando ${props.quoteNumber}` : "Nueva cotización"} · {tier?.label}</div>
            <div className="mt-1 text-[34px] leading-tight font-semibold">{fmtMoney(result.total)}</div>
            <div className="text-[12px] text-white/75">Total con IVA</div>
          </div>
          <dl className="space-y-2 px-5 py-4 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-ink-2">Subtotal</dt>
              <dd className="tabular">{fmtMoney(result.subtotal)}</dd>
            </div>
            {result.discountTotal > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-2">Descuento ({fmtPct(state.globalDiscountPct)})</dt>
                <dd className="tabular">−{fmtMoney(result.discountTotal)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-2">IVA {fmtPct(props.ivaRate, 0)}</dt>
              <dd className="tabular">{fmtMoney(result.iva)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-[13px] text-muted">
              <dt>Peso aproximado</dt>
              <dd className="tabular">{fmtNumber(result.weightKg, 1)} kg</dd>
            </div>
            <div className="flex justify-between text-[13px] text-muted">
              <dt>Líneas</dt>
              <dd className="tabular">
                {result.lines.length}
                {overridesCount > 0 && ` · ${overridesCount} ajustada(s)`}
              </dd>
            </div>
          </dl>

          {(errors.length > 0 || limitProblems.length > 0 || problems.length > 0 || !state.customerId || generalMessages.length > 0) && (
            <ul className="space-y-1.5 px-5 pb-3 text-[12.5px]">
              {!state.customerId && (
                <li className="flex gap-2 text-warn-ink">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Selecciona un cliente.
                </li>
              )}
              {[...new Set([...errors.map((e) => e.message), ...limitProblems, ...problems])].map((p) => (
                <li key={p} className="flex gap-2 text-bad-ink">
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {p}
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-line p-4">
            <Button size="lg" className="w-full" disabled={!canSave || saving} onClick={save}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {props.mode === "new" ? "Guardar cotización" : "Guardar cambios"}
            </Button>
            <p className="mt-2 text-center text-[12px] text-muted">Después podrás descargar el PDF o enviarlo por correo.</p>
          </div>
        </div>
        <p className="mt-3 px-1 text-[12px] text-muted">
          {props.catalog.priceListName} · cálculo validado contra el cotizador Excel; reglas editables en Configuración.
        </p>
      </aside>

      <div className="no-print fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-white/95 px-4 py-3 shadow-[0_-6px_20px_-12px_rgb(15_27_45/0.35)] backdrop-blur xl:hidden">
        <div className="min-w-0">
          <div className="text-[11.5px] text-muted">Total con IVA · {tier?.label}</div>
          <div className="text-[19px] leading-tight font-semibold tabular">{fmtMoney(result.total)}</div>
        </div>
        <Button disabled={!canSave || saving} onClick={save}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
        </Button>
      </div>
      <div className="h-16 xl:hidden" aria-hidden />

      {picker && (
        <ProductPicker
          open
          onOpenChange={setPicker}
          catalog={props.catalog}
          priceOf={(pvs) => excelRound(pvs * (1 - (tier?.discountPct ?? 0)), 2)}
          onAdd={(sap, qty) => {
            const existing = state.extras.find((e) => e.sap === sap);
            if (existing) updateExtra(existing.id, { qty: existing.qty + qty });
            else set({ extras: [...state.extras, { id: newId(), sap, qty }] });
            toast.success("Producto agregado");
          }}
          onAddFree={(description, qty, unitPrice) => {
            set({ extras: [...state.extras, { id: newId(), description, qty, unitPrice }] });
            toast.success("Ítem agregado");
          }}
        />
      )}
    </div>
  );
}

