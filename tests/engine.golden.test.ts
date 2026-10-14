// Compares the web engine against the legacy Excel, recalculated in LibreOffice for hundreds of input combinations.
// The fixture holds real prices, so it is gitignored; generate it with `npm run golden`.
import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { calculateQuote, round2 } from "@/lib/engine/engine";
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
  iva: number;
  total: number;
};

const ROLLS: Record<string, number> = { "188057": 500, "188055": 400, "188051": 300, "188053": 200 };

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

    const mine = new Map<string, { qty: number; price: number; total: number }>();
    for (const l of res.lines) {
      expect(mine.has(l.sap!), `SAP ${l.sap} repetido`).toBe(false);
      mine.set(l.sap!, { qty: l.qty, price: l.unitPrice, total: l.total });
    }
    // Excel codes: "189168 / 189483" for stacked panels, numbers stored as floats.
    const excel = new Map<string, { qty: number; price: number; total: number }>();
    for (const l of c.lines) {
      if (l.code === null || l.code === "" || l.code === 0) continue;
      const sap = String(l.code).split("/").map((s) => String(Math.trunc(Number(s.trim())))).join(" / ");
      expect(excel.has(sap), `Excel repite ${sap}`).toBe(false);
      excel.set(sap, { qty: l.qty, price: l.price, total: l.total });
    }

    const puasNoAplica = inp.tipo === "PERIMETRAL" && inp.puas === "S" && inp.altura < 1.2;
    const postes = (res.segments[0].variables.find((v) => v.name === "postes")?.value as number) ?? 0;
    // What the Excel would charge for the same lines: start from the web amounts and undo the documented fixes.
    let excelEquivalent = res.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
    let documented = false;

    for (const [sap, e] of excel) {
      if (ROLLS[sap]) continue;
      const m = mine.get(sap);
      expect(m, `SAP ${sap} falta en el motor`).toBeDefined();
      expect(m!.price, `precio SAP ${sap}`).toBe(e.price);
      if (puasNoAplica && (sap === "270501" || sap === "270504")) {
        // Fix 2: at 1.11 m the Excel adds one extra bolt+nut per post for barbed-wire arms that are never quoted.
        expect(e.qty - m!.qty).toBe(postes);
        excelEquivalent += postes * e.price;
        documented = true;
      } else {
        expect(m!.qty, `cantidad SAP ${sap}`).toBe(e.qty);
        expect(m!.total, `total línea SAP ${sap}`).toBe(round2(e.total));
      }
    }
    if (puasNoAplica) note("1,11 m con púas: Excel sumaba pernos/tuercas de brazos inexistentes");
    for (const [sap] of mine) {
      if (ROLLS[sap]) continue;
      expect(excel.has(sap), `SAP ${sap} sobra en el motor`).toBe(true);
    }

    // Barbed-wire rolls: same choice as the Excel, which then prints a single line (highest code, highest count).
    const excelRolls = [...excel].filter(([s]) => ROLLS[s]);
    const myRolls = [...mine].filter(([s]) => ROLLS[s]);
    if (myRolls.length > 0) {
      expect(myRolls.reduce((s, [sap, v]) => s + v.qty * ROLLS[sap], 0)).toBeGreaterThanOrEqual(inp.L * 3);
      const shown = [String(Math.max(...myRolls.map(([s]) => Number(s)))), Math.max(...myRolls.map(([, v]) => v.qty))] as const;
      expect(excelRolls.map(([s, v]) => [s, v.qty])).toEqual([shown]);
      expect(mine.get(shown[0])!.price).toBe(excelRolls[0][1].price);
      if (myRolls.length > 1) {
        // Fix 3: the Excel leaves out the other roll sizes of the chosen mix (and their meters).
        excelEquivalent += excelRolls[0][1].qty * excelRolls[0][1].price - myRolls.reduce((s, [, v]) => s + v.qty * v.price, 0);
        documented = true;
        note("rollos de púas: Excel mostraba un solo tipo de rollo");
      }
    } else expect(excelRolls.length).toBe(0);

    // Totals to the cent, as the Excel displays them.
    expect(round2(excelEquivalent), "subtotal").toBe(round2(c.subtotal));
    expect(round2(excelEquivalent * 1.15), "total con IVA").toBe(round2(c.total));
    if (!documented) {
      expect(res.subtotal).toBe(round2(c.subtotal));
      expect(res.iva).toBe(round2(c.iva));
      expect(res.total).toBe(round2(c.total));
      report.exact++;
    }
  });

  it("resumen", () => {
    console.log(`Casos: ${cases.length} · idénticos al centavo: ${report.exact} · diferencias documentadas:`, report.documented);
  });
});
