import "server-only";
import type { Prisma, User } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { calculateQuote, maxDiscountVsList } from "@/lib/engine/engine";
import type { QuoteInput, QuoteResult } from "@/lib/engine/types";
import { writeAudit } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { fmtMoney, fmtPct } from "@/lib/format";
import { getActivePriceList, getActiveRuleSet, getPriceListById, priceBookFrom } from "./catalog";
import { ruleSetSchema } from "@/lib/engine/types";

const pct = z.number().min(0).max(1);

export const segmentSchema = z.object({
  systemKey: z.string().min(1),
  length: z.number().positive().max(100000),
  height: z.number().positive(),
  placa: z.boolean(),
  puas: z.boolean(),
  incl: z.number().min(0).max(1),
  label: z.string().max(200).optional(),
  overrides: z.record(z.object({ qty: z.number().min(0).max(1e7).optional(), unitPrice: z.number().min(0).max(1e8).optional() })).optional(),
});

export const extraSchema = z.object({
  id: z.string().min(1).max(50),
  sap: z.string().max(30).optional(),
  description: z.string().max(300).optional(),
  qty: z.number().positive().max(1e7),
  unitPrice: z.number().min(0).max(1e8).optional(),
  weightKg: z.number().min(0).max(1e6).optional(),
});

export const quoteFormSchema = z.object({
  id: z.string().optional(),
  customerId: z.string().min(1, "Selecciona un cliente"),
  ownerId: z.string().optional(),
  tierKey: z.string().min(1),
  projectSite: z.string().max(200).optional(),
  notes: z.string().max(4000).optional(),
  validityDays: z.number().int().min(1).max(365),
  descLivianos: pct,
  descPesados: pct,
  globalDiscountPct: pct,
  segments: z.array(segmentSchema).max(20),
  extras: z.array(extraSchema).max(100),
});

export type QuoteForm = z.infer<typeof quoteFormSchema>;

export class QuoteValidationError extends Error {
  constructor(public problems: string[]) {
    super(problems.join(" "));
  }
}

export function checkLimits(user: User, form: QuoteForm, result: QuoteResult, limits: Awaited<ReturnType<typeof getSettings>>["limits"]) {
  const problems: string[] = [];
  const role = user.role === "LECTOR" ? "ASESOR" : user.role;
  if (form.descLivianos > limits.maxLivianos + 1e-9) problems.push(`El descuento de livianos no puede superar ${fmtPct(limits.maxLivianos)}.`);
  if (form.descPesados > limits.maxPesados + 1e-9) problems.push(`El descuento de pesados no puede superar ${fmtPct(limits.maxPesados)}.`);
  if (form.globalDiscountPct > limits.globalDiscount[role] + 1e-9)
    problems.push(`Tu rol permite un descuento adicional de hasta ${fmtPct(limits.globalDiscount[role])}.`);
  for (const l of result.lines) {
    if (!l.priceOverride || l.listPrice === null) continue;
    const d = maxDiscountVsList(l);
    if (d > limits.priceOverride[role] + 1e-6)
      problems.push(`${l.description}: el precio ajustado está ${fmtPct(d)} bajo la lista; tu rol permite hasta ${fmtPct(limits.priceOverride[role])}.`);
  }
  return problems;
}

async function nextNumber(tx: Prisma.TransactionClient) {
  const year = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "America/Guayaquil" }).format(new Date()));
  const c = await tx.quoteCounter.upsert({ where: { year }, create: { year, last: 1 }, update: { last: { increment: 1 } } });
  return `COT-${year}-${String(c.last).padStart(5, "0")}`;
}

function toEngineInput(form: QuoteForm, ivaRate: number): QuoteInput {
  return {
    segments: form.segments,
    extras: form.extras,
    descLivianos: form.descLivianos,
    descPesados: form.descPesados,
    globalDiscountPct: form.globalDiscountPct,
    ivaRate,
  };
}

