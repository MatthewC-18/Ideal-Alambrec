import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Clock3, FileText, Plus } from "lucide-react";
import { MonthlyChart, type MonthPoint } from "@/components/dashboard/charts";
import { HBarList } from "@/components/dashboard/hbar";
import { StatusBadge, STATUS_META } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/db";
import { fmtCompactMoney, fmtDate, fmtMoney, fmtPct } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { getActiveRuleSet } from "@/lib/server/catalog";
import { cn } from "@/lib/cn";

const TZ = "America/Guayaquil";
const ymOf = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }).format(d);
const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const s = new Intl.DateTimeFormat("es-EC", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 15)));
  return s.replace(".", "");
};
function shiftYm(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 15));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function Kpi({ label, value, delta, hint }: { label: string; value: string; delta?: { pct: number; vs: string } | null; hint?: string }) {
  const up = delta && delta.pct >= 0;
  return (
    <div className="card p-4 sm:p-5">
      <div className="text-[13px] text-ink-2">{label}</div>
      <div className="mt-1 text-[21px] leading-tight font-semibold tracking-tight sm:text-[26px]">{value}</div>
      {delta ? (
        <div className={cn("mt-1 flex items-center gap-1 text-[12.5px]", up ? "text-good-ink" : "text-bad-ink")}>
          {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {fmtPct(Math.abs(delta.pct), 0)} {up ? "más" : "menos"} que {delta.vs}
        </div>
      ) : (
        hint && <div className="mt-1 text-[12.5px] text-muted">{hint}</div>
      )}
    </div>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const team = can.seeAllQuotes(user.role);
  const scope: Prisma.QuoteWhereInput = team ? {} : { ownerId: user.id };
  const now = new Date();
  const thisYm = ymOf(now);
  const firstYm = shiftYm(thisYm, -11);
  const since = new Date(`${firstYm}-01T00:00:00-05:00`);

  const [quotes, recent, followUps, rules] = await Promise.all([
    prisma.quote.findMany({
      where: { ...scope, createdAt: { gte: since } },
      select: { id: true, total: true, status: true, createdAt: true, decidedAt: true, ownerId: true, input: true, owner: { select: { name: true } }, lines: { select: { segmentIndex: true, total: true } } },
    }),
    prisma.quote.findMany({ where: scope, orderBy: { createdAt: "desc" }, take: 6, include: { customer: true } }),
    prisma.quote.findMany({
      where: { ...scope, status: "ENVIADA", sentAt: { lte: new Date(now.getTime() - 7 * 86400000) } },
      orderBy: { sentAt: "asc" },
      take: 5,
      include: { customer: true },
    }),
    getActiveRuleSet(),
  ]);

  const months: MonthPoint[] = Array.from({ length: 12 }, (_, i) => {
    const ym = shiftYm(firstYm, i);
    return { month: ym, label: monthLabel(ym), cotizado: 0, aceptado: 0, count: 0 };
  });
  const byMonth = new Map(months.map((m) => [m.month, m]));
  for (const q of quotes) {
    const m = byMonth.get(ymOf(q.createdAt));
    if (m) {
      m.cotizado += Number(q.total);
      m.count++;
    }
    if (q.status === "ACEPTADA" && q.decidedAt) {
      const d = byMonth.get(ymOf(q.decidedAt));
      if (d) d.aceptado += Number(q.total);
    }
  }
  for (const m of months) {
    m.cotizado = Math.round(m.cotizado * 100) / 100;
    m.aceptado = Math.round(m.aceptado * 100) / 100;
  }
  const cur = byMonth.get(thisYm)!;
  const dayOfMonth = Number(new Intl.DateTimeFormat("en", { day: "numeric", timeZone: TZ }).format(now));
  const prevYm = shiftYm(thisYm, -1);
  const prevToDate = quotes.filter(
    (q) => ymOf(q.createdAt) === prevYm && Number(new Intl.DateTimeFormat("en", { day: "numeric", timeZone: TZ }).format(q.createdAt)) <= dayOfMonth,
  );
  const prev = { cotizado: prevToDate.reduce((s, q) => s + Number(q.total), 0), count: prevToDate.length };
  const deltaOf = (a: number, b: number) => (b > 0 ? { pct: a / b - 1, vs: "el mismo período del mes pasado" } : null);

  const d90 = new Date(now.getTime() - 90 * 86400000);
  const closed90 = quotes.filter((q) => q.createdAt >= d90 && ["ACEPTADA", "RECHAZADA", "VENCIDA"].includes(q.status));
  const won90 = closed90.filter((q) => q.status === "ACEPTADA");
  const closeRate = closed90.length ? won90.length / closed90.length : 0;
  const avgTicket = cur.count ? cur.cotizado / cur.count : quotes.length ? quotes.reduce((s, q) => s + Number(q.total), 0) / quotes.length : 0;

  const systemNames = new Map((rules?.rules.systems ?? []).map((s) => [s.key, s.name.replace("CercasPro ", "")]));
  const bySystem = new Map<string, number>();
  for (const q of quotes) {
    const segs = (q.input as { segments?: { systemKey: string }[] }).segments ?? [];
    for (const l of q.lines) {
      if (l.segmentIndex === null) continue;
      const key = segs[l.segmentIndex]?.systemKey;
      if (key) bySystem.set(key, (bySystem.get(key) ?? 0) + Number(l.total));
    }
  }
  const systemItems = [...bySystem].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: systemNames.get(k) ?? k, value: v }));

  const pipeline = (Object.keys(STATUS_META) as (keyof typeof STATUS_META)[]).map((s) => {
    const list = quotes.filter((q) => q.status === s);
    return { status: s, count: list.length, amount: list.reduce((acc, q) => acc + Number(q.total), 0) };
  });

  const ranking = team
    ? [...quotes.filter((q) => q.createdAt >= d90).reduce((map, q) => {
        const r = map.get(q.ownerId) ?? { label: q.owner.name, value: 0, won: 0, closed: 0 };
        r.value += Number(q.total);
        if (["ACEPTADA", "RECHAZADA", "VENCIDA"].includes(q.status)) r.closed++;
        if (q.status === "ACEPTADA") r.won++;
        map.set(q.ownerId, r);
        return map;
      }, new Map<string, { label: string; value: number; won: number; closed: number }>()).values()]
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
        .map((r) => ({ label: r.label, value: r.value, sub: r.closed ? `· cierre ${fmtPct(r.won / r.closed, 0)}` : undefined }))
    : [];

  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("es-EC", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(now)}
        title={`Hola, ${firstName}`}
        subtitle={team ? "Resumen del equipo comercial (últimos 12 meses)." : "Tu actividad comercial de los últimos 12 meses."}
        actions={
          can.createQuote(user.role) && (
            <ButtonLink href="/cotizaciones/nueva" size="lg">
              <Plus className="h-4 w-4" /> Nueva cotización
            </ButtonLink>
          )
        }
      />

      {sp.error === "permiso" && (
        <div role="alert" className="mb-4 rounded-xl border border-warn/40 bg-warn-bg px-4 py-3 text-[13px] text-warn-ink">
          Tu rol no tiene acceso a esa sección. Si lo necesitas, pídelo a un administrador.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi label="Cotizado este mes" value={fmtMoney(cur.cotizado)} delta={deltaOf(cur.cotizado, prev.cotizado)} hint="Sin datos del mes anterior" />
        <Kpi label="Cotizaciones este mes" value={String(cur.count)} delta={deltaOf(cur.count, prev.count)} hint="Sin datos del mes anterior" />
        <Kpi label="Tasa de cierre (90 días)" value={fmtPct(closeRate, 0)} hint={`${won90.length} aceptadas de ${closed90.length} cerradas`} />
        <Kpi label="Ticket promedio" value={fmtCompactMoney(avgTicket)} hint={cur.count ? "Cotizaciones de este mes" : "Últimos 12 meses"} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="card p-4 sm:p-5">
          <h2 className="text-[15px] font-semibold">Cotizado y aceptado por mes</h2>
          <p className="mb-3 text-[13px] text-muted">Montos con IVA. “Aceptado” se cuenta en el mes en que el cliente aceptó.</p>
          <MonthlyChart data={months} />
        </section>
        <section className="card p-4 sm:p-5">
          <h2 className="text-[15px] font-semibold">Embudo comercial</h2>
          <p className="mb-3 text-[13px] text-muted">Cotizaciones de los últimos 12 meses por estado.</p>
          <ul className="divide-y divide-line">
            {pipeline.map((p) => (
              <li key={p.status} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/cotizaciones?estado=${p.status}`} className="hover:opacity-80">
                  <StatusBadge status={p.status} />
                </Link>
                <div className="text-right">
                  <div className="text-[14px] font-medium tabular">{fmtMoney(p.amount)}</div>
                  <div className="text-[12px] text-muted">{p.count} cotizaciones</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className={cn("mt-5 grid gap-5", team ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
        <section className="card p-4 sm:p-5">
          <h2 className="text-[15px] font-semibold">Por sistema CercasPro</h2>
          <p className="mb-4 text-[13px] text-muted">Monto cotizado (sin IVA), 12 meses.</p>
          {systemItems.length ? <HBarList items={systemItems} valueLabel={fmtCompactMoney} /> : <p className="text-[13px] text-muted">Sin datos.</p>}
        </section>
        {team && (
          <section className="card p-4 sm:p-5">
            <h2 className="text-[15px] font-semibold">Asesores</h2>
            <p className="mb-4 text-[13px] text-muted">Monto cotizado y tasa de cierre, 90 días.</p>
            {ranking.length ? <HBarList items={ranking} valueLabel={fmtCompactMoney} /> : <p className="text-[13px] text-muted">Sin datos.</p>}
          </section>
        )}
        <section className="card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <Clock3 className="h-4 w-4 text-warn-ink" /> Por dar seguimiento
          </h2>
          <p className="mb-3 text-[13px] text-muted">Enviadas hace más de 7 días sin respuesta.</p>
          {followUps.length === 0 ? (
            <p className="text-[13px] text-muted">Todo al día.</p>
          ) : (
            <ul className="divide-y divide-line">
              {followUps.map((q) => (
                <li key={q.id}>
                  <Link href={`/cotizaciones/${q.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-medium">{q.customer.company || q.customer.name}</div>
                      <div className="text-[12px] text-muted">
                        {q.number} · enviada {fmtDate(q.sentAt!)}
                      </div>
                    </div>
                    <span className="shrink-0 text-[13px] font-medium tabular">{fmtMoney(Number(q.total))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card mt-5 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 sm:px-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <FileText className="h-4 w-4 text-brand-600" /> Últimas cotizaciones
          </h2>
          <Link href="/cotizaciones" className="text-[13px] text-brand-600 hover:underline">
            Ver todas
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0">
            <tbody>
              {recent.map((q) => (
                <tr key={q.id} className="hover:bg-brand-50/40">
                  <td className="td w-[150px]">
                    <Link href={`/cotizaciones/${q.id}`} className="font-medium text-brand-700 hover:underline">
                      {q.number}
                    </Link>
                  </td>
                  <td className="td">
                    <div className="max-w-[320px] truncate">{q.customer.company || q.customer.name}</div>
                  </td>
                  <td className="td"><StatusBadge status={q.status} /></td>
                  <td className="td text-[13px] text-ink-2">{fmtDate(q.createdAt)}</td>
                  <td className="td text-right font-medium tabular">{fmtMoney(Number(q.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
