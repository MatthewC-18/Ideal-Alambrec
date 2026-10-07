import "server-only";
import { prisma } from "@/lib/db";
import { ruleSetSchema, type PriceBook, type RuleSetData } from "@/lib/engine/types";
import type { ClientCatalog } from "./catalog-types";

export async function getActivePriceList() {
  return prisma.priceList.findFirst({
    where: { status: "VIGENTE" },
    orderBy: { publishedAt: "desc" },
    include: { tiers: { orderBy: { sortOrder: "asc" } }, items: { include: { product: true } } },
  });
}

export type FullPriceList = NonNullable<Awaited<ReturnType<typeof getActivePriceList>>>;

export async function getPriceListById(id: string) {
  return prisma.priceList.findUnique({
    where: { id },
    include: { tiers: { orderBy: { sortOrder: "asc" } }, items: { include: { product: true } } },
  });
}

export async function getActiveRuleSet() {
  const rs = await prisma.ruleSet.findFirst({ where: { status: "VIGENTE" }, orderBy: { version: "desc" } });
  if (!rs) return null;
  return { ...rs, rules: ruleSetSchema.parse(rs.data) as RuleSetData };
}

export function priceBookFrom(list: FullPriceList, tierKey: string): PriceBook {
  const tier = list.tiers.find((t) => t.key === tierKey);
  return {
    tierPct: tier ? Number(tier.discountPct) : 0,
    products: Object.fromEntries(
      list.items.map((i) => [
        i.product.sap,
        { name: i.product.name, pvs: Number(i.pvs), weightKg: Number(i.product.weightKg), family: i.product.family },
      ]),
    ),
  };
}

export type { ClientCatalog };

export function clientCatalog(list: FullPriceList): ClientCatalog {
  return {
    priceListId: list.id,
    priceListName: list.name,
    tiers: list.tiers.map((t) => ({ key: t.key, label: t.label, discountPct: Number(t.discountPct) })),
    products: list.items
      .filter((i) => i.product.active)
      .sort((a, b) => a.product.sortOrder - b.product.sortOrder)
      .map((i) => ({
        sap: i.product.sap,
        name: i.product.name,
        family: i.product.family,
        finish: i.product.finish,
        pvs: Number(i.pvs),
        weightKg: Number(i.product.weightKg),
      })),
  };
}
