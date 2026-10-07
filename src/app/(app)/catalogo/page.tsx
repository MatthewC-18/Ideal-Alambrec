import type { Metadata } from "next";
import { Settings2 } from "lucide-react";
import { FilterBar } from "@/components/lists/filter-bar";
import { TierTabs } from "@/components/lists/tier-tabs";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { excelRound } from "@/lib/engine/expr";
import { fmtDate, fmtMoney, fmtNumber, fmtPct } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { getActivePriceList } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Catálogo y precios" };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const list = await getActivePriceList();
  if (!list) return <div className="card p-6 text-[14px]">No hay una lista de precios vigente.</div>;
  const tier = list.tiers.find((t) => t.key === sp.categoria) ?? list.tiers.find((t) => t.key === "PVS") ?? list.tiers[0];
  const pct = Number(tier.discountPct);
  const q = norm(sp.q ?? "");
  const items = list.items
    .filter((i) => i.product.active && (!q || norm(`${i.product.sap} ${i.product.name}`).includes(q)))
    .sort((a, b) => a.product.sortOrder - b.product.sortOrder);
  const families = [...new Set(items.map((i) => i.product.family))];

  return (
    <>
      <PageHeader
        title="Catálogo y precios"
        subtitle={`${list.name} · publicada el ${fmtDate(list.publishedAt ?? list.createdAt)} · ${list.items.length} productos`}
        actions={
          can.managePrices(user.role) && (
            <ButtonLink href="/configuracion/precios" variant="outline">
              <Settings2 className="h-4 w-4" /> Administrar precios
            </ButtonLink>
          )
        }
      />
      <div className="mb-4">
        <TierTabs tiers={list.tiers.map((t) => ({ key: t.key, label: t.label, pct: Number(t.discountPct) > 0 ? `−${fmtPct(Number(t.discountPct), 2)}` : "PVS" }))} value={tier.key} />
      </div>
      <FilterBar fields={[{ type: "search", name: "q", placeholder: "Buscar por código SAP o producto…" }]} />
      <div className="space-y-5">
        {families.map((f) => (
          <section key={f} className="card overflow-hidden">
            <h2 className="border-b border-line bg-brand-50/50 px-4 py-2.5 text-[13px] font-semibold tracking-wide text-brand-800 uppercase">{f}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="th w-[100px]">SAP</th>
                    <th className="th">Producto</th>
                    <th className="th">Acabado</th>
                    <th className="th text-right">Peso</th>
                    <th className="th text-right">PVS</th>
                    <th className="th text-right">{tier.label}</th>
                  </tr>
                </thead>
                <tbody>
                  {items
                    .filter((i) => i.product.family === f)
                    .map((i) => (
                      <tr key={i.id} className="hover:bg-brand-50/30">
                        <td className="td text-[13px] text-muted tabular">{i.product.sap}</td>
                        <td className="td text-[14px]">{i.product.name}</td>
                        <td className="td text-[13px] text-ink-2">{i.product.finish ?? "—"}</td>
                        <td className="td text-right text-[13px] text-ink-2 tabular">{fmtNumber(Number(i.product.weightKg), 3)} kg</td>
                        <td className="td text-right text-[13px] text-ink-2 tabular">{fmtMoney(excelRound(Number(i.pvs), 2))}</td>
                        <td className="td text-right font-semibold tabular">{fmtMoney(excelRound(Number(i.pvs) * (1 - pct), 2))}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
