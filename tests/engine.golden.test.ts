// Compares the web engine against the legacy Excel, recalculated in LibreOffice for 285 input combinations.
// The fixture holds real prices, so it is gitignored; generate it with `npm run golden`.
import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { calculateQuote } from "@/lib/engine/engine";
import { DEFAULT_RULES } from "@/lib/engine/default-rules";
import type { PriceBook } from "@/lib/engine/types";
import { loadWorkbook, parsePriceList } from "@/lib/import/excel";

const FIXTURE = "tests/fixtures/excel-golden.local.json";
const EXCEL = "legacy/Cotizador_PRO_V6R02-2026.xlsm";
const enabled = existsSync(FIXTURE) && existsSync(EXCEL);

type GoldenCase = {
  input: { tipo: string; L: number; altura: number; placa: "S" | "N"; puas: "S" | "N"; incl: number; tier: string; dl: number; dp: number };
  lines: { code: number | string; qty: number; price: number; total: number }[];
  subtotal: number;
};

const SYSTEM_KEY: Record<string, string> = {
  PERIMETRAL: "PERIMETRAL",
  URBANA: "URBANA",
  INTRADOMICILIARIA: "INTRADOMICILIARIA",
  "MAXIMA SEGURIDAD": "MAXIMA_SEGURIDAD",
};

describe.skipIf(!enabled)("motor vs Excel original (golden)", async () => {
  const cases: GoldenCase[] = enabled ? JSON.parse(readFileSync(FIXTURE, "utf8")) : [];
  const pl = enabled ? parsePriceList(await loadWorkbook(readFileSync(EXCEL))) : null;

  const book = (tier: string): PriceBook => ({
    tierPct: pl!.tiers.find((t) => t.key === tier)!.discountPct,
    products: Object.fromEntries(pl!.products.map((p) => [p.sap, { name: p.name, pvs: p.pvs, weightKg: p.weightKg }])),
  });

  it("tiene casos", () => expect(cases.length).toBeGreaterThan(200));

  const report = { exact: 0, documented: {} as Record<string, number> };
  const note = (k: string) => (report.documented[k] = (report.documented[k] ?? 0) + 1);

  it.each(cases.map((c, i) => [i, c] as const))("caso %i", (_i, c) => {
    const inp = c.input;
    const res = calculateQuote(DEFAULT_RULES, book(inp.tier), {
      segments: [{ systemKey: SYSTEM_KEY[inp.tipo], length: inp.L, height: inp.altura, placa: inp.placa === "S", puas: inp.puas === "S", incl: inp.incl }],
      extras: [],
      descLivianos: inp.dl,
      descPesados: inp.dp,
      globalDiscountPct: 0,
      ivaRate: 0.15,
    });

    // Fix 1: the Excel quotes 3.05/4.02 m with plate posts by silently dropping the post line.
    if (inp.tipo === "PERIMETRAL" && inp.placa === "S" && inp.altura > 3) {
      expect(res.ok).toBe(false);
      expect(res.messages.some((m) => m.level === "error" && /placa/.test(m.message))).toBe(true);
      note("placa no disponible en 3,05/4,02 m (Excel omitía los postes)");
      return;
    }
    if (inp.tipo === "URBANA" && inp.placa === "S") return;
    expect(res.messages.filter((m) => m.level === "error")).toEqual([]);

    const mine = new Map<string, { qty: number; price: number }>();
    for (const l of res.lines) {
      const prev = mine.get(l.sap!);
      mine.set(l.sap!, prev ? { qty: prev.qty + l.qty, price: l.unitPrice } : { qty: l.qty, price: l.unitPrice });
    }

    const excel = new Map<string, { qty: number; price: number | null }>();
    let combinedQty = 0;
    for (const l of c.lines) {
      if (l.code === null || l.code === "" || l.code === 0) continue;
      const parts = String(l.code).split("/").map((s) => String(Math.trunc(Number(s.trim()))));
      if (parts.length > 1) combinedQty += l.qty;
      for (const sap of parts) {
        const prev = excel.get(sap);
        excel.set(sap, { qty: (prev?.qty ?? 0) + l.qty, price: parts.length > 1 ? null : l.price });
      }
    }

    const puasNoAplica = inp.tipo === "PERIMETRAL" && inp.puas === "S" && inp.altura < 1.2;
    const postes = (res.segments[0].variables.find((v) => v.name === "postes")?.value as number) ?? 0;
    const isRoll = (sap: string) => ["188057", "188055", "188051", "188053", "188072"].includes(sap);
    let rollsDiffer = false;

    for (const [sap, e] of excel) {
      if (isRoll(sap)) continue;
      const m = mine.get(sap);
      expect(m, `SAP ${sap} falta en el motor`).toBeDefined();
      if (puasNoAplica && (sap === "270501" || sap === "270504")) {
        // Fix 2: at 1.11 m the Excel adds one extra bolt+nut per post for barbed-wire arms that are never quoted.
        expect(e.qty - m!.qty).toBe(postes);
        note("1,11 m con púas: Excel sumaba pernos/tuercas de brazos inexistentes");
      } else {
        expect(m!.qty, `cantidad SAP ${sap}`).toBe(e.qty);
      }
      if (e.price !== null) {
        if (inp.tier === "PVS") expect(Math.abs(m!.price - e.price)).toBeLessThan(0.0051);
        else expect(m!.price, `precio SAP ${sap}`).toBe(e.price);
      }
    }
    for (const [sap] of mine) {
      if (isRoll(sap)) continue;
      expect(excel.has(sap), `SAP ${sap} sobra en el motor`).toBe(true);
    }

    // Barbed-wire rolls: Excel shows a single roll line (max code / max count) and its greedy mix can under-cover.
    const excelRolls = [...excel].filter(([s]) => isRoll(s));
    const myRolls = [...mine].filter(([s]) => isRoll(s));
    const meters = (r: [string, { qty: number }][]) =>
      r.reduce((s, [sap, v]) => s + v.qty * ({ "188057": 500, "188055": 400, "188051": 300, "188053": 200, "188072": 100 } as Record<string, number>)[sap], 0);
    if (myRolls.length > 0) {
      expect(meters(myRolls)).toBeGreaterThanOrEqual(inp.L * 3);
      if (JSON.stringify(excelRolls.map(([s, v]) => [s, v.qty])) !== JSON.stringify(myRolls.map(([s, v]) => [s, v.qty]))) {
        rollsDiffer = true;
        note("rollos de púas: Excel elegía combinación incompleta");
      }
    } else expect(excelRolls.length).toBe(0);

    // Totals: allow per-unit rounding differences (combined panel line, unrounded PVS) and roll fixes.
    const unitTol = (inp.tier === "PVS" ? 0.005 * res.lines.reduce((s, l) => s + l.qty, 0) : 0) + 0.01 * combinedQty + 0.011;
    const extraBolts = puasNoAplica
      ? postes * ((excel.get("270501")?.price ?? 0) + (excel.get("270504")?.price ?? 0))
      : 0;
    if (!rollsDiffer) {
      expect(Math.abs(res.subtotal + extraBolts - c.subtotal), `subtotal (Excel ${c.subtotal}, motor ${res.subtotal})`).toBeLessThanOrEqual(unitTol);
    }
    if (!puasNoAplica && !rollsDiffer && combinedQty === 0 && inp.tier !== "PVS") report.exact++;
  });

  it("resumen", () => {
    console.log("Coincidencias exactas:", report.exact, "· Diferencias documentadas:", report.documented);
  });
});
