import "server-only";
import type { Quote, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { ruleSetSchema, type RuleSetData } from "@/lib/engine/types";
import type { BuilderProps } from "@/components/quote/quote-builder";
import { clientCatalog, getActivePriceList, getActiveRuleSet, getPriceListById } from "./catalog";

export async function loadBuilderData(user: User, quote?: Quote): Promise<Omit<BuilderProps, "mode" | "initial" | "quoteId" | "quoteNumber"> | { error: string }> {
  const [settings, priceList, ruleSet, customers, advisors] = await Promise.all([
    getSettings(),
    quote ? getPriceListById(quote.priceListId) : getActivePriceList(),
    quote ? prisma.ruleSet.findUnique({ where: { id: quote.ruleSetId } }) : getActiveRuleSet(),
    prisma.customer.findMany({ orderBy: { updatedAt: "desc" }, take: 2000 }),
    can.editAnyQuote(user.role)
      ? prisma.user.findMany({ where: { active: true, role: { in: ["ASESOR", "SUPERVISOR", "ADMIN"] } }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve(null),
  ]);
  if (!priceList) return { error: "No hay una lista de precios vigente. Un administrador debe publicar una en Configuración → Listas de precios." };
  if (!ruleSet) return { error: "No hay reglas de cálculo vigentes." };
  const role = user.role === "LECTOR" ? "ASESOR" : user.role;
  return {
    catalog: clientCatalog(priceList),
    rules: ruleSetSchema.parse(ruleSet.data) as RuleSetData,
    customers: customers.map((c) => ({ id: c.id, name: c.name, company: c.company, city: c.city, tierKey: c.tierKey, email: c.email, phone: c.phone, taxId: c.taxId, address: c.address, notes: c.notes })),
    advisors,
    limits: {
      maxLivianos: settings.limits.maxLivianos,
      maxPesados: settings.limits.maxPesados,
      priceOverride: settings.limits.priceOverride[role],
      globalDiscount: settings.limits.globalDiscount[role],
    },
    ivaRate: quote ? Number(quote.ivaRate) : settings.quote.ivaRate,
    usingSnapshot: Boolean(quote && (await getActivePriceList())?.id !== quote.priceListId),
  };
}