export async function saveQuote(user: User, raw: unknown): Promise<{ id: string; number: string }> {
  const form = quoteFormSchema.parse(raw);
  const settings = await getSettings();

  const existing = form.id ? await prisma.quote.findUnique({ where: { id: form.id }, include: { lines: true } }) : null;
  if (form.id && !existing) throw new QuoteValidationError(["La cotización no existe."]);
  if (existing) {
    if (!can.editAnyQuote(user.role) && existing.ownerId !== user.id) throw new QuoteValidationError(["Solo puedes editar tus propias cotizaciones."]);
    if (!["BORRADOR", "ENVIADA"].includes(existing.status)) throw new QuoteValidationError(["Esta cotización ya fue cerrada; duplícala para hacer cambios."]);
  }

  const priceList = existing ? await getPriceListById(existing.priceListId) : await getActivePriceList();
  if (!priceList) throw new QuoteValidationError(["No hay una lista de precios vigente. Pide a un administrador que publique una."]);
  const ruleSet = existing
    ? await prisma.ruleSet.findUnique({ where: { id: existing.ruleSetId } }).then((r) => r && { ...r, rules: ruleSetSchema.parse(r.data) })
    : await getActiveRuleSet();
  if (!ruleSet) throw new QuoteValidationError(["No hay reglas de cálculo vigentes."]);

  const tier = priceList.tiers.find((t) => t.key === form.tierKey);
  if (!tier) throw new QuoteValidationError([`La categoría "${form.tierKey}" no existe en la lista ${priceList.name}.`]);
  const customer = await prisma.customer.findUnique({ where: { id: form.customerId } });
  if (!customer) throw new QuoteValidationError(["El cliente no existe."]);

  let ownerId = existing?.ownerId ?? user.id;
  if (form.ownerId && form.ownerId !== ownerId) {
    if (!can.editAnyQuote(user.role)) throw new QuoteValidationError(["Solo un supervisor puede reasignar el asesor."]);
    ownerId = form.ownerId;
  }

  const ivaRate = existing ? Number(existing.ivaRate) : settings.quote.ivaRate;
  const result = calculateQuote(ruleSet.rules, priceBookFrom(priceList, tier.key), toEngineInput(form, ivaRate));
  const problems = [...result.messages.filter((m) => m.level === "error").map((m) => m.message), ...checkLimits(user, form, result, settings.limits)];
  if (!result.ok && problems.length === 0) problems.push("La cotización no tiene productos.");
  if (problems.length) throw new QuoteValidationError(problems);

  const quoteData = {
    status: existing?.status ?? "BORRADOR",
    customerId: customer.id,
    ownerId,
    priceListId: priceList.id,
    ruleSetId: ruleSet.id,
    tierKey: tier.key,
    tierPct: tier.discountPct,
    descLivianos: form.descLivianos,
    descPesados: form.descPesados,
    globalDiscountPct: form.globalDiscountPct,
    ivaRate,
    projectSite: form.projectSite?.trim() || null,
    notes: form.notes?.trim() || null,
    validityDays: form.validityDays,
    input: { segments: form.segments, extras: form.extras } as Prisma.InputJsonValue,
    subtotal: result.subtotal,
    discountTotal: result.discountTotal,
    iva: result.iva,
    total: result.total,
    weightKg: result.weightKg,
    hasOverrides: result.lines.some((l) => l.priceOverride || l.qtyOverride) || form.globalDiscountPct > 0,
  } satisfies Omit<Prisma.QuoteUncheckedCreateInput, "number">;

  const lines = result.lines.map((l, i) => ({
    sortOrder: i,
    segmentIndex: l.segmentIndex,
    section: l.section,
    source: l.source,
    ruleLineId: l.ruleLineId ?? null,
    sap: l.sap,
    description: l.description,
    qty: l.qty,
    unitPvs: l.unitPvs,
    listPrice: l.listPrice,
    unitPrice: l.unitPrice,
    total: l.total,
    weightKg: Math.round(l.qty * l.weightKg * 1000) / 1000,
    priceOverride: l.priceOverride,
    qtyOverride: l.qtyOverride,
  }));

  const overrides = result.lines
    .filter((l) => l.priceOverride || l.qtyOverride)
    .map((l) => ({ sap: l.sap, descripcion: l.description, cantidadCalculada: l.calcQty, cantidad: l.qty, precioLista: l.listPrice, precio: l.unitPrice }));

  return prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.quoteLine.deleteMany({ where: { quoteId: existing.id } });
      const q = await tx.quote.update({ where: { id: existing.id }, data: { ...quoteData, lines: { create: lines } } });
      await writeAudit(
        {
          user,
          action: "editar",
          entity: "Cotizacion",
          entityId: q.id,
          summary: `Editó ${q.number}: total ${fmtMoney(Number(existing.total))} → ${fmtMoney(result.total)}${overrides.length ? ` · ${overrides.length} ajuste(s) manual(es)` : ""}`,
          before: { total: existing.total, tierKey: existing.tierKey, input: existing.input },
          after: { total: result.total, tierKey: tier.key, input: quoteData.input, ajustes: overrides },
        },
        tx,
      );
      return { id: q.id, number: q.number };
    }
    const number = await nextNumber(tx);
    const q = await tx.quote.create({ data: { ...quoteData, number, lines: { create: lines } } });
    await writeAudit(
      {
        user,
        action: "crear",
        entity: "Cotizacion",
        entityId: q.id,
        summary: `Creó ${number} para ${customer.company || customer.name} por ${fmtMoney(result.total)}${overrides.length ? ` · ${overrides.length} ajuste(s) manual(es)` : ""}`,
        after: { total: result.total, tierKey: tier.key, input: quoteData.input, ajustes: overrides },
      },
      tx,
    );
    return { id: q.id, number };
  });
}
