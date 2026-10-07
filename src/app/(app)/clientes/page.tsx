import type { Prisma } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2, Users } from "lucide-react";
import { EditCustomerButton, NewCustomerButton } from "@/components/lists/customer-buttons";
import { FilterBar, Pagination } from "@/components/lists/filter-bar";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/db";
import { fmtDate, fmtMoney } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { getActivePriceList } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Clientes" };
const PER_PAGE = 30;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const list = await getActivePriceList();
  const tiers = (list?.tiers ?? []).map((t) => ({ key: t.key, label: t.label }));

  const where: Prisma.CustomerWhereInput = {};
  if (sp.q) {
    const q = sp.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { taxId: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (sp.categoria) where.tierKey = sp.categoria;

  const [total, rows] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { quotes: { select: { total: true, status: true, createdAt: true, ownerId: true }, orderBy: { createdAt: "desc" } } },
    }),
  ]);
  const mineOnly = !can.seeAllQuotes(user.role);

  return (
    <>
      <PageHeader title="Clientes" subtitle="Base de clientes compartida por todo el equipo." actions={can.createQuote(user.role) && <NewCustomerButton tiers={tiers} />} />
      <FilterBar
        fields={[
          { type: "search", name: "q", placeholder: "Buscar por empresa, contacto, ciudad, RUC o correo…" },
          { type: "select", name: "categoria", label: "Categoría", options: tiers.map((t) => ({ value: t.key, label: t.label })) },
        ]}
      />
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={<Users className="h-6 w-6" />} title="No hay clientes con estos filtros" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="th">Cliente</th>
                    <th className="th">Contacto</th>
                    <th className="th">Categoría</th>
                    <th className="th text-right">Cotizaciones</th>
                    <th className="th text-right">Aceptado</th>
                    <th className="th">Última</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => {
                    const qs = mineOnly ? c.quotes.filter((q) => q.ownerId === user.id) : c.quotes;
                    const won = qs.filter((q) => q.status === "ACEPTADA").reduce((s, q) => s + Number(q.total), 0);
                    return (
                      <tr key={c.id} className="hover:bg-brand-50/40">
                        <td className="td">
                          <Link href={`/cotizaciones?q=${encodeURIComponent(c.company || c.name)}`} className="font-medium hover:underline">
                            {c.company || c.name}
                          </Link>
                          <div className="text-[12px] text-muted">{[c.city, c.taxId].filter(Boolean).join(" · ")}</div>
                        </td>
                        <td className="td text-[13px] text-ink-2">
                          <div>{c.name}</div>
                          <div className="text-[12px] text-muted">{c.email}</div>
                        </td>
                        <td className="td"><Badge tone="brand">{c.tierKey}</Badge></td>
                        <td className="td text-right tabular">{qs.length}</td>
                        <td className="td text-right tabular">{won ? fmtMoney(won) : "—"}</td>
                        <td className="td text-[13px] text-ink-2">{qs[0] ? fmtDate(qs[0].createdAt) : "—"}</td>
                        <td className="td text-right whitespace-nowrap">
                          {can.createQuote(user.role) && (
                            <>
                              <EditCustomerButton tiers={tiers} customer={{ id: c.id, name: c.name, company: c.company, city: c.city, tierKey: c.tierKey, email: c.email, phone: c.phone, taxId: c.taxId, address: c.address, notes: c.notes }} />
                              <Link href={`/cotizaciones/nueva?cliente=${c.id}`} className={buttonClass("secondary", "sm", "ml-1")}>
                                <FilePlus2 className="h-3.5 w-3.5" /> Cotizar
                              </Link>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} total={total} />
          </>
        )}
      </div>
    </>
  );
}
