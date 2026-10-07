import type { Metadata } from "next";
import Link from "next/link";
import { Download, ShieldCheck } from "lucide-react";
import { FilterBar, Pagination } from "@/components/lists/filter-bar";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { ACTION_LABEL, ENTITY_LABEL, auditWhere } from "@/lib/server/audit-query";

export const metadata: Metadata = { title: "Auditoría" };
const PER_PAGE = 40;

function Json({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-muted">—</span>;
  return <pre className="max-h-64 overflow-auto rounded-lg bg-page p-2 text-[11.5px] leading-snug whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>;
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser(can.seeAudit);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const where = auditWhere(sp);
  const [total, rows, users] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { at: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.user.findMany({ where: { audits: { some: {} } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "pagina") as [string, string][]).toString();

  return (
    <>
      <PageHeader
        title="Auditoría"
        subtitle="Registro inalterable de quién hizo qué y cuándo: cotizaciones, precios, reglas, usuarios e inicios de sesión. Ni los administradores pueden editarlo o borrarlo."
        actions={
          <a href={`/auditoria/exportar?${qs}`} className={buttonClass("outline")}>
            <Download className="h-4 w-4" /> Exportar CSV
          </a>
        }
      />
      <FilterBar
        fields={[
          { type: "search", name: "q", placeholder: "Buscar en la descripción o correo…" },
          { type: "select", name: "entidad", label: "Módulo", options: Object.entries(ENTITY_LABEL).map(([value, label]) => ({ value, label })) },
          { type: "select", name: "accion", label: "Acción", options: Object.entries(ACTION_LABEL).map(([value, label]) => ({ value, label })) },
          { type: "select", name: "usuario", label: "Usuario", options: users.map((u) => ({ value: u.id, label: u.name })) },
          { type: "date", name: "desde", label: "Desde" },
          { type: "date", name: "hasta", label: "Hasta" },
        ]}
      />
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="Sin eventos para estos filtros" />
        ) : (
          <>
            <ul className="divide-y divide-line">
              {rows.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="brand">{ENTITY_LABEL[r.entity] ?? r.entity}</Badge>
                          <Badge>{ACTION_LABEL[r.action] ?? r.action}</Badge>
                          {r.entity === "Cotizacion" && r.entityId && r.action !== "eliminar" && (
                            <Link href={`/cotizaciones/${r.entityId}`} className="text-[12px] text-brand-600 hover:underline">
                              ver cotización
                            </Link>
                          )}
                        </div>
                        <div className="mt-1 text-[14px]">{r.summary}</div>
                      </div>
                      <div className="text-right text-[12.5px] text-muted">
                        <div className="font-medium text-ink-2">{r.userEmail ?? "sistema"}</div>
                        <div>{fmtDateTime(r.at)}</div>
                        {r.ip && <div>IP {r.ip}</div>}
                      </div>
                    </summary>
                    {(r.before !== null || r.after !== null) && (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="mb-1 text-[12px] font-semibold text-muted uppercase">Antes</div>
                          <Json value={r.before} />
                        </div>
                        <div>
                          <div className="mb-1 text-[12px] font-semibold text-muted uppercase">Después</div>
                          <Json value={r.after} />
                        </div>
                      </div>
                    )}
                  </details>
                </li>
              ))}
            </ul>
            <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} total={total} />
          </>
        )}
      </div>
    </>
  );
}
