"use client";

import type { Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { saveUser } from "@/app/actions/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ROLE_LABEL } from "@/lib/permissions";

type U = { id: string; email: string; name: string; phone: string | null; role: Role; active: boolean; isDemo: boolean; lastLogin: string | null; quotes: number };
const ROLE_HELP: Record<Role, string> = {
  ADMIN: "Todo, incluidos usuarios y datos de la empresa",
  SUPERVISOR: "Ve todo el equipo, edita precios y reglas, mayor margen de ajuste",
  ASESOR: "Crea y envía sus cotizaciones",
  LECTOR: "Solo consulta (gerencia, auditoría)",
};

export function UsersTable({ users }: { users: U[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<Partial<U> | null>(null);
  const [q, setQ] = useState("");
  const rows = users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Buscar usuario…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button onClick={() => setEdit({ role: "ASESOR", active: true })}>
          <Plus className="h-4 w-4" /> Agregar usuario
        </Button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="th">Usuario</th>
              <th className="th">Rol</th>
              <th className="th">Estado</th>
              <th className="th text-right">Cotizaciones</th>
              <th className="th">Último acceso</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                <td className="td">
                  <div className="font-medium">{u.name} {u.isDemo && <Badge tone="cyan" className="ml-1 text-[11px]">demo</Badge>}</div>
                  <div className="text-[12.5px] text-muted">{u.email}{u.phone ? ` · ${u.phone}` : ""}</div>
                </td>
                <td className="td text-[13px]">{ROLE_LABEL[u.role]}</td>
                <td className="td"><Badge tone={u.active ? "good" : "neutral"}>{u.active ? "Activo" : "Sin acceso"}</Badge></td>
                <td className="td text-right tabular">{u.quotes}</td>
                <td className="td text-[13px] text-ink-2">{u.lastLogin ?? "Nunca"}</td>
                <td className="td text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEdit(u)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Dialog
          open
          onOpenChange={(o) => !o && setEdit(null)}
          title={edit.id ? `Editar ${edit.name}` : "Agregar usuario"}
          description="El usuario entra con su cuenta corporativa (SSO) usando este mismo correo."
          footer={
            <>
              <Button variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button>
              <Button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await saveUser({ id: edit.id, email: edit.email ?? "", name: edit.name ?? "", phone: edit.phone ?? "", role: edit.role ?? "ASESOR", active: edit.active ?? true });
                    if (!res.ok) return void toast.error(res.problems?.[0] ?? res.error);
                    toast.success("Usuario guardado");
                    setEdit(null);
                    router.refresh();
                  })
                }
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
              </Button>
            </>
          }
        >
          <div className="grid gap-3">
            <div>
              <label className="label" htmlFor="u-name">Nombre</label>
              <input id="u-name" className="input" value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="u-email">Correo corporativo</label>
              <input id="u-email" type="email" className="input" value={edit.email ?? ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} placeholder="nombre@somosgrupoag.com" />
            </div>
            <div>
              <label className="label" htmlFor="u-phone">Teléfono (aparece en el PDF)</label>
              <input id="u-phone" className="input" value={edit.phone ?? ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
            </div>
            <fieldset>
              <legend className="label">Rol</legend>
              <div className="grid gap-2">
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                  <label key={r} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-2.5 ${edit.role === r ? "border-brand-500 bg-brand-50" : "border-line"}`}>
                    <input type="radio" name="role" className="mt-1 accent-brand-600" checked={edit.role === r} onChange={() => setEdit({ ...edit, role: r })} />
                    <span>
                      <span className="block text-[14px] font-medium">{ROLE_LABEL[r]}</span>
                      <span className="block text-[12.5px] text-muted">{ROLE_HELP[r]}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex items-center gap-2 text-[14px]">
              <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={edit.active ?? true} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />
              Acceso habilitado
            </label>
          </div>
        </Dialog>
      )}
    </>
  );
}
