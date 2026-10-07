import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Calculator, ChevronRight, Tags, UserCog } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfigHome() {
  const user = await requireUser((r) => can.managePrices(r) || can.manageUsers(r));
  const [list, rules, users, drafts] = await Promise.all([
    prisma.priceList.findFirst({ where: { status: "VIGENTE" } }),
    prisma.ruleSet.findFirst({ where: { status: "VIGENTE" } }),
    prisma.user.count({ where: { active: true, isDemo: false } }),
    prisma.priceList.count({ where: { status: "BORRADOR" } }),
  ]);
  const cards = [
    can.managePrices(user.role) && {
      href: "/configuracion/precios",
      icon: Tags,
      title: "Listas de precios",
      body: "Importa la lista desde Excel, ajusta precios o aplica un % a toda una familia, compara contra la vigente y publica. Todos los asesores ven el cambio al instante.",
      meta: list ? `Vigente: ${list.name} · desde ${fmtDate(list.publishedAt ?? list.createdAt)}${drafts ? ` · ${drafts} borrador(es)` : ""}` : "Sin lista vigente",
    },
    can.manageRules(user.role) && {
      href: "/configuracion/reglas",
      icon: Calculator,
      title: "Reglas de cálculo",
      body: "Cuántas fijaciones por poste, qué poste lleva cada altura, ancho del panel… Edita las fórmulas, pruébalas con un simulador y publícalas sin programador.",
      meta: rules ? `Versión vigente: v${rules.version}` : "Sin reglas",
    },
    can.manageUsers(user.role) && {
      href: "/configuracion/usuarios",
      icon: UserCog,
      title: "Usuarios y permisos",
      body: "Da o quita acceso a asesores, supervisores y gerencia. El acceso se valida con la cuenta corporativa (SSO).",
      meta: `${users} usuarios activos`,
    },
    can.manageSettings(user.role) && {
      href: "/configuracion/empresa",
      icon: Building2,
      title: "Empresa, PDF y límites",
      body: "Datos de la empresa en el PDF, IVA, validez de la oferta, plantilla de correo y cuánto puede ajustar precios cada rol.",
      meta: "Datos legales, IVA, descuentos por rol",
    },
  ].filter(Boolean) as { href: string; icon: typeof Tags; title: string; body: string; meta: string }[];

  return (
    <>
      <PageHeader title="Configuración" subtitle="Todo lo que antes requería pedirle al programador un Excel nuevo, ahora se cambia aquí — y queda registrado en la auditoría." />
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="card group flex gap-4 p-5 transition hover:border-brand-300 hover:shadow-[var(--shadow-pop)]">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <c.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[16px] font-semibold">{c.title}</h2>
                <ChevronRight className="h-5 w-5 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
              </div>
              <p className="mt-1 text-[13.5px] text-ink-2">{c.body}</p>
              <p className="mt-3 text-[12.5px] font-medium text-brand-700">{c.meta}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
