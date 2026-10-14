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

// Same as the Excel: a category price is ROUND(PVS × (1 − %), 2), but the PVS category (0 %) uses the list
// value unrounded; livianos/pesados are always rounded (Calculo!CL36).
export function priceFor(pvs: number, mode: PricingMode, book: PriceBook, input: Pick<QuoteInput, "descLivianos" | "descPesados">): number {
  if (mode === "tier" && book.tierPct === 0) return pvs;
  const pct = mode === "tier" ? book.tierPct : mode === "livianos" ? input.descLivianos : mode === "pesados" ? input.descPesados : 0;
  return round2(pvs * (1 - pct));
}

// "189168 / 189483" quotes two products as one unit, like the Excel's 3,05 m and 4,02 m panels:
// the price is the category price of the summed PVS, not the sum of rounded prices.
export function resolveProduct(sap: string, book: PriceBook): { sap: string; name: string; pvs: number; weightKg: number } | { missing: string } {
  const parts = sap.split("/").map((s) => s.trim()).filter(Boolean);
  const found: PriceBook["products"][string][] = [];
  for (const code of parts) {
    const p = book.products[code];
    if (!p) return { missing: code };
    found.push(p);
  }
  if (found.length === 1) return { sap: parts[0], ...found[0] };
  return {
    sap: parts.join(" / "),
    name: found.map((p) => p.name).join(" + "),
    pvs: found.reduce((s, p) => s + p.pvs, 0),
    weightKg: found.reduce((s, p) => s + p.weightKg, 0),
  };
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
    const p = resolveProduct(sap, book);
    if ("missing" in p) {
      push("error", `El producto SAP ${p.missing} no está en la lista de precios vigente.`);
      return;
    }
    raw.push({
      segmentIndex: index,
      section: rule.section,
      source: "regla",
      ruleLineId: rule.id,
      sap: p.sap,
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

const rawSum = (lines: Pick<CalcLine, "qty" | "unitPrice">[]) => lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

// A typed price equal to the list price at cents (e.g. 0,88 for an unrounded PVS of 0,8792) is not an adjustment.
export function isPriceOverride(price: number | undefined, listPrice: number): boolean {
  return price !== undefined && price >= 0 && round2(price) !== round2(listPrice);
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
      const unitPrice = isPriceOverride(ov?.unitPrice, raw.listPrice!) ? round2(ov!.unitPrice!) : raw.listPrice!;
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
    r.result.subtotal = round2(rawSum(lines.filter((l) => l.segmentIndex === index)));
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
      const unitPrice = isPriceOverride(ex.unitPrice, listPrice) ? round2(ex.unitPrice!) : listPrice;
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

  // Like the Excel's Salida sheet, sums use unrounded line amounts and only the displayed figures are rounded.
  const subtotalRaw = rawSum(lines);
  const discountRaw = subtotalRaw * input.globalDiscountPct;
  const taxableRaw = subtotalRaw - discountRaw;
  const ivaRaw = taxableRaw * input.ivaRate;
  const subtotal = round2(subtotalRaw);
  const discountTotal = round2(discountRaw);
  const taxable = round2(taxableRaw);
  const iva = round2(ivaRaw);
  const total = round2(taxableRaw + ivaRaw);
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
