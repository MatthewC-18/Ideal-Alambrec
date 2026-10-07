import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { QuoteBuilder } from "@/components/quote/quote-builder";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/db";
import type { ExtraLineInput, SegmentInput } from "@/lib/engine/types";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { loadBuilderData } from "@/lib/server/builder-data";

export const metadata: Metadata = { title: "Editar cotización" };

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(can.createQuote);
  const { id } = await params;
  const q = await prisma.quote.findUnique({ where: { id } });
  if (!q) notFound();
  if (!can.editAnyQuote(user.role) && q.ownerId !== user.id) redirect(`/cotizaciones/${id}`);
  if (!["BORRADOR", "ENVIADA"].includes(q.status)) redirect(`/cotizaciones/${id}`);
  const data = await loadBuilderData(user, q);
  if ("error" in data) return <div className="card p-6 text-[14px] text-bad-ink">{data.error}</div>;
  const input = q.input as { segments: SegmentInput[]; extras: ExtraLineInput[] };
  return (
    <>
      <PageHeader eyebrow={`Cotización ${q.number}`} title="Editar cotización" />
      <QuoteBuilder
        mode="edit"
        quoteId={q.id}
        quoteNumber={q.number}
        {...data}
        initial={{
          customerId: q.customerId,
          ownerId: q.ownerId,
          tierKey: q.tierKey,
          projectSite: q.projectSite ?? "",
          notes: q.notes ?? "",
          validityDays: q.validityDays,
          descLivianos: Number(q.descLivianos),
          descPesados: Number(q.descPesados),
          globalDiscountPct: Number(q.globalDiscountPct),
          segments: input.segments,
          extras: input.extras,
        }}
      />
    </>
  );
}
