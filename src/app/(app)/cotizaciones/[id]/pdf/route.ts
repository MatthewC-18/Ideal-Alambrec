import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { renderQuotePdf } from "@/lib/server/pdf";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  const { id } = await params;
  const q = await prisma.quote.findUnique({ where: { id }, select: { ownerId: true, number: true } });
  if (!q || (!can.seeAllQuotes(user.role) && q.ownerId !== user.id)) return new NextResponse("No encontrado", { status: 404 });
  const pdf = await renderQuotePdf(id);
  if (!pdf) return new NextResponse("No encontrado", { status: 404 });
  const download = new URL(req.url).searchParams.has("descargar");
  if (download) await writeAudit({ user, action: "descargar", entity: "Cotizacion", entityId: id, summary: `Descargó el PDF de ${q.number}` });
  return new NextResponse(new Uint8Array(pdf.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="Cotizacion-${pdf.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
