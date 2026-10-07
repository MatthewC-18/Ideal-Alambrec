import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, History, Mail, MapPin, PencilRuler, Scale, UserRound } from "lucide-react";
import { QuoteActions } from "@/components/quote/quote-actions";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/db";
import { segmentTitle } from "@/lib/engine/engine";
import { ruleSetSchema, type SegmentInput } from "@/lib/engine/types";
import { fmtDate, fmtDateTime, fmtMoney, fmtNumber, fmtPct, fmtQty } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { emailDefaults, smtpConfigured } from "@/lib/server/email";
import { cn } from "@/lib/cn";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const q = await prisma.quote.findUnique({ where: { id: (await params).id }, select: { number: true } });
  return { title: q?.number ?? "Cotización" };
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const q = await prisma.quote.findUnique({
    where: { id },
    include: { customer: true, owner: true, priceList: true, ruleSet: true, lines: { orderBy: { sortOrder: "asc" } }, emails: { orderBy: { createdAt: "desc" } } },
  });
  if (!q || (!can.seeAllQuotes(user.role) && q.ownerId !== user.id)) notFound();

  const history = await prisma.auditLog.findMany({ where: { entity: "Cotizacion", entityId: q.id }, orderBy: { at: "desc" }, take: 50 });
  const isMine = q.ownerId === user.id;
  const canChange = can.createQuote(user.role) && (isMine || can.editAnyQuote(user.role));
  const canEdit = canChange && ["BORRADOR", "ENVIADA"].includes(q.status);
  const rules = ruleSetSchema.safeParse(q.ruleSet.data);
  const input = q.input as { segments: SegmentInput[] };
  const titles = input.segments.map((s) => {
    const sys = rules.success ? rules.data.systems.find((x) => x.key === s.systemKey) : undefined;
    return s.label?.trim() || (sys ? segmentTitle(sys, s) : s.systemKey);
  });
  const extras = q.lines.filter((l) => l.section === "extras");
  const email = await emailDefaults(q.id);
  const validUntil = new Date(q.createdAt.getTime() + q.validityDays * 86400000);
  const expired = q.status === "ENVIADA" && validUntil < new Date();

  const LinesTable = ({ lines }: { lines: typeof q.lines }) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="th">Código</th>
            <th className="th">Descripción</th>
            <th className="th text-right">Cant.</th>
            <th className="th text-right">P. unit.</th>
            <th className="th text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className={cn((l.priceOverride || l.qtyOverride) && "bg-warn-bg/40")}>
              <td className="td w-[90px] text-[12px] text-muted tabular">{l.sap ?? "Libre"}</td>
              <td className="td text-[13.5px]">
                {l.description}
                {l.section === "adicionales" && <span className="ml-2 text-[11px] text-muted">adicional</span>}
                {(l.priceOverride || l.qtyOverride) && (
                  <div className="text-[11.5px] text-warn-ink">
                    Ajuste manual{l.priceOverride && l.listPrice ? ` · lista ${fmtMoney(Number(l.listPrice))}` : ""}
                  </div>
                )}
              </td>
              <td className="td w-[80px] text-right tabular">{fmtQty(Number(l.qty))}</td>
              <td className="td w-[110px] text-right tabular">{fmtMoney(Number(l.unitPrice))}</td>
              <td className="td w-[120px] text-right font-medium tabular">{fmtMoney(Number(l.total))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <Link href="/cotizaciones" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Cotizaciones
      </Link>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {q.number} <StatusBadge status={q.status} />
            {q.isDemo && <Badge tone="cyan">Demo</Badge>}
          </span>
        }
        subtitle={`${q.customer.company || q.customer.name} · creada el ${fmtDate(q.createdAt)} por ${q.owner.name}`}
        actions={<QuoteActions id={q.id} number={q.number} status={q.status} canEdit={canEdit} canChange={canChange} email={email} smtp={smtpConfigured()} />}
      />

      {expired && (
        <div className="mb-4 rounded-xl border border-warn/40 bg-warn-bg px-4 py-3 text-[13px] text-warn-ink">
          La validez de esta oferta terminó el {fmtDate(validUntil)}. Márcala como vencida o duplícala con los precios vigentes.
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card p-4">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold tracking-wide text-muted uppercase">
                <Building2 className="h-4 w-4" /> Cliente
              </div>
              <div className="font-medium">{q.customer.company || q.customer.name}</div>
              <div className="mt-1 space-y-0.5 text-[13px] break-words text-ink-2">
                {q.customer.company && <div>{q.customer.name}</div>}
                {q.customer.email && <div>{q.customer.email}</div>}
                {q.customer.phone && <div>{q.customer.phone}</div>}
              </div>
            </div>
            <div className="card p-4">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold tracking-wide text-muted uppercase">
                <MapPin className="h-4 w-4" /> Proyecto
              </div>
              <div className="font-medium">{q.projectSite || "Sin sitio de obra"}</div>
              <div className="mt-1 space-y-0.5 text-[13px] text-ink-2">
                <div>Categoría: {q.tierKey}{Number(q.tierPct) > 0 && ` (−${fmtPct(Number(q.tierPct), 2)})`}</div>
                <div>Válida hasta {fmtDate(validUntil)}</div>
                <div className="flex items-center gap-1">
                  <Scale className="h-3.5 w-3.5" /> {fmtNumber(Number(q.weightKg), 1)} kg aprox.
                </div>
              </div>
            </div>
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-br from-navy to-brand-600 p-4 text-white">
                <div className="text-[12px] text-white/75">Total con IVA</div>
                <div className="text-[28px] leading-tight font-semibold">{fmtMoney(Number(q.total))}</div>
              </div>
              <dl className="space-y-1 p-4 text-[13px]">
                <div className="flex justify-between"><dt className="text-ink-2">Subtotal</dt><dd className="tabular">{fmtMoney(Number(q.subtotal))}</dd></div>
                {Number(q.discountTotal) > 0 && (
                  <div className="flex justify-between"><dt className="text-ink-2">Descuento {fmtPct(Number(q.globalDiscountPct))}</dt><dd className="tabular">−{fmtMoney(Number(q.discountTotal))}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-ink-2">IVA {fmtPct(Number(q.ivaRate), 0)}</dt><dd className="tabular">{fmtMoney(Number(q.iva))}</dd></div>
              </dl>
            </div>
          </div>

          {titles.map((t, i) => (
            <section key={i} className="card p-4 sm:p-5">
              <h2 className="mb-3 flex items-start gap-2 text-[15px] font-semibold">
                <PencilRuler className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {t}
              </h2>
              <LinesTable lines={q.lines.filter((l) => l.segmentIndex === i)} />
            </section>
          ))}
          {extras.length > 0 && (
            <section className="card p-4 sm:p-5">
              <h2 className="mb-3 text-[15px] font-semibold">Puertas, portones y otros</h2>
              <LinesTable lines={extras} />
            </section>
          )}
          {q.notes && (
            <section className="card p-4 sm:p-5">
              <h2 className="mb-2 text-[15px] font-semibold">Observaciones</h2>
              <p className="text-[14px] whitespace-pre-wrap text-ink-2">{q.notes}</p>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <section className="card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
              <History className="h-4 w-4 text-brand-600" /> Historial
            </h2>
            {history.length === 0 ? (
              <p className="text-[13px] text-muted">{q.isDemo ? "Cotización de demostración generada automáticamente." : "Sin eventos registrados."}</p>
            ) : (
              <ol className="relative space-y-4 border-l border-line pl-4">
                {history.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full bg-brand-600 ring-4 ring-white" />
                    <div className="text-[13px]">{h.summary}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
                      <UserRound className="h-3 w-3" /> {h.userEmail ?? "sistema"} · {fmtDateTime(h.at)}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section className="card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
              <Mail className="h-4 w-4 text-brand-600" /> Envíos
            </h2>
            {q.emails.length === 0 ? (
              <p className="text-[13px] text-muted">Aún no se ha enviado al cliente.</p>
            ) : (
              <ul className="space-y-3">
                {q.emails.map((e) => (
                  <li key={e.id} className="text-[13px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{e.to}</span>
                      <Badge tone={e.status === "enviado" ? "good" : e.status === "simulado" ? "warn" : "bad"}>{e.status}</Badge>
                    </div>
                    <div className="text-[12px] text-muted">{fmtDateTime(e.createdAt)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="px-1 text-[12px] text-muted">
            {q.priceList.name} · reglas de cálculo v{q.ruleSet.version}
          </p>
        </aside>
      </div>
    </>
  );
}
