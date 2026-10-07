import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { writeAudit } from "@/lib/audit";
import { auditWhere } from "@/lib/server/audit-query";

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !can.seeAudit(user.role)) return new NextResponse("No autorizado", { status: 403 });
  const sp = Object.fromEntries(new URL(req.url).searchParams.entries());
  const rows = await prisma.auditLog.findMany({ where: auditWhere(sp), orderBy: { at: "desc" }, take: 50000 });
  const header = ["fecha_utc", "usuario", "modulo", "accion", "registro", "descripcion", "ip"];
  const body = rows.map((r) => [r.at.toISOString(), r.userEmail, r.entity, r.action, r.entityId, r.summary, r.ip].map(cell).join(","));
  await writeAudit({ user, action: "descargar", entity: "Configuracion", entityId: "auditoria", summary: `Exportó ${rows.length} eventos de auditoría a CSV` });
  return new NextResponse("﻿" + [header.join(","), ...body].join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="auditoria-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
}
