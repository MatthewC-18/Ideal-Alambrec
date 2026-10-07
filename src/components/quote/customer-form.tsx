"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveCustomer, type CustomerDTO } from "@/app/actions/customers";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function CustomerDialog({
  open,
  onOpenChange,
  tiers,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tiers: { key: string; label: string }[];
  initial?: Partial<CustomerDTO>;
  onSaved: (c: CustomerDTO) => void;
}) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    company: initial?.company ?? "",
    taxId: initial?.taxId ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    address: initial?.address ?? "",
    city: initial?.city ?? "",
    tierKey: initial?.tierKey ?? "PVS",
    notes: initial?.notes ?? "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () =>
    start(async () => {
      const res = await saveCustomer({ ...form, id: initial?.id });
      if (!res.ok) {
        setErrors(res.problems ?? [res.error]);
        return;
      }
      toast.success(initial?.id ? "Cliente actualizado" : "Cliente creado");
      onSaved(res.data);
      onOpenChange(false);
    });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial?.id ? "Editar cliente" : "Nuevo cliente"}
      description="La categoría define qué lista de precios se aplica por defecto."
      wide
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar cliente
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="sm:col-span-2">
          <label className="label" htmlFor="c-company">Empresa / razón social</label>
          <input id="c-company" className="input" value={form.company} onChange={set("company")} placeholder="Ej. Constructora Andina S.A." />
        </div>
        <div>
          <label className="label" htmlFor="c-name">Nombre del contacto *</label>
          <input id="c-name" className="input" value={form.name} onChange={set("name")} required />
        </div>
        <div>
          <label className="label" htmlFor="c-tax">RUC / cédula</label>
          <input id="c-tax" className="input" value={form.taxId} onChange={set("taxId")} />
        </div>
        <div>
          <label className="label" htmlFor="c-email">Correo</label>
          <input id="c-email" type="email" className="input" value={form.email} onChange={set("email")} />
        </div>
        <div>
          <label className="label" htmlFor="c-phone">Teléfono</label>
          <input id="c-phone" className="input" value={form.phone} onChange={set("phone")} />
        </div>
        <div>
          <label className="label" htmlFor="c-city">Ciudad</label>
          <input id="c-city" className="input" value={form.city} onChange={set("city")} />
        </div>
        <div>
          <label className="label" htmlFor="c-tier">Categoría de cliente</label>
          <select id="c-tier" className="input" value={form.tierKey} onChange={set("tierKey")}>
            {tiers.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="c-address">Dirección</label>
          <input id="c-address" className="input" value={form.address} onChange={set("address")} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="c-notes">Notas internas</label>
          <textarea id="c-notes" rows={2} className="input" value={form.notes} onChange={set("notes")} />
        </div>
        {errors.length > 0 && (
          <ul role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-[13px] text-bad-ink sm:col-span-2">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Dialog>
  );
}
