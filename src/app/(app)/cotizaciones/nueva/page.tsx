import type { Metadata } from "next";
import { QuoteBuilder } from "@/components/quote/quote-builder";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { loadBuilderData } from "@/lib/server/builder-data";

export const metadata: Metadata = { title: "Nueva cotización" };

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const user = await requireUser(can.createQuote);
  const data = await loadBuilderData(user);
  const settings = await getSettings();
  const sp = await searchParams;
  if ("error" in data) return <div className="card p-6 text-[14px] text-bad-ink">{data.error}</div>;
  const preset = sp.cliente ? data.customers.find((c) => c.id === sp.cliente) : undefined;
  return (
    <>
      <PageHeader eyebrow="Cotizaciones" title="Nueva cotización" subtitle="Elige el cliente y los cerramientos: los materiales y precios se calculan al instante." />
      <QuoteBuilder
        mode="new"
        {...data}
        initial={{
          customerId: preset?.id ?? "",
          ownerId: user.id,
          tierKey: preset?.tierKey ?? "PVS",
          projectSite: "",
          notes: settings.quote.defaultNotes,
          validityDays: settings.quote.validityDays,
          descLivianos: 0,
          descPesados: 0,
          globalDiscountPct: 0,
          segments: [],
          extras: [],
        }}
      />
    </>
  );
}
