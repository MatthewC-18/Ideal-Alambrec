import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PriceListEditor } from "@/components/config/price-list-editor";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Lista de precios" };

export default async function PriceListDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(can.managePrices);
  const { id } = await params;
  const list = await prisma.priceList.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, tiers: { orderBy: { sortOrder: "asc" } } },
  });
  if (!list) notFound();
  const compare =
    list.status === "VIGENTE"
      ? await prisma.priceList.findFirst({ where: { status: "ARCHIVADA", publishedAt: { lt: list.publishedAt ?? new Date() } }, orderBy: { publishedAt: "desc" }, include: { items: true, tiers: true } })
      : await prisma.priceList.findFirst({ where: { status: "VIGENTE" }, include: { items: true, tiers: true } });
  const prev = new Map(compare?.items.map((i) => [i.productId, Number(i.pvs)]) ?? []);
  const prevTier = new Map(compare?.tiers.map((t) => [t.key, Number(t.discountPct)]) ?? []);
  const items = list.items
    .sort((a, b) => a.product.sortOrder - b.product.sortOrder)
    .map((i) => ({ itemId: i.id, sap: i.product.sap, name: i.product.name, family: i.product.family, pvs: Number(i.pvs), previous: compare ? prev.get(i.productId) ?? null : null }));
  const stamp = items.reduce((s, i) => s + i.pvs, 0).toFixed(6) + list.tiers.map((t) => t.discountPct.toString()).join();

  return (
    <>
      <Link href="/configuracion/precios" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Listas de precios
      </Link>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {list.name}
            <Badge tone={list.status === "VIGENTE" ? "good" : list.status === "BORRADOR" ? "warn" : "neutral"}>{list.status === "VIGENTE" ? "Vigente" : list.status === "BORRADOR" ? "Borrador" : "Archivada"}</Badge>
          </span>
        }
        subtitle={`${list.source ?? ""}${list.publishedAt ? ` · publicada ${fmtDateTime(list.publishedAt)}` : ""}${list.status === "BORRADOR" ? " · Los cambios no afectan a nadie hasta que publiques." : ""}`}
      />
      <PriceListEditor
        key={stamp}
        id={list.id}
        name={list.name}
        notes={list.notes ?? ""}
        editable={list.status === "BORRADOR"}
        items={items}
        tiers={list.tiers.map((t) => ({ key: t.key, label: t.label, discountPct: Number(t.discountPct), previous: compare ? prevTier.get(t.key) ?? null : null }))}
        compareName={compare?.name ?? null}
      />
    </>
  );
}
