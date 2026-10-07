import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PriceListTools } from "@/components/config/price-list-tools";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Listas de precios" };

export default async function PriceListsPage() {
  await requireUser(can.managePrices);
  const lists = await prisma.priceList.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { items: true, quotes: true } } } });
  const users = new Map((await prisma.user.findMany({ select: { id: true, name: true } })).map((u) => [u.id, u.name]));
  const active = lists.find((l) => l.status === "VIGENTE");
  return (
    <>
      <Link href="/configuracion" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Configuración
      </Link>
      <PageHeader
        title="Listas de precios"
        subtitle="Solo una lista está vigente a la vez. Las cotizaciones guardan la lista con la que se hicieron, así que publicar una nueva no altera cotizaciones anteriores."
        actions={<PriceListTools activeId={active?.id ?? null} />}
      />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="th">Lista</th>
              <th className="th">Estado</th>
              <th className="th text-right">Productos</th>
              <th className="th text-right">Cotizaciones</th>
              <th className="th">Origen</th>
              <th className="th">Publicada</th>
            </tr>
          </thead>
          <tbody>
            {lists.map((l) => (
              <tr key={l.id} className="hover:bg-brand-50/40">
                <td className="td">
                  <Link href={`/configuracion/precios/${l.id}`} className="font-medium text-brand-700 hover:underline">
                    {l.name}
                  </Link>
                  <div className="text-[12px] text-muted">Creada por {users.get(l.createdById ?? "") ?? "—"}</div>
                </td>
                <td className="td">
                  <Badge tone={l.status === "VIGENTE" ? "good" : l.status === "BORRADOR" ? "warn" : "neutral"}>{l.status === "VIGENTE" ? "Vigente" : l.status === "BORRADOR" ? "Borrador" : "Archivada"}</Badge>
                </td>
                <td className="td text-right tabular">{l._count.items}</td>
                <td className="td text-right tabular">{l._count.quotes}</td>
                <td className="td max-w-[260px] truncate text-[13px] text-ink-2">{l.source}</td>
                <td className="td text-[13px] text-ink-2">{l.publishedAt ? `${fmtDateTime(l.publishedAt)} · ${users.get(l.publishedById ?? "") ?? ""}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
