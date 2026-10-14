import { describe, expect, it } from "vitest";
import { calculateQuote } from "@/lib/engine/engine";
import { DEFAULT_RULES } from "@/lib/engine/default-rules";
import { evaluate, excelRound, ExprError } from "@/lib/engine/expr";
import { pickRolls } from "@/lib/engine/rolls";
import { ruleSetSchema, type PriceBook, type QuoteInput } from "@/lib/engine/types";

// Fictitious prices: these tests check quantities and arithmetic, not the real price list.
const SAPS = [
  "189168", "189483", "273709", "270872", "270873", "270874", "270876", "665190", "270526", "270527", "270877",
  "189186", "270512", "272173", "189162", "189488", "189197", "189196", "270501", "270502", "270503", "270504",
  "189489", "189205", "683471", "188057", "188055", "188051", "188053", "667701", "667702", "667705", "667706",
  "689168", "270428", "270430", "270433", "270434", "270435", "270436", "270437", "270438", "270439", "270440",
  "645392", "645393",
];
const book: PriceBook = {
  tierPct: 0.1,
  products: Object.fromEntries(SAPS.map((s, i) => [s, { name: `Producto ${s}`, pvs: 10 + i, weightKg: 1 }])),
};
const base: Omit<QuoteInput, "segments"> = { extras: [], descLivianos: 0, descPesados: 0, globalDiscountPct: 0, ivaRate: 0.15 };
const qtyOf = (res: ReturnType<typeof calculateQuote>, sap: string) => res.lines.filter((l) => l.sap === sap).reduce((s, l) => s + l.qty, 0);

describe("expresiones", () => {
  it("evalúa aritmética, ternarios y funciones", () => {
    expect(evaluate("roundup(130 / 2.5 * (1 + 0.1))", {})).toBe(58);
    expect(evaluate("L < 25 ? 1 : roundup(L / 25)", { L: 130 })).toBe(6);
    expect(evaluate("placa ? a : b", { placa: false, a: "X", b: "Y" })).toBe("Y");
    expect(evaluate("max(1, 2, 3) + min(4, 5)", {})).toBe(7);
  });
  it("redondea como Excel", () => {
    expect(excelRound(2.675, 2)).toBe(2.68);
    expect(excelRound(1.005, 2)).toBe(1.01);
    expect(excelRound(-2.5)).toBe(-3);
  });
  it("rechaza variables, funciones y caracteres no permitidos", () => {
    expect(() => evaluate("constructor", {})).toThrow(ExprError);
    expect(() => evaluate("process.exit()", {})).toThrow(ExprError);
    expect(() => evaluate("toString(1)", {})).toThrow(ExprError);
    expect(() => evaluate("a; b", { a: 1, b: 2 })).toThrow(ExprError);
  });
});

describe("rollos de alambre de púas", () => {
  const R = [500, 400, 300, 200].map((m) => ({ meters: m, sku: String(m) }));
  const pick = (need: number) => Object.fromEntries(pickRolls(need, R).map((r) => [r.meters, r.count]));
  it("cubre siempre los metros requeridos", () => {
    for (let need = 1; need <= 6000; need += 7) {
      expect(pickRolls(need, R).reduce((s, r) => s + r.meters * r.count, 0)).toBeGreaterThanOrEqual(need);
    }
  });
  it("elige la misma combinación que el Excel", () => {
    expect(pick(390)).toEqual({ 400: 1 }); // 130 m
    expect(pick(750)).toEqual({ 400: 2 }); // 250 m
    expect(pick(900)).toEqual({ 300: 3 }); // 300 m
    expect(pick(1050)).toEqual({ 500: 2, 200: 1 }); // 350 m: el Excel muestra solo 2 × 500 m
    expect(pick(3750)).toEqual({ 200: 19 }); // 1.250 m
  });
});

describe("reglas por defecto", () => {
  it("son válidas según el esquema", () => {
    expect(() => ruleSetSchema.parse(DEFAULT_RULES)).not.toThrow();
  });

  it("Perimetral 130 m, 2,08 m, plinto, sin púas", () => {
    const res = calculateQuote(DEFAULT_RULES, book, { ...base, segments: [{ systemKey: "PERIMETRAL", length: 130, height: 2.08, placa: false, puas: false, incl: 0 }] });
    expect(res.ok).toBe(true);
    expect(qtyOf(res, "270876")).toBe(53); // postes
    expect(qtyOf(res, "189488")).toBe(53); // tapas
    expect(qtyOf(res, "272173")).toBe(265); // 5 fijaciones por poste
    expect(qtyOf(res, "270501")).toBe(265);
    expect(qtyOf(res, "270504")).toBe(265);
    expect(qtyOf(res, "189483")).toBe(52); // paneles
    expect(qtyOf(res, "189205")).toBe(6);
    expect(qtyOf(res, "683471")).toBe(2);
  });

  it("Perimetral escalonado agrega postes pero no paneles", () => {
    const res = calculateQuote(DEFAULT_RULES, book, { ...base, segments: [{ systemKey: "PERIMETRAL", length: 100, height: 2.08, placa: true, puas: false, incl: 0.1 }] });
    expect(qtyOf(res, "270874")).toBe(45); // roundup(40*1.1)+1, poste placa
    expect(qtyOf(res, "189483")).toBe(40);
    expect(qtyOf(res, "189489")).toBe(180); // 4 pernos de anclaje por poste
  });

  it("Perimetral 4,02 m usa dos paneles por tramo y bloquea placa", () => {
    const ok = calculateQuote(DEFAULT_RULES, book, { ...base, segments: [{ systemKey: "PERIMETRAL", length: 50, height: 4.02, placa: false, puas: true, incl: 0 }] });
    expect(qtyOf(ok, "189483 / 189483")).toBe(20); // una línea por tramo con los dos paneles, como el Excel
    expect(qtyOf(ok, "270512")).toBe(21); // brazos
    expect(qtyOf(ok, "189162")).toBe(63); // fijación jumbo
    expect(qtyOf(ok, "270503")).toBe(21 * 9 + 21);
    const bad = calculateQuote(DEFAULT_RULES, book, { ...base, segments: [{ systemKey: "PERIMETRAL", length: 50, height: 4.02, placa: true, puas: false, incl: 0 }] });
    expect(bad.ok).toBe(false);
  });

  it("Intradomiciliaria y Máxima Seguridad", () => {
    const res = calculateQuote(DEFAULT_RULES, book, {
      ...base,
      segments: [
        { systemKey: "INTRADOMICILIARIA", length: 130, height: 1.25, placa: false, puas: false, incl: 0 },
        { systemKey: "MAXIMA_SEGURIDAD", length: 130, height: 3, placa: false, puas: false, incl: 0 },
      ],
    });
    expect(qtyOf(res, "270428")).toBe(87);
    expect(qtyOf(res, "270430")).toBe(88);
    expect(qtyOf(res, "270433")).toBe(1);
    expect(qtyOf(res, "270436")).toBe(55);
    expect(qtyOf(res, "270439")).toBe(56);
    expect(qtyOf(res, "645392")).toBe(448);
    expect(res.segments).toHaveLength(2);
  });
});

