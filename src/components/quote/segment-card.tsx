"use client";

import Image from "next/image";
import { useState } from "react";
import { AlertTriangle, ChevronDown, Copy, Calculator, RotateCcw, Trash2, XCircle } from "lucide-react";
import type { CalcLine, CalcMessage, SegmentInput, SegmentResult, SystemRule } from "@/lib/engine/types";
import { overrideKey } from "@/lib/engine/engine";
import { fmtMoney, fmtNumber, fmtPct, fmtQty } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { FenceIcon } from "./fence-icons";
import { NumberInput } from "./number-input";

export function SystemTiles({ systems, value, onSelect }: { systems: SystemRule[]; value?: string; onSelect: (key: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {systems.filter((s) => s.active).map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onSelect(s.key)}
          aria-pressed={value === s.key}
          className={cn(
            "group flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition",
            value === s.key ? "border-brand-500 bg-brand-50 ring-3 ring-brand-100" : "border-line bg-white hover:border-brand-300 hover:bg-brand-50/40",
          )}
        >
          <FenceIcon system={s.key} className={cn("h-10", value === s.key ? "text-brand-600" : "text-steel group-hover:text-brand-500")} />
          <div>
            <div className="text-[14px] leading-tight font-semibold">{s.name.replace("CercasPro ", "")}</div>
            <div className="mt-0.5 text-[12px] text-muted">
              {s.heights.length === 1 ? s.heights[0].label : `${s.heights[0].label} a ${s.heights[s.heights.length - 1].label.split(" ")[0]} m`} · {s.finish}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function OptionCard({ active, onClick, img, title, hint }: { active: boolean; onClick: () => void; img: string; title: string; hint: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("flex items-center gap-3 rounded-xl border p-2 pr-3 text-left transition", active ? "border-brand-500 bg-brand-50 ring-3 ring-brand-100" : "border-line bg-white hover:border-brand-300")}
    >
      <Image src={img} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
      <div>
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="text-[12px] leading-snug text-muted">{hint}</div>
      </div>
    </button>
  );
}

function LineRow({
  line,
  priceLimit,
  editable,
  onEdit,
  onReset,
}: {
  line: CalcLine;
  priceLimit: number;
  editable: boolean;
  onEdit: (patch: { qty?: number; unitPrice?: number }) => void;
  onReset: () => void;
}) {
  const disc = line.listPrice && line.listPrice > 0 ? 1 - line.unitPrice / line.listPrice : 0;
  const overLimit = line.priceOverride && disc > priceLimit + 1e-6;
  const changed = line.priceOverride || line.qtyOverride;
  return (
    <tr className={cn(changed && "bg-warn-bg/40")}>
      <td className="td w-[88px] text-[12px] text-muted tabular">{line.sap}</td>
      <td className="td min-w-[220px]">
        <div className="text-[13.5px]">{line.description}</div>
        {line.qtyOverride && <div className="text-[11.5px] text-warn-ink">Calculado: {fmtQty(line.calcQty)}</div>}
        {line.priceOverride && line.listPrice !== null && (
          <div className={cn("text-[11.5px]", overLimit ? "font-medium text-bad-ink" : "text-warn-ink")}>
            Lista: {fmtMoney(line.listPrice)} ({disc >= 0 ? "−" : "+"}
            {fmtPct(Math.abs(disc))}){overLimit && ` · supera tu límite de ${fmtPct(priceLimit)}`}
          </div>
        )}
      </td>
      <td className="td w-[96px]">
        {editable ? (
          <NumberInput aria-label={`Cantidad ${line.description}`} className="h-8 text-[13px]" value={line.qty} digits={3} onValueChange={(n) => n !== null && n >= 0 && onEdit({ qty: n })} />
        ) : (
          <div className="text-right tabular">{fmtQty(line.qty)}</div>
        )}
      </td>
      <td className="td w-[118px]">
        {editable ? (
          <NumberInput
            aria-label={`Precio unitario ${line.description}`}
            className={cn("h-8 text-[13px]", overLimit && "border-bad ring-2 ring-bad-bg")}
            prefix="$"
            fixed
            value={line.unitPrice}
            onValueChange={(n) => n !== null && n >= 0 && onEdit({ unitPrice: n })}
          />
        ) : (
          <div className="text-right tabular">{fmtMoney(line.unitPrice)}</div>
        )}
      </td>
      <td className="td w-[112px] text-right font-medium tabular">{fmtMoney(line.total)}</td>
      <td className="td w-[40px] px-1">
        {editable && changed && (
          <button onClick={onReset} className="rounded p-1 text-muted hover:bg-white hover:text-ink" title="Volver al valor calculado" aria-label="Restablecer">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}

export function SegmentCard({
  index,
  segment,
  systems,
  result,
  lines,
  messages,
  priceLimit,
  editable,
  onChange,
  onRemove,
  onDuplicate,
}: {
  index: number;
  segment: SegmentInput;
  systems: SystemRule[];
  result?: SegmentResult;
  lines: CalcLine[];
  messages: CalcMessage[];
  priceLimit: number;
  editable: boolean;
  onChange: (s: SegmentInput) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const system = systems.find((s) => s.key === segment.systemKey);
  const [showCalc, setShowCalc] = useState(false);
  const [changingSystem, setChangingSystem] = useState(false);
  if (!system) return null;
  const set = (patch: Partial<SegmentInput>) => onChange({ ...segment, ...patch });

  const switchSystem = (key: string) => {
    const sys = systems.find((s) => s.key === key)!;
    const height = sys.heights.find((h) => Math.abs(h.value - segment.height) < 0.001)?.value ?? sys.heights[Math.min(1, sys.heights.length - 1)].value;
    onChange({ ...segment, systemKey: key, height, placa: sys.options.placa && segment.placa, puas: sys.options.puas && segment.puas, incl: sys.options.inclinacion ? segment.incl : 0, overrides: {} });
    setChangingSystem(false);
  };
  const edit = (line: CalcLine, patch: { qty?: number; unitPrice?: number }) => {
    const key = overrideKey(line.section, line.sap!);
    const cur = { ...(segment.overrides?.[key] ?? {}), ...patch };
    if (cur.qty !== undefined && cur.qty === line.calcQty) delete cur.qty;
    if (cur.unitPrice !== undefined && cur.unitPrice === line.listPrice) delete cur.unitPrice;
    const overrides = { ...(segment.overrides ?? {}) };
    if (Object.keys(cur).length) overrides[key] = cur;
    else delete overrides[key];
    set({ overrides });
  };
  const reset = (line: CalcLine) => {
    const overrides = { ...(segment.overrides ?? {}) };
    delete overrides[overrideKey(line.section, line.sap!)];
    set({ overrides });
  };
  const main = lines.filter((l) => l.section === "principal");
  const extra = lines.filter((l) => l.section === "adicionales");
  const nOverrides = Object.keys(segment.overrides ?? {}).length;

  return (
    <section className="card overflow-hidden" aria-label={`Cerramiento ${index + 1}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-gradient-to-r from-brand-50/70 to-white px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <FenceIcon system={system.key} className="h-9 text-brand-600" />
          <div>
            <div className="text-[12px] font-medium text-muted">Cerramiento {index + 1}</div>
            <div className="text-[16px] font-semibold">{system.name}</div>
          </div>
        </div>
        {editable && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setChangingSystem((v) => !v)}>
              Cambiar sistema
            </Button>
            <Button variant="ghost" size="icon" onClick={onDuplicate} title="Duplicar cerramiento" aria-label="Duplicar cerramiento">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onRemove} title="Quitar cerramiento" aria-label="Quitar cerramiento" className="hover:text-bad">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        {changingSystem && <SystemTiles systems={systems} value={system.key} onSelect={switchSystem} />}

        <div className="grid gap-4 md:grid-cols-[180px_1fr]">
          <div>
            <label className="label" htmlFor={`len-${index}`}>Longitud total</label>
            <NumberInput id={`len-${index}`} value={segment.length} digits={2} suffix="m" className="h-12 text-[18px] font-semibold" disabled={!editable} onValueChange={(n) => set({ length: n ?? 0 })} />
          </div>
          <div>
            <span className="label">Altura</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Altura">
              {system.heights.map((h) => (
                <button
                  key={h.value}
                  type="button"
                  role="radio"
                  aria-checked={Math.abs(h.value - segment.height) < 0.001}
                  disabled={!editable}
                  onClick={() => set({ height: h.value, overrides: {} })}
                  className={cn(
                    "h-12 rounded-xl border px-4 text-[14px] font-medium transition",
                    Math.abs(h.value - segment.height) < 0.001 ? "border-brand-500 bg-brand-600 text-white" : "border-line-strong bg-white hover:border-brand-300",
                  )}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {(system.options.placa || system.options.puas || system.options.inclinacion) && (
          <div className="grid gap-4 lg:grid-cols-3">
            {system.options.placa && (
              <div>
                <span className="label">Tipo de poste</span>
                <div className="grid gap-2">
                  <OptionCard active={!segment.placa} onClick={() => editable && set({ placa: false })} img="/img/opt-plinto.webp" title="Con plinto" hint="Empotrado en hormigón" />
                  <OptionCard active={segment.placa} onClick={() => editable && set({ placa: true })} img="/img/opt-placa.webp" title="Con placa" hint="Anclado con 4 pernos a losa" />
                </div>
              </div>
            )}
            {system.options.puas && (
              <div>
                <span className="label">Seguridad superior</span>
                <div className="grid gap-2">
                  <OptionCard active={!segment.puas} onClick={() => editable && set({ puas: false })} img="/img/opt-plano.webp" title="Sin púas" hint="Solo panel" />
                  <OptionCard active={segment.puas} onClick={() => editable && set({ puas: true })} img="/img/opt-puas.webp" title="Con púas" hint="Brazos + 3 hileras de alambre" />
                </div>
              </div>
            )}
            {system.options.inclinacion && (
              <div>
                <span className="label">Terreno</span>
                <div className="grid gap-2">
                  <OptionCard active={segment.incl === 0} onClick={() => editable && set({ incl: 0 })} img="/img/terreno-plano.webp" title="Plano" hint="Sin escalonamiento" />
                  <OptionCard active={segment.incl > 0} onClick={() => editable && segment.incl === 0 && set({ incl: 0.05 })} img="/img/terreno-escalonado.webp" title="Escalonado" hint="Agrega postes por cada escalón" />
                </div>
                {segment.incl > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[13px] text-ink-2">Inclinación</span>
                    <div className="w-24">
                      <NumberInput value={segment.incl * 100} digits={1} suffix="%" className="h-8" disabled={!editable} onValueChange={(n) => set({ incl: Math.max(0, Math.min(100, n ?? 0)) / 100 })} />
                    </div>
                    {[5, 10, 15].map((p) => (
                      <button key={p} type="button" onClick={() => editable && set({ incl: p / 100 })} className="rounded-full border border-line px-2 py-0.5 text-[12px] hover:bg-page">
                        {p} %
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="label" htmlFor={`label-${index}`}>Nombre del tramo en el PDF (opcional)</label>
          <input id={`label-${index}`} className="input" disabled={!editable} placeholder={result?.title} value={segment.label ?? ""} onChange={(e) => set({ label: e.target.value })} />
        </div>

        {messages.length > 0 && (
          <ul className="space-y-1.5">
            {messages.map((m, i) => (
              <li key={i} className={cn("flex items-start gap-2 rounded-lg px-3 py-2 text-[13px]", m.level === "error" ? "bg-bad-bg text-bad-ink" : "bg-warn-bg text-warn-ink")}>
                {m.level === "error" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                {m.message}
              </li>
            ))}
          </ul>
        )}

        {lines.length > 0 && (
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[14px] font-semibold">Materiales calculados</h3>
              <div className="flex items-center gap-2 text-[12px] text-muted">
                {nOverrides > 0 && <span className="rounded-full bg-warn-bg px-2 py-0.5 text-warn-ink">{nOverrides} ajuste(s) manual(es)</span>}
                {editable && <span className="hidden sm:inline">Puedes ajustar cantidades y precios; queda registrado.</span>}
              </div>
            </div>
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[640px] border-separate border-spacing-0">
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
                  {main.map((l) => (
                    <LineRow key={l.key} line={l} priceLimit={priceLimit} editable={editable} onEdit={(p) => edit(l, p)} onReset={() => reset(l)} />
                  ))}
                  {extra.length > 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 pt-3 pb-1 text-[11.5px] font-semibold tracking-wide text-muted uppercase">Materiales adicionales</td>
                    </tr>
                  )}
                  {extra.map((l) => (
                    <LineRow key={l.key} line={l} priceLimit={priceLimit} editable={editable} onEdit={(p) => edit(l, p)} onReset={() => reset(l)} />
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="px-3 pt-3 text-right text-[13px] text-ink-2">Subtotal del cerramiento</td>
                    <td className="px-3 pt-3 text-right text-[15px] font-semibold tabular">{fmtMoney(result?.subtotal ?? 0)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {result && result.variables.length > 0 && (
          <div className="rounded-xl border border-line">
            <button type="button" onClick={() => setShowCalc((v) => !v)} className="flex w-full items-center justify-between px-3 py-2.5 text-[13px] font-medium text-ink-2" aria-expanded={showCalc}>
              <span className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-brand-600" /> ¿Cómo se calculó?
              </span>
              <ChevronDown className={cn("h-4 w-4 transition", showCalc && "rotate-180")} />
            </button>
            {showCalc && (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-line px-3 py-3 text-[13px] sm:grid-cols-3">
                {result.variables.map((v) => (
                  <div key={v.name} className="flex justify-between gap-2">
                    <dt className="text-ink-2">{v.label}</dt>
                    <dd className="font-medium tabular">{typeof v.value === "boolean" ? (v.value ? "Sí" : "No") : typeof v.value === "number" ? fmtNumber(v.value) : String(v.value ?? "—")}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
