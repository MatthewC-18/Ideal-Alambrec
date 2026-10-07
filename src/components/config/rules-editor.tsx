"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, FlaskConical, Info, Loader2, Plus, Save, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { deleteRulesDraft, publishRules, saveRulesDraft } from "@/app/actions/config";
import { NumberInput } from "@/components/quote/number-input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { calculateQuote } from "@/lib/engine/engine";
import { compile, FUNCTION_HELP } from "@/lib/engine/expr";
import type { LineRule, PriceBook, RuleSetData, SystemRule } from "@/lib/engine/types";
import { cn } from "@/lib/cn";
import { fmtMoney, fmtQty } from "@/lib/format";

type Props = {
  draftId: string | null;
  version: number;
  editable: boolean;
  initial: RuleSetData;
  current: RuleSetData;
  notes: string;
  products: { sap: string; name: string; pvs: number; weightKg: number }[];
  tiers: { key: string; label: string; discountPct: number }[];
};

function exprError(src: string | undefined): string | null {
  if (!src || !src.trim()) return null;
  try {
    compile(src);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

function ExprInput({ value, onChange, disabled, placeholder, label }: { value: string; onChange: (v: string) => void; disabled: boolean; placeholder?: string; label: string }) {
  const err = exprError(value);
  return (
    <div>
      <input
        aria-label={label}
        className={cn("input h-8 font-mono text-[12.5px]", err && "border-bad ring-2 ring-bad-bg")}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {err && <div className="mt-0.5 text-[11.5px] text-bad-ink">{err}</div>}
    </div>
  );
}

function move<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const out = [...arr];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

function Card({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-semibold">{title}</h3>
          {subtitle && <p className="text-[12.5px] text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function RulesEditor(props: Props) {
  const router = useRouter();
  const [rules, setRules] = useState<RuleSetData>(props.initial);
  const [notes, setNotes] = useState(props.notes);
  const [tab, setTab] = useState(props.initial.systems[0]?.key ?? "");
  const [problems, setProblems] = useState<string[] | null>(null);
  const [confirm, setConfirm] = useState<null | "publish" | "discard">(null);
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);
  const productName = useMemo(() => new Map(props.products.map((p) => [p.sap, p.name])), [props.products]);

  const sysIndex = rules.systems.findIndex((s) => s.key === tab);
  const sys = rules.systems[sysIndex];
  const ed = props.editable;
  const updateSys = (patch: Partial<SystemRule>) => {
    setRules((r) => ({ systems: r.systems.map((s, i) => (i === sysIndex ? { ...s, ...patch } : s)) }));
    setDirty(true);
  };

  const paramKeys = useMemo(() => (sys ? [...new Set(sys.heights.flatMap((h) => Object.keys(h.params)))] : []), [sys]);

  // simulator
  const [sim, setSim] = useState({ length: 130 as number | null, height: sys?.heights[0]?.value ?? 0, placa: false, puas: false, incl: 0 as number | null, tier: props.tiers[0]?.key ?? "PVS" });
  const simHeight = sys?.heights.some((h) => Math.abs(h.value - sim.height) < 0.001) ? sim.height : sys?.heights[0]?.value ?? 0;
  const book: PriceBook = useMemo(
    () => ({ tierPct: props.tiers.find((t) => t.key === sim.tier)?.discountPct ?? 0, products: Object.fromEntries(props.products.map((p) => [p.sap, { name: p.name, pvs: p.pvs, weightKg: p.weightKg }])) }),
    [props.products, props.tiers, sim.tier],
  );
  const simulate = (rs: RuleSetData) => {
    if (!sys) return null;
    try {
      return calculateQuote(rs, book, {
        segments: [{ systemKey: sys.key, length: sim.length ?? 0, height: simHeight, placa: sim.placa, puas: sim.puas, incl: (sim.incl ?? 0) / 100 }],
        extras: [],
        descLivianos: 0,
        descPesados: 0,
        globalDiscountPct: 0,
        ivaRate: 0.15,
      });
    } catch (e) {
      return { error: (e as Error).message } as const;
    }
  };
  const simNew = simulate(rules);
  const simOld = simulate(props.current);

  const save = (after?: () => void) =>
    start(async () => {
      if (!props.draftId) return;
      const res = await saveRulesDraft(props.draftId, rules, notes);
      if (!res.ok) {
        setProblems(res.problems ?? [res.error]);
        return void toast.error(res.error);
      }
      setProblems(res.data.problems);
      setDirty(false);
      if (res.data.problems.length) toast.warning("Guardado, pero hay reglas que fallan. Revisa la lista de problemas.");
      else toast.success("Borrador guardado y validado");
      router.refresh();
      after?.();
    });

  if (!sys) return <p>No hay sistemas definidos.</p>;

  const lineRow = (l: LineRule, i: number) => {
    const setLine = (patch: Partial<LineRule>) => updateSys({ lines: sys.lines.map((x, j) => (j === i ? ({ ...x, ...patch } as LineRule) : x)) });
    return (
      <tr key={`${l.id}-${i}`} className="align-top">
        <td className="td w-[60px] px-1">
          {ed && (
            <div className="flex flex-col">
              <button className="rounded p-0.5 text-muted hover:text-ink" onClick={() => updateSys({ lines: move(sys.lines, i, -1) })} aria-label="Subir"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button className="rounded p-0.5 text-muted hover:text-ink" onClick={() => updateSys({ lines: move(sys.lines, i, 1) })} aria-label="Bajar"><ArrowDown className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </td>
        <td className="td min-w-[170px]">
          <input className="input h-8 text-[13px]" value={l.label} disabled={!ed} onChange={(e) => setLine({ label: e.target.value })} aria-label="Nombre de la línea" />
          <select className="input mt-1 h-8 text-[12px]" value={l.section} disabled={!ed} onChange={(e) => setLine({ section: e.target.value as LineRule["section"] })} aria-label="Sección">
            <option value="principal">Principal</option>
            <option value="adicionales">Materiales adicionales</option>
          </select>
        </td>
        <td className="td min-w-[190px]">
          {l.kind === "product" ? (
            <>
              <ExprInput label="Código SAP" value={l.sku} disabled={!ed} onChange={(v) => setLine({ sku: v } as Partial<LineRule>)} />
              {/^'\d+'$/.test(l.sku.trim()) && <div className="mt-0.5 truncate text-[11.5px] text-muted">{productName.get(l.sku.trim().slice(1, -1)) ?? "Código no está en la lista vigente"}</div>}
            </>
          ) : (
            <div className="space-y-1 text-[12px]">
              <div className="font-medium text-ink-2">Rollos (elige la mejor combinación)</div>
              {l.rolls.map((r, k) => (
                <div key={k} className="flex items-center gap-1">
                  <span className="w-12 text-right tabular">{r.meters} m</span>
                  <input
                    className="input h-7 font-mono text-[12px]"
                    value={r.sku}
                    disabled={!ed}
                    onChange={(e) => setLine({ rolls: l.rolls.map((x, m) => (m === k ? { ...x, sku: e.target.value } : x)) } as Partial<LineRule>)}
                    aria-label={`SAP rollo ${r.meters} m`}
                  />
                </div>
              ))}
            </div>
          )}
        </td>
        <td className="td min-w-[200px]">
          {l.kind === "product" ? (
            <ExprInput label="Cantidad" value={l.qty} disabled={!ed} onChange={(v) => setLine({ qty: v } as Partial<LineRule>)} />
          ) : (
            <ExprInput label="Metros" value={l.meters} disabled={!ed} onChange={(v) => setLine({ meters: v } as Partial<LineRule>)} />
          )}
        </td>
        <td className="td min-w-[150px]">
          <ExprInput label="Condición" value={l.when ?? ""} disabled={!ed} placeholder="siempre" onChange={(v) => setLine({ when: v.trim() ? v : undefined })} />
        </td>
        <td className="td w-[130px]">
          <select className="input h-8 text-[12px]" value={l.pricing} disabled={!ed} onChange={(e) => setLine({ pricing: e.target.value as LineRule["pricing"] })} aria-label="Precio">
            <option value="tier">Categoría</option>
            <option value="livianos">Desc. livianos</option>
            <option value="pesados">Desc. pesados</option>
            <option value="pvs">PVS fijo</option>
          </select>
        </td>
        <td className="td w-[40px] px-1">
          {ed && (
            <button className="rounded p-1 text-muted hover:text-bad" onClick={() => updateSys({ lines: sys.lines.filter((_, j) => j !== i) })} aria-label="Quitar línea">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </td>
      </tr>
    );
  };

  const simRows = (() => {
    if (!simNew || "error" in simNew || !simOld || "error" in simOld) return [];
    const keys = [...new Set([...simOld.lines.map((l) => l.sap!), ...simNew.lines.map((l) => l.sap!)])];
    return keys.map((sap) => {
      const a = simOld.lines.filter((l) => l.sap === sap).reduce((s, l) => s + l.qty, 0);
      const b = simNew.lines.filter((l) => l.sap === sap).reduce((s, l) => s + l.qty, 0);
      return { sap, name: productName.get(sap) ?? sap, a, b };
    });
  })();

  return (
    <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-5">
        {ed && (
          <div className="card flex flex-wrap items-end gap-3 p-4">
            <div className="min-w-[260px] flex-1">
              <label className="label" htmlFor="rs-notes">Notas del cambio (versión {props.version})</label>
              <input id="rs-notes" className="input" value={notes} onChange={(e) => { setNotes(e.target.value); setDirty(true); }} placeholder="Ej. Perimetral 2,08 m pasa a 6 fijaciones por poste" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" disabled={pending || !dirty} onClick={() => save()}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar y validar
              </Button>
              <Button disabled={pending} onClick={() => setConfirm("publish")}>
                <CheckCircle2 className="h-4 w-4" /> Publicar
              </Button>
              <Button variant="ghost" className="hover:text-bad" disabled={pending} onClick={() => setConfirm("discard")} aria-label="Descartar borrador">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        {problems && problems.length > 0 && (
          <ul className="space-y-1 rounded-xl border border-bad/30 bg-bad-bg p-3 text-[13px] text-bad-ink">
            {problems.map((p) => (
              <li key={p} className="flex gap-2"><XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {p}</li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-1.5" role="tablist">
          {rules.systems.map((s) => (
            <button key={s.key} role="tab" aria-selected={s.key === tab} onClick={() => setTab(s.key)} className={cn("rounded-full border px-3.5 py-1.5 text-[13px] font-medium", s.key === tab ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-2 hover:bg-page")}>
              {s.name}
            </button>
          ))}
        </div>

        <Card title="General" subtitle="Cómo aparece el sistema en el cotizador y qué opciones ofrece.">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="label">Nombre</label>
              <input className="input" value={sys.name} disabled={!ed} onChange={(e) => updateSys({ name: e.target.value })} />
            </div>
            <div>
              <label className="label">Acabado</label>
              <input className="input" value={sys.finish} disabled={!ed} onChange={(e) => updateSys({ finish: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Descripción</label>
              <input className="input" value={sys.tagline} disabled={!ed} onChange={(e) => updateSys({ tagline: e.target.value })} />
            </div>
            <div className="flex flex-wrap gap-4 text-[14px] md:col-span-2">
              {([
                ["active", "Disponible para cotizar"],
                ["placa", "Ofrece poste con placa"],
                ["puas", "Ofrece púas"],
                ["inclinacion", "Permite terreno escalonado"],
              ] as const).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-600"
                    disabled={!ed}
                    checked={k === "active" ? sys.active : sys.options[k]}
                    onChange={(e) => (k === "active" ? updateSys({ active: e.target.checked }) : updateSys({ options: { ...sys.options, [k]: e.target.checked } }))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </Card>

        <Card
          title="Alturas y productos por altura"
          subtitle="Cada columna es un parámetro que las fórmulas pueden usar por su nombre (ej. fijPorPoste, postePlinto). Los códigos SAP van entre comillas en las fórmulas, aquí van tal cual."
          action={
            ed && (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => updateSys({ heights: [...sys.heights, { value: 0, label: "Nueva", params: Object.fromEntries(paramKeys.map((k) => [k, null])) }] })}>
                  <Plus className="h-3.5 w-3.5" /> Altura
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const name = prompt("Nombre del nuevo parámetro (sin espacios, ej. tapaEspecial)")?.trim();
                    if (name && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) updateSys({ heights: sys.heights.map((h) => ({ ...h, params: { ...h.params, [name]: null } })) });
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> Parámetro
                </Button>
              </div>
            )
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="th">Altura (m)</th>
                  <th className="th">Etiqueta</th>
                  {paramKeys.map((k) => (
                    <th key={k} className="th font-mono normal-case">{k}</th>
                  ))}
                  <th className="th" />
                </tr>
              </thead>
              <tbody>
                {sys.heights.map((h, i) => (
                  <tr key={i} className="align-top">
                    <td className="td w-[96px]">
                      <NumberInput className="h-8 text-[13px]" value={h.value} digits={3} disabled={!ed} onValueChange={(n) => updateSys({ heights: sys.heights.map((x, j) => (j === i ? { ...x, value: n ?? 0 } : x)) })} aria-label="Altura" />
                    </td>
                    <td className="td min-w-[120px]">
                      <input className="input h-8 text-[13px]" value={h.label} disabled={!ed} onChange={(e) => updateSys({ heights: sys.heights.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} aria-label="Etiqueta" />
                    </td>
                    {paramKeys.map((k) => {
                      const v = h.params[k];
                      const setP = (val: string | number | boolean | null) => updateSys({ heights: sys.heights.map((x, j) => (j === i ? { ...x, params: { ...x.params, [k]: val } } : x)) });
                      return (
                        <td key={k} className="td min-w-[110px]">
                          {typeof v === "boolean" ? (
                            <select className="input h-8 text-[12.5px]" value={v ? "1" : "0"} disabled={!ed} onChange={(e) => setP(e.target.value === "1")} aria-label={k}>
                              <option value="1">Sí</option>
                              <option value="0">No</option>
                            </select>
                          ) : (
                            <>
                              <input
                                className="input h-8 font-mono text-[12.5px]"
                                value={v === null || v === undefined ? "" : String(v)}
                                disabled={!ed}
                                placeholder="—"
                                aria-label={k}
                                onChange={(e) => {
                                  const t = e.target.value.trim();
                                  setP(t === "" ? null : typeof v === "number" && !Number.isNaN(Number(t.replace(",", "."))) ? Number(t.replace(",", ".")) : t);
                                }}
                              />
                              {typeof v === "string" && /^\d{5,}$/.test(v) && <div className="mt-0.5 max-w-[160px] truncate text-[11px] text-muted" title={productName.get(v)}>{productName.get(v) ?? "No está en la lista"}</div>}
                            </>
                          )}
                        </td>
                      );
                    })}
                    <td className="td w-[40px] px-1">
                      {ed && sys.heights.length > 1 && (
                        <button className="rounded p-1 text-muted hover:text-bad" onClick={() => updateSys({ heights: sys.heights.filter((_, j) => j !== i) })} aria-label="Quitar altura">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Fórmulas intermedias"
          subtitle="Se calculan en orden; cada una puede usar las anteriores. Aparecen en “¿Cómo se calculó?”."
          action={ed && <Button size="sm" variant="secondary" onClick={() => updateSys({ variables: [...sys.variables, { name: `var${sys.variables.length + 1}`, label: "Nueva fórmula", expr: "0" }] })}><Plus className="h-3.5 w-3.5" /> Fórmula</Button>}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="th" />
                  <th className="th">Nombre</th>
                  <th className="th">Descripción</th>
                  <th className="th">Fórmula</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody>
                {sys.variables.map((v, i) => (
                  <tr key={i} className="align-top">
                    <td className="td w-[40px] px-1">
                      {ed && (
                        <div className="flex flex-col">
                          <button className="rounded p-0.5 text-muted hover:text-ink" onClick={() => updateSys({ variables: move(sys.variables, i, -1) })} aria-label="Subir"><ArrowUp className="h-3.5 w-3.5" /></button>
                          <button className="rounded p-0.5 text-muted hover:text-ink" onClick={() => updateSys({ variables: move(sys.variables, i, 1) })} aria-label="Bajar"><ArrowDown className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                    </td>
                    <td className="td w-[140px]">
                      <input className="input h-8 font-mono text-[12.5px]" value={v.name} disabled={!ed} onChange={(e) => updateSys({ variables: sys.variables.map((x, j) => (j === i ? { ...x, name: e.target.value.replace(/[^A-Za-z0-9_]/g, "") } : x)) })} aria-label="Nombre" />
                    </td>
                    <td className="td min-w-[160px]">
                      <input className="input h-8 text-[13px]" value={v.label} disabled={!ed} onChange={(e) => updateSys({ variables: sys.variables.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} aria-label="Descripción" />
                    </td>
                    <td className="td min-w-[240px]">
                      <ExprInput label="Fórmula" value={v.expr} disabled={!ed} onChange={(val) => updateSys({ variables: sys.variables.map((x, j) => (j === i ? { ...x, expr: val } : x)) })} />
                    </td>
                    <td className="td w-[40px] px-1">
                      {ed && (
                        <button className="rounded p-1 text-muted hover:text-bad" onClick={() => updateSys({ variables: sys.variables.filter((_, j) => j !== i) })} aria-label="Quitar fórmula">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Materiales que se agregan a la cotización"
          subtitle="Cada línea elige un código SAP y una cantidad. Si dos líneas usan el mismo código, se suman."
          action={ed && <Button size="sm" variant="secondary" onClick={() => updateSys({ lines: [...sys.lines, { id: `linea_${sys.lines.length + 1}`, label: "Nuevo material", section: "principal", kind: "product", sku: "''", qty: "0", pricing: "tier" }] })}><Plus className="h-3.5 w-3.5" /> Material</Button>}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="th" />
                  <th className="th">Material</th>
                  <th className="th">Código SAP</th>
                  <th className="th">Cantidad</th>
                  <th className="th">Solo si…</th>
                  <th className="th">Precio</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody>{sys.lines.map(lineRow)}</tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Validaciones"
          subtitle="Mensajes que ve el asesor. Un error bloquea la cotización; una advertencia solo informa. {altura} se reemplaza por la altura elegida."
          action={ed && <Button size="sm" variant="secondary" onClick={() => updateSys({ checks: [...sys.checks, { when: "false", level: "warning", message: "Nuevo mensaje" }] })}><Plus className="h-3.5 w-3.5" /> Validación</Button>}
        >
          {sys.checks.length === 0 ? (
            <p className="text-[13px] text-muted">Sin validaciones.</p>
          ) : (
            <div className="space-y-2">
              {sys.checks.map((c, i) => (
                <div key={i} className="grid items-start gap-2 md:grid-cols-[1fr_140px_2fr_40px]">
                  <ExprInput label="Condición" value={c.when} disabled={!ed} onChange={(v) => updateSys({ checks: sys.checks.map((x, j) => (j === i ? { ...x, when: v } : x)) })} />
                  <select className="input h-8 text-[12.5px]" value={c.level} disabled={!ed} onChange={(e) => updateSys({ checks: sys.checks.map((x, j) => (j === i ? { ...x, level: e.target.value as "error" | "warning" } : x)) })} aria-label="Nivel">
                    <option value="error">Error (bloquea)</option>
                    <option value="warning">Advertencia</option>
                  </select>
                  <input className="input h-8 text-[13px]" value={c.message} disabled={!ed} onChange={(e) => updateSys({ checks: sys.checks.map((x, j) => (j === i ? { ...x, message: e.target.value } : x)) })} aria-label="Mensaje" />
                  {ed && (
                    <button className="rounded p-1 text-muted hover:text-bad" onClick={() => updateSys({ checks: sys.checks.filter((_, j) => j !== i) })} aria-label="Quitar validación">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <aside className="space-y-5 2xl:sticky 2xl:top-6">
        <section className="card p-4">
          <h3 className="mb-1 flex items-center gap-2 text-[15px] font-semibold">
            <FlaskConical className="h-4 w-4 text-brand-600" /> Probar {sys.name.replace("CercasPro ", "")}
          </h3>
          <p className="mb-3 text-[12.5px] text-muted">Compara la versión vigente con {ed ? "este borrador" : "las reglas mostradas"}.</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Longitud</label>
              <NumberInput suffix="m" value={sim.length} onValueChange={(n) => setSim((s) => ({ ...s, length: n }))} />
            </div>
            <div>
              <label className="label">Altura</label>
              <select className="input" value={simHeight} onChange={(e) => setSim((s) => ({ ...s, height: Number(e.target.value) }))}>
                {sys.heights.map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>
            {sys.options.inclinacion && (
              <div>
                <label className="label">Inclinación</label>
                <NumberInput suffix="%" value={sim.incl} onValueChange={(n) => setSim((s) => ({ ...s, incl: n }))} />
              </div>
            )}
            <div>
              <label className="label">Categoría</label>
              <select className="input" value={sim.tier} onChange={(e) => setSim((s) => ({ ...s, tier: e.target.value }))}>
                {props.tiers.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex gap-4 text-[13px]">
              {sys.options.placa && (
                <label className="flex items-center gap-2"><input type="checkbox" className="accent-brand-600" checked={sim.placa} onChange={(e) => setSim((s) => ({ ...s, placa: e.target.checked }))} /> Placa</label>
              )}
              {sys.options.puas && (
                <label className="flex items-center gap-2"><input type="checkbox" className="accent-brand-600" checked={sim.puas} onChange={(e) => setSim((s) => ({ ...s, puas: e.target.checked }))} /> Púas</label>
              )}
            </div>
          </div>
          {simNew && "error" in simNew ? (
            <p className="mt-3 text-[13px] text-bad-ink">{simNew.error}</p>
          ) : (
            simNew && (
              <>
                {simNew.messages.length > 0 && (
                  <ul className="mt-3 space-y-1 text-[12.5px]">
                    {simNew.messages.map((m, i) => (
                      <li key={i} className={m.level === "error" ? "text-bad-ink" : "text-warn-ink"}>{m.message}</li>
                    ))}
                  </ul>
                )}
                <table className="mt-3 w-full border-separate border-spacing-0 text-[12.5px]">
                  <thead>
                    <tr>
                      <th className="th">Material</th>
                      <th className="th text-right">Vigente</th>
                      <th className="th text-right">{ed ? "Borrador" : "Mostrado"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simRows.map((r) => (
                      <tr key={r.sap} className={cn(r.a !== r.b && "bg-warn-bg/60")}>
                        <td className="td py-1.5 text-[12.5px]"><div className="max-w-[200px] truncate" title={r.name}>{r.name}</div></td>
                        <td className="td py-1.5 text-right tabular text-[12.5px]">{fmtQty(r.a)}</td>
                        <td className="td py-1.5 text-right font-medium tabular text-[12.5px]">{fmtQty(r.b)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="px-3 pt-2 text-right text-ink-2">Subtotal</td>
                      <td className="px-3 pt-2 text-right tabular">{simOld && !("error" in simOld) ? fmtMoney(simOld.subtotal) : "—"}</td>
                      <td className="px-3 pt-2 text-right font-semibold tabular">{fmtMoney(simNew.subtotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </>
            )
          )}
        </section>
        <section className="card p-4 text-[12.5px]">
          <h3 className="mb-2 flex items-center gap-2 text-[14px] font-semibold"><Info className="h-4 w-4 text-brand-600" /> Ayuda para fórmulas</h3>
          <p className="mb-2 text-ink-2">
            Variables disponibles: <code className="font-mono">L</code> (longitud en m), <code className="font-mono">altura</code>, <code className="font-mono">incl</code> (0,10 = 10 %), <code className="font-mono">placa</code>, <code className="font-mono">puas</code>, los parámetros de la altura y las fórmulas intermedias.
          </p>
          <ul className="space-y-1">
            {FUNCTION_HELP.map((f) => (
              <li key={f.name}><code className="font-mono text-brand-700">{f.name}</code> — {f.help}</li>
            ))}
          </ul>
          <p className="mt-2 text-ink-2">Operadores: + − * / ( ) &lt; &lt;= &gt; &gt;= == != &amp;&amp; (y) || (o) ! (no). Los códigos SAP fijos van entre comillas: <code className="font-mono">&apos;272173&apos;</code>.</p>
        </section>
      </aside>

      <Dialog
        open={confirm === "publish"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`¿Publicar las reglas v${props.version}?`}
        description="Las cotizaciones nuevas usarán estas reglas. Las ya guardadas conservan las reglas con que se hicieron."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
            <Button
              disabled={pending}
              onClick={() => {
                const go = () =>
                  start(async () => {
                    const res = await publishRules(props.draftId!);
                    if (!res.ok) return void toast.error(res.error);
                    toast.success(`Reglas v${props.version} publicadas`);
                    setConfirm(null);
                    router.refresh();
                  });
                if (dirty) save(go);
                else go();
              }}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Publicar
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-ink-2">Antes de publicar se prueba cada fórmula con todas las alturas y opciones; si algo falla, no se publica.</p>
      </Dialog>
      <Dialog
        open={confirm === "discard"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="¿Descartar este borrador?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteRulesDraft(props.draftId!);
                  if (!res.ok) return void toast.error(res.error);
                  setConfirm(null);
                  router.refresh();
                })
              }
            >
              Descartar
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-ink-2">Las reglas vigentes no cambian.</p>
      </Dialog>
    </div>
  );
}