describe("precios, ajustes y totales", () => {
  it("aplica el % de la categoría, IVA y descuento global", () => {
    const res = calculateQuote(DEFAULT_RULES, book, {
      ...base,
      globalDiscountPct: 0.05,
      segments: [{ systemKey: "URBANA", length: 10, height: 2.08, placa: false, puas: false, incl: 0 }],
    });
    for (const l of res.lines) expect(l.unitPrice).toBe(excelRound(l.unitPvs! * 0.9, 2));
    const taxable = res.subtotal * 0.95;
    expect(res.discountTotal).toBe(excelRound(res.subtotal * 0.05, 2));
    expect(res.iva).toBe(excelRound(taxable * 0.15, 2));
    expect(res.total).toBe(excelRound(taxable * 1.15, 2));
  });

  it("como el Excel: PVS sin redondear, totales sobre importes sin redondear y paneles dobles como una unidad", () => {
    const pvsBook: PriceBook = {
      tierPct: 0,
      products: { ...book.products, "270501": { name: "Perno", pvs: 0.87654321987, weightKg: 0.02 } },
    };
    const res = calculateQuote(DEFAULT_RULES, pvsBook, { ...base, segments: [{ systemKey: "PERIMETRAL", length: 130, height: 2.08, placa: false, puas: false, incl: 0 }] });
    const perno = res.lines.find((l) => l.sap === "270501")!;
    expect(perno.unitPrice).toBe(0.87654321987);
    expect(perno.total).toBe(232.28); // 265 × 0,876543… (con el precio redondeado serían 233,20)
    const raw = res.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
    expect(res.subtotal).toBe(excelRound(raw, 2));
    expect(res.total).toBe(excelRound(raw * 1.15, 2));

    const tier = calculateQuote(DEFAULT_RULES, book, { ...base, segments: [{ systemKey: "PERIMETRAL", length: 10, height: 3.05, placa: false, puas: false, incl: 0 }] });
    const panel = tier.lines.find((l) => l.sap === "189168 / 189483")!;
    expect(panel.unitPrice).toBe(excelRound((book.products["189168"].pvs + book.products["189483"].pvs) * 0.9, 2));
    expect(panel.weightKg).toBe(2);
  });

  it("un precio escrito igual al de lista (al centavo) no cuenta como ajuste", () => {
    const pvsBook: PriceBook = { tierPct: 0, products: { ...book.products, "270876": { name: "Poste", pvs: 24.0312345678, weightKg: 1 } } };
    const res = calculateQuote(DEFAULT_RULES, pvsBook, {
      ...base,
      segments: [{ systemKey: "PERIMETRAL", length: 25, height: 2.08, placa: false, puas: false, incl: 0, overrides: { "principal:270876": { unitPrice: 24.03 } } }],
    });
    expect(res.lines.find((l) => l.sap === "270876")).toMatchObject({ unitPrice: 24.0312345678, priceOverride: false });
  });

  it("respeta precios y cantidades ajustados por el asesor", () => {
    const res = calculateQuote(DEFAULT_RULES, book, {
      ...base,
      segments: [
        {
          systemKey: "PERIMETRAL", length: 25, height: 2.08, placa: false, puas: false, incl: 0,
          overrides: { "principal:270876": { qty: 15, unitPrice: 1.5 } },
        },
      ],
      extras: [
        { id: "a", sap: "189205", qty: 2 },
        { id: "b", description: "Transporte a obra", qty: 1, unitPrice: 80 },
      ],
    });
    const poste = res.lines.find((l) => l.sap === "270876")!;
    expect(poste).toMatchObject({ qty: 15, calcQty: 11, unitPrice: 1.5, priceOverride: true, qtyOverride: true });
    expect(res.lines.find((l) => l.description === "Transporte a obra")?.total).toBe(80);
    expect(res.lines.filter((l) => l.section === "extras")).toHaveLength(2);
  });

  it("informa productos que faltan en la lista de precios", () => {
    const res = calculateQuote(DEFAULT_RULES, { ...book, products: {} }, { ...base, segments: [{ systemKey: "URBANA", length: 10, height: 2.08, placa: false, puas: false, incl: 0 }] });
    expect(res.ok).toBe(false);
    expect(res.messages[0].message).toMatch(/no está en la lista de precios/);
  });
});
