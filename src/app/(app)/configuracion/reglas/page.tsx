import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RulesEditor } from "@/components/config/rules-editor";
import { NewRulesDraftButton, RulesHistory } from "@/components/config/rules-history";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/db";
import { ruleSetSchema } from "@/lib/engine/types";
import { fmtDateTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { getActivePriceList } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Reglas de cálculo" };

export default async function RulesPage() {
  await requireUser(can.manageRules);
  const [all, list, users] = await Promise.all([
    prisma.ruleSet.findMany({ orderBy: { version: "desc" } }),
    getActivePriceList(),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);
  const names = new Map(users.map((u) => [u.id, u.name]));
  const active = all.find((r) => r.status === "VIGENTE");
  const draft = all.find((r) => r.status === "BORRADOR");
  if (!active) return <div className="card p-6">No hay reglas vigentes.</div>;
  const shown = draft ?? active;
  const products = (list?.items ?? []).map((i) => ({ sap: i.product.sap, name: i.product.name, pvs: Number(i.pvs), weightKg: Number(i.product.weightKg) }));
  const tiers = (list?.tiers ?? []).map((t) => ({ key: t.key, label: t.label, discountPct: Number(t.discountPct) }));

  return (
    <>
      <Link href="/configuracion" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Configuración
      </Link>
      <PageHeader
        title="Reglas de cálculo"
        subtitle={
          draft
            ? `Editando el borrador v${draft.version}. La versión vigente (v${active.version}) sigue en uso hasta que publiques.`
            : `Versión vigente v${active.version}. Para cambiar algo, crea un borrador: nada afecta a los asesores hasta que lo publiques.`
        }
        actions={!draft && <NewRulesDraftButton fromId={active.id} label="Crear borrador para editar" />}
      />
      <RulesEditor
        key={shown.id + (shown.notes ?? "") + JSON.stringify(shown.data).length}
        draftId={draft?.id ?? null}
        version={shown.version}
        editable={!!draft}
        initial={ruleSetSchema.parse(shown.data)}
        current={ruleSetSchema.parse(active.data)}
        notes={draft?.notes ?? ""}
        products={products}
        tiers={tiers}
      />
      <RulesHistory
        hasDraft={!!draft}
        versions={all.map((r) => ({ id: r.id, version: r.version, status: r.status, notes: r.notes, date: fmtDateTime(r.publishedAt ?? r.createdAt), author: names.get(r.createdById ?? "") ?? "—" }))}
      />
    </>
  );
}
