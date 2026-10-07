import { Shell } from "@/components/shell/shell";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const nav = [
    { href: "/", label: "Inicio", icon: "home" as const },
    ...(can.createQuote(user.role) ? [{ href: "/cotizaciones/nueva", label: "Nueva cotización", icon: "plus" as const }] : []),
    { href: "/cotizaciones", label: "Cotizaciones", icon: "file" as const },
    { href: "/clientes", label: "Clientes", icon: "users" as const },
    { href: "/catalogo", label: "Catálogo y precios", icon: "box" as const },
    ...(can.managePrices(user.role) || can.manageUsers(user.role) ? [{ href: "/configuracion", label: "Configuración", icon: "settings" as const }] : []),
    ...(can.seeAudit(user.role) ? [{ href: "/auditoria", label: "Auditoría", icon: "shield" as const }] : []),
  ];
  return (
    <Shell nav={nav} user={{ name: user.name, email: user.email, role: ROLE_LABEL[user.role] }}>
      {children}
    </Shell>
  );
}
