import "server-only";
import { prisma } from "@/lib/db";
import { calculateQuote } from "@/lib/engine/engine";
import type { RuleSetData } from "@/lib/engine/types";

// Every expression is exercised against each height, with and without plate/barbed wire and slope,
// so a typo is caught before the rules reach the advisors.
export async function validateRules(rules: RuleSetData): Promise<string[]> {
  const problems: string[] = [];
  const products = await prisma.product.findMany({ select: { sap: true, name: true, weightKg: true } });
  const book = { tierPct: 0, products: Object.fromEntries(products.map((p) => [p.sap, { name: p.name, pvs: 1, weightKg: Number(p.weightKg) }])) };
  for (const sys of rules.systems) {
    for (const h of sys.heights) {
      for (const placa of sys.options.placa ? [false, true] : [false]) {
        for (const puas of sys.options.puas ? [false, true] : [false]) {
          for (const length of [7, 130, 1250]) {
            const res = calculateQuote({ systems: [sys] }, book, {
              segments: [{ systemKey: sys.key, length, height: h.value, placa, puas, incl: sys.options.inclinacion ? 0.1 : 0 }],
              extras: [],
              descLivianos: 0,
              descPesados: 0,
              globalDiscountPct: 0,
              ivaRate: 0.15,
            });
            for (const m of res.messages) if (m.level === "error" && !m.fromCheck) problems.push(`${sys.name} · ${h.label}: ${m.message}`);
          }
        }
      }
    }
  }
  return [...new Set(problems)].slice(0, 30);
}
