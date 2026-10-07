import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SettingsForms } from "@/components/config/settings-forms";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Empresa, PDF y límites" };

export default async function CompanySettingsPage() {
  await requireUser(can.manageSettings);
  const [settings, demoCount] = await Promise.all([getSettings(), prisma.quote.count({ where: { isDemo: true } })]);
  return (
    <>
      <Link href="/configuracion" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Configuración
      </Link>
      <PageHeader title="Empresa, PDF y límites" subtitle="Cada cambio queda registrado con el usuario, la fecha y el valor anterior." />
      <SettingsForms settings={settings} demoCount={demoCount} />
    </>
  );
}
