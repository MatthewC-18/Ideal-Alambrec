import type { Prisma, QuoteStatus } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus, SlidersHorizontal } from "lucide-react";
import { FilterBar, Pagination } from "@/components/lists/filter-bar";
import { Badge, STATUS_META, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/db";
import { fmtDate, fmtMoney } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Cotizaciones" };
const PER_PAGE = 25;

export default async function QuotesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const all = can.seeAllQuotes(user.role);
  const page = Math.max(1, Number(sp.pagina) || 1);

  const where: Prisma.QuoteWhereInput = { AND: [] };
  const and = where.AND as Prisma.QuoteWhereInput[];
  if (!all) and.push({ ownerId: user.id });
  else if (sp.asesor) and.push({ ownerId: sp.asesor });
  if (sp.estado && sp.estado in STATUS_META) and.push({ status: sp.estado as QuoteStatus });
  if (sp.ajustes) and.push({ hasOverrides: true });
  if (sp.desde) and.push({ createdAt: { gte: new Date(`${sp.desde}T00:00:00-05:00`) } });
  if (sp.hasta) and.push({ createdAt: { lte: new Date(`${sp.hasta}T23:59:59-05:00`) } });
  if (sp.q) {
    const q = sp.q.trim();
    and.push({
      OR: [
        { number: { contains: q, mode: "insensitive" } },
        { projectSite: { contains: q, mode: "insensitive" } },
        { customer: { OR: [{ name: { contains: q, mode: "insensitive" } }, { company: { contains: q, mode: "insensitive" } }, { taxId: { contains: q } }] } },
      ],
    });
  }

  const [total, rows, sum, advisors] = await Promise.all([
    prisma.quote.count({ where }),
    prisma.quote.findMany({ where, include: { customer: true, owner: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.quote.aggregate({ where, _sum: { total: true } }),
    all ? prisma.user.findMany({ where: { quotes: { some: {} } }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title="Cotizaciones"
        subtitle={all ? "Todas las cotizaciones del equipo comercial." : "Tus cotizaciones."}
        actions={
          can.createQuote(user.role) && (
            <ButtonLink href="/cotizaciones/nueva">
              <Plus className="h-4 w-4" /> Nueva cotización
            </ButtonLink>
          )
        }
      />
      <FilterBar
        fields={[
          { type: "search", name: "q", placeholder: "Buscar por número, cliente, RUC u obra…" },
          { type: "select", name: "estado", label: "Estado", options: Object.entries(STATUS_META).map(([k, v]) => ({ value: k, label: v.label })) },
          ...(all ? [{ type: "select" as const, name: "asesor", label: "Asesor", options: advisors.map((a) => ({ value: a.id, label: a.name })) }] : []),
          { type: "date", name: "desde", label: "Desde" },
          { type: "date", name: "hasta", label: "Hasta" },
          { type: "toggle", name: "ajustes", label: "Solo con ajustes manuales" },
        ]}
      />
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={<FileText className="h-6 w-6" />} title="No hay cotizaciones con estos filtros" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="th">Número</th>
                    <th className="th">Cliente</th>
                    {all && <th className="th">Asesor</th>}
                    <th className="th">Estado</th>
                    <th className="th">Fecha</th>
                    <th className="th text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((q) => (
                    <tr key={q.id} className="group hover:bg-brand-50/40">
                      <td className="td">
                        <Link href={`/cotizaciones/${q.id}`} className="font-medium text-brand-700 group-hover:underline">
                          {q.number}
                        </Link>
                        <div className="mt-0.5 flex gap-1">
                          {q.hasOverrides && (
                            <Badge tone="warn" className="text-[11px]">
                              <SlidersHorizontal className="h-3 w-3" /> ajustes
                            </Badge>
                          )}
                          {q.isDemo && <Badge tone="cyan" className="text-[11px]">demo</Badge>}
                        </div>
                      </td>
                      <td className="td">
                        <div className="max-w-[280px] truncate">{q.customer.company || q.customer.name}</div>
                        <div className="max-w-[280px] truncate text-[12px] text-muted">{q.projectSite ?? q.customer.city ?? ""}</div>
                      </td>
                      {all && <td className="td text-[13px] text-ink-2">{q.owner.name}</td>}
                      <td className="td"><StatusBadge status={q.status} /></td>
                      <td className="td text-[13px] whitespace-nowrap text-ink-2">{fmtDate(q.createdAt)}</td>
                      <td className="td text-right font-medium tabular">{fmtMoney(Number(q.total))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={all ? 5 : 4} className="px-3 py-3 text-right text-[13px] text-ink-2">Total filtrado</td>
                    <td className="px-3 py-3 text-right font-semibold tabular">{fmtMoney(Number(sum._sum.total ?? 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} total={total} />
          </>
        )}
      </div>
    </>
  );
}
