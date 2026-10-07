"use server";

import type { QuoteStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { requireActionUser, ForbiddenError } from "@/lib/session";
import { saveQuote } from "@/lib/server/quotes";
import { sendQuoteEmail } from "@/lib/server/email";
import { fmtMoney } from "@/lib/format";
import { toActionError, type ActionResult } from "./result";

export async function saveQuoteAction(raw: unknown): Promise<ActionResult<{ id: string; number: string }>> {
  try {
    const user = await requireActionUser(can.createQuote);
    const data = await saveQuote(user, raw);
    revalidatePath("/");
    revalidatePath("/cotizaciones");
    return { ok: true, data };
  } catch (e) {
    return toActionError(e);
  }
}

async function loadOwned(id: string, userId: string, role: Parameters<typeof can.editAnyQuote>[0]) {
  const q = await prisma.quote.findUnique({ where: { id }, include: { customer: true } });
  if (!q) throw new ForbiddenError("La cotización no existe.");
  if (!can.editAnyQuote(role) && q.ownerId !== userId) throw new ForbiddenError("Solo puedes modificar tus propias cotizaciones.");
  return q;
}

const STATUS_LABEL: Record<QuoteStatus, string> = { BORRADOR: "Borrador", ENVIADA: "Enviada", ACEPTADA: "Aceptada", RECHAZADA: "Rechazada", VENCIDA: "Vencida" };

export async function setQuoteStatus(id: string, status: QuoteStatus, reason?: string): Promise<ActionResult> {
  try {
    const user = await requireActionUser(can.createQuote);
    const q = await loadOwned(id, user.id, user.role);
    if (q.status === status) return { ok: true, data: undefined };
    await prisma.quote.update({
      where: { id },
      data: {
        status,
        sentAt: status === "ENVIADA" && !q.sentAt ? new Date() : q.sentAt,
        decidedAt: status === "ACEPTADA" || status === "RECHAZADA" ? new Date() : null,
      },
    });
    await writeAudit({
      user,
      action: "estado",
      entity: "Cotizacion",
      entityId: id,
      summary: `Cambió ${q.number} de ${STATUS_LABEL[q.status]} a ${STATUS_LABEL[status]}${reason ? ` — ${reason}` : ""}`,
      before: { status: q.status },
      after: { status, reason },
    });
    revalidatePath(`/cotizaciones/${id}`);
    revalidatePath("/cotizaciones");
    revalidatePath("/");
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e);
  }
}

export async function duplicateQuote(id: string): Promise<ActionResult<{ id: string; number: string }>> {
  try {
    const user = await requireActionUser(can.createQuote);
    const q = await prisma.quote.findUnique({ where: { id } });
    if (!q) throw new ForbiddenError("La cotización no existe.");
    if (!can.seeAllQuotes(user.role) && q.ownerId !== user.id) throw new ForbiddenError();
    const input = q.input as { segments: unknown[]; extras: unknown[] };
    const res = await saveQuote(user, {
      customerId: q.customerId,
      tierKey: q.tierKey,
      projectSite: q.projectSite ?? undefined,
      notes: q.notes ?? undefined,
      validityDays: q.validityDays,
      descLivianos: Number(q.descLivianos),
      descPesados: Number(q.descPesados),
      globalDiscountPct: Number(q.globalDiscountPct),
      segments: input.segments,
      extras: input.extras,
    });
    await writeAudit({ user, action: "duplicar", entity: "Cotizacion", entityId: res.id, summary: `Duplicó ${q.number} como ${res.number} (con precios vigentes)` });
    revalidatePath("/cotizaciones");
    return { ok: true, data: res };
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteDraft(id: string): Promise<ActionResult> {
  try {
    const user = await requireActionUser(can.createQuote);
    const q = await loadOwned(id, user.id, user.role);
    if (q.status !== "BORRADOR") throw new ForbiddenError("Solo se pueden eliminar borradores.");
    await prisma.quote.delete({ where: { id } });
    await writeAudit({ user, action: "eliminar", entity: "Cotizacion", entityId: id, summary: `Eliminó el borrador ${q.number} (${q.customer.company || q.customer.name}, total ${fmtMoney(Number(q.total))})` });
    revalidatePath("/cotizaciones");
    revalidatePath("/");
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e);
  }
}

export async function emailQuote(id: string, to: string, cc: string, subject: string, body: string): Promise<ActionResult<{ status: string }>> {
  try {
    const user = await requireActionUser(can.createQuote);
    await loadOwned(id, user.id, user.role);
    const res = await sendQuoteEmail({ quoteId: id, user, to, cc, subject, body });
    revalidatePath(`/cotizaciones/${id}`);
    revalidatePath("/cotizaciones");
    return { ok: true, data: res };
  } catch (e) {
    return toActionError(e);
  }
}
