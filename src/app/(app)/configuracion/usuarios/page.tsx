import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UsersTable } from "@/components/config/users-table";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsersPage() {
  await requireUser(can.manageUsers);
  const users = await prisma.user.findMany({ orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }], include: { _count: { select: { quotes: true } } } });
  return (
    <>
      <Link href="/configuracion" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Configuración
      </Link>
      <PageHeader title="Usuarios y permisos" subtitle="Solo pueden entrar las personas registradas aquí. Quitar el acceso tiene efecto inmediato." />
      <UsersTable
        users={users.map((u) => ({ id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role, active: u.active, isDemo: u.isDemo, lastLogin: u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : null, quotes: u._count.quotes }))}
      />
    </>
  );
}
