import { ExprError, Scope, Value, evaluate, evaluateBool, evaluateNumber, excelRound } from "./expr";
import { pickRolls } from "./rolls";
import type {
  CalcLine,
  CalcMessage,
  PriceBook,
  PricingMode,
  QuoteInput,
  QuoteResult,
  RuleSetData,
  SegmentInput,
  SegmentResult,
  SystemRule,
} from "./types";

export const round2 = (x: number) => excelRound(x, 2);

export function priceFor(pvs: number, mode: PricingMode, book: PriceBook, input: Pick<QuoteInput, "descLivianos" | "descPesados">): number {
  const pct = mode === "tier" ? book.tierPct : mode === "livianos" ? input.descLivianos : mode === "pesados" ? input.descPesados : 0;
  return round2(pvs * (1 - pct));
}

export function findHeight(system: SystemRule, height: number) {
  return system.heights.find((h) => Math.abs(h.value - height) < 0.001);
}

const fmtNum = (n: number) => n.toLocaleString("es-EC", { maximumFractionDigits: 2 });

export function segmentTitle(system: SystemRule, seg: SegmentInput): string {
  const parts = [`${system.name} h = ${fmtNum(seg.height)} m`, `${fmtNum(seg.length)} m lineales`];
  if (system.options.inclinacion) parts.push(`inclinación ${fmtNum(seg.incl * 100)} %`);
  if (system.options.puas) parts.push(seg.puas ? "con 3 hileras de alambre de púas" : "sin alambre de púas");
  if (system.options.placa) parts.push(seg.placa ? "poste con placa" : "poste con plinto");
  return parts.join(" · ");
}

type RawLine = Omit<CalcLine, "key" | "qty" | "unitPrice" | "total" | "priceOverride" | "qtyOverride">;

function evalSegment(
  rules: RuleSetData,
  seg: SegmentInput,
  index: number,
  book: PriceBook,
  input: QuoteInput,
  messages: CalcMessage[],
): { raw: RawLine[]; result: SegmentResult } | null {
  const system = rules.systems.find((s) => s.key === seg.systemKey);
  const push = (level: CalcMessage["level"], message: string, fromCheck = false) => messages.push({ level, message, segmentIndex: index, ...(fromCheck ? { fromCheck } : {}) });
  if (!system) {
    push("error", `El sistema "${seg.systemKey}" no existe en las reglas vigentes.`);
    return null;
  }
  const height = findHeight(system, seg.height);
  if (!height) {
    push("error", `${system.name}: la altura ${fmtNum(seg.height)} m no está disponible.`);
    return null;
  }
  if (!(seg.length > 0)) {
    push("error", `${system.name}: ingresa una longitud mayor a 0 m.`);
    return null;
  }

  const scope: Scope = Object.create(null);
  scope.L = seg.length;
  scope.longitud = seg.length;
  scope.altura = height.value;
  scope.placa = system.options.placa ? seg.placa : false;
  scope.puas = system.options.puas ? seg.puas : false;
  scope.incl = system.options.inclinacion ? seg.incl : 0;
  for (const [k, v] of Object.entries(height.params)) scope[k] = v as Value;

  const variables: SegmentResult["variables"] = [];
  try {
    for (const v of system.variables) {
      scope[v.name] = evaluate(v.expr, scope);
      variables.push({ name: v.name, label: v.label, value: scope[v.name] });
    }
  } catch (e) {
    push("error", `${system.name}: error en la regla de cálculo — ${(e as Error).message}`);
    return null;
  }

  let blocked = false;
  for (const c of system.checks) {
    try {
      if (evaluateBool(c.when, scope)) {
        push(c.level, c.message.replace("{altura}", fmtNum(height.value)), true);
        if (c.level === "error") blocked = true;
      }
    } catch (e) {
      push("error", `${system.name}: error en la validación "${c.message}" — ${(e as Error).message}`);
      blocked = true;
    }
  }
  const result: SegmentResult = {
    index,
    systemKey: system.key,
    systemName: system.name,
    title: seg.label?.trim() || segmentTitle(system, seg),
    variables,
    subtotal: 0,
  };
  if (blocked) return { raw: [], result };

  const raw: RawLine[] = [];
  const addProduct = (sap: string, qty: number, rule: { id: string; section: "principal" | "adicionales"; pricing: PricingMode }) => {
    const p = book.products[sap];
    if (!p) {
      push("error", `El producto SAP ${sap} no está en la lista de precios vigente.`);
      return;
    }
    raw.push({
      segmentIndex: index,
      section: rule.section,
      source: "regla",
      ruleLineId: rule.id,
      sap,
      description: p.name,
      calcQty: qty,
      unitPvs: p.pvs,
      listPrice: priceFor(p.pvs, rule.pricing, book, input),
      weightKg: p.weightKg,
      pricing: rule.pricing,
    });
  };

  for (const line of system.lines) {
    try {
      if (line.when && !evaluateBool(line.when, scope)) continue;
      if (line.kind === "product") {
        const skuVal = evaluate(line.sku, scope);
        if (skuVal === null || skuVal === "" || skuVal === false) continue;
        const qty = evaluateNumber(line.qty, scope);
        if (!(qty > 0)) continue;
        addProduct(String(skuVal), qty, line);
      } else {
        const meters = evaluateNumber(line.meters, scope);
        for (const pick of pickRolls(meters, line.rolls)) addProduct(pick.sku, pick.count, line);
      }
    } catch (e) {
      const msg = e instanceof ExprError ? e.message : String(e);
      push("error", `${system.name}: error en la línea "${line.label}" — ${msg}`);
    }
  }
  return { raw, result };
}

