import "server-only";
import type { User } from "@prisma/client";
import nodemailer from "nodemailer";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { fmtMoney } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { ForbiddenError } from "@/lib/session";
import { renderQuotePdf } from "./pdf";

export const smtpConfigured = () => Boolean(process.env.SMTP_HOST);

const emailList = z
  .string()
  .transform((s) => s.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean))
  .pipe(z.array(z.string().email("Hay un correo inválido")).max(10));

export function fillTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

export async function emailDefaults(quoteId: string) {
  const [q, settings] = await Promise.all([
    prisma.quote.findUniqueOrThrow({ where: { id: quoteId }, include: { customer: true, owner: true } }),
    getSettings(),
  ]);
  const vars = {
    numero: q.number,
    cliente: q.customer.name,
    empresa: q.customer.company ?? q.customer.name,
    total: fmtMoney(Number(q.total)),
    validez: String(q.validityDays),
    asesor: q.owner.name,
    telefono_asesor: q.owner.phone ?? "",
    correo_asesor: q.owner.email,
  };
  return { to: q.customer.email ?? "", subject: fillTemplate(settings.email.subject, vars), body: fillTemplate(settings.email.body, vars) };
}

export async function sendQuoteEmail(args: { quoteId: string; user: User; to: string; cc: string; subject: string; body: string }) {
  const to = emailList.parse(args.to);
  if (to.length === 0) throw new ForbiddenError("Ingresa al menos un destinatario.");
  const cc = emailList.parse(args.cc ?? "");
  const subject = args.subject.trim().slice(0, 200) || "Cotización Ideal Alambrec";
  const body = args.body.slice(0, 10000);

  const pdf = await renderQuotePdf(args.quoteId);
  if (!pdf) throw new ForbiddenError("La cotización no existe.");

  let status = "simulado";
  let messageId: string | null = null;
  let error: string | null = null;
  if (smtpConfigured()) {
    try {
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      });
      const info = await transport.sendMail({
        from: process.env.SMTP_FROM,
        to,
        cc: cc.length ? cc : undefined,
        replyTo: args.user.email,
        subject,
        text: body,
        attachments: [{ filename: `Cotizacion-${pdf.number}.pdf`, content: pdf.buffer, contentType: "application/pdf" }],
      });
      status = "enviado";
      messageId = info.messageId ?? null;
    } catch (e) {
      status = "error";
      error = (e as Error).message.slice(0, 500);
    }
  }

  const q = await prisma.quote.findUniqueOrThrow({ where: { id: args.quoteId } });
  await prisma.emailLog.create({
    data: { quoteId: q.id, to: to.join(", "), cc: cc.join(", ") || null, subject, body, status, error, messageId, sentById: args.user.id },
  });
  if (status !== "error" && q.status === "BORRADOR") {
    await prisma.quote.update({ where: { id: q.id }, data: { status: "ENVIADA", sentAt: new Date() } });
  }
  await writeAudit({
    user: args.user,
    action: "enviar",
    entity: "Cotizacion",
    entityId: q.id,
    summary:
      status === "enviado"
        ? `Envió ${q.number} por correo a ${to.join(", ")}`
        : status === "simulado"
          ? `Registró el envío de ${q.number} a ${to.join(", ")} (modo simulado: SMTP no configurado)`
          : `Falló el envío de ${q.number} a ${to.join(", ")}: ${error}`,
  });
  if (status === "error") throw new ForbiddenError(`El servidor de correo rechazó el envío: ${error}`);
  return { status };
}