function mergeRaw(raw: RawLine[]): RawLine[] {
  const out: RawLine[] = [];
  for (const r of raw) {
    const same = out.find((o) => o.section === r.section && o.sap === r.sap && o.pricing === r.pricing && o.segmentIndex === r.segmentIndex);
    if (same) same.calcQty += r.calcQty;
    else out.push({ ...r });
  }
  return out;
}

export function overrideKey(section: string, sap: string) {
  return `${section}:${sap}`;
}

export function calculateQuote(rules: RuleSetData, book: PriceBook, input: QuoteInput): QuoteResult {
  const messages: CalcMessage[] = [];
  const lines: CalcLine[] = [];
  const segments: SegmentResult[] = [];

  input.segments.forEach((seg, index) => {
    const r = evalSegment(rules, seg, index, book, input, messages);
    if (!r) return;
    segments.push(r.result);
    for (const raw of mergeRaw(r.raw)) {
      const key = overrideKey(raw.section, raw.sap!);
      const ov = seg.overrides?.[key];
      const qty = ov?.qty !== undefined && ov.qty >= 0 ? ov.qty : raw.calcQty;
      const unitPrice = ov?.unitPrice !== undefined && ov.unitPrice >= 0 ? round2(ov.unitPrice) : raw.listPrice!;
      lines.push({
        ...raw,
        key: `s${index}:${key}`,
        qty,
        unitPrice,
        total: round2(unitPrice * qty),
        priceOverride: unitPrice !== raw.listPrice,
        qtyOverride: qty !== raw.calcQty,
      });
    }
    r.result.subtotal = round2(lines.filter((l) => l.segmentIndex === index).reduce((s, l) => s + l.total, 0));
  });

  for (const ex of input.extras) {
    if (!(ex.qty > 0)) continue;
    if (ex.sap) {
      const p = book.products[ex.sap];
      if (!p) {
        messages.push({ level: "error", message: `El producto SAP ${ex.sap} no está en la lista de precios vigente.`, segmentIndex: null });
        continue;
      }
      const listPrice = priceFor(p.pvs, "tier", book, input);
      const unitPrice = ex.unitPrice !== undefined && ex.unitPrice >= 0 ? round2(ex.unitPrice) : listPrice;
      lines.push({
        key: `x:${ex.id}`,
        segmentIndex: null,
        section: "extras",
        source: "catalogo",
        sap: ex.sap,
        description: p.name,
        qty: ex.qty,
        calcQty: ex.qty,
        unitPvs: p.pvs,
        listPrice,
        unitPrice,
        total: round2(unitPrice * ex.qty),
        weightKg: p.weightKg,
        pricing: "tier",
        priceOverride: unitPrice !== listPrice,
        qtyOverride: false,
      });
    } else {
      const description = (ex.description ?? "").trim();
      if (!description) {
        messages.push({ level: "error", message: "Hay un ítem libre sin descripción.", segmentIndex: null });
        continue;
      }
      const unitPrice = round2(ex.unitPrice ?? 0);
      lines.push({
        key: `x:${ex.id}`,
        segmentIndex: null,
        section: "extras",
        source: "libre",
        sap: null,
        description,
        qty: ex.qty,
        calcQty: ex.qty,
        unitPvs: null,
        listPrice: null,
        unitPrice,
        total: round2(unitPrice * ex.qty),
        weightKg: ex.weightKg ?? 0,
        pricing: "manual",
        priceOverride: false,
        qtyOverride: false,
      });
    }
  }

  if (input.segments.length === 0 && input.extras.length === 0) {
    messages.push({ level: "error", message: "Agrega al menos un cerramiento o un producto.", segmentIndex: null });
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.total, 0));
  const discountTotal = round2(subtotal * input.globalDiscountPct);
  const taxable = round2(subtotal - discountTotal);
  const iva = round2(taxable * input.ivaRate);
  const total = round2(taxable + iva);
  const weightKg = Math.round(lines.reduce((s, l) => s + l.qty * l.weightKg, 0) * 1000) / 1000;
  return {
    lines,
    segments,
    messages,
    subtotal,
    discountTotal,
    taxable,
    iva,
    total,
    weightKg,
    ok: !messages.some((m) => m.level === "error") && lines.length > 0,
  };
}

export function maxDiscountVsList(line: Pick<CalcLine, "listPrice" | "unitPrice">): number {
  if (!line.listPrice || line.listPrice <= 0) return 0;
  return Math.max(0, 1 - line.unitPrice / line.listPrice);
}
