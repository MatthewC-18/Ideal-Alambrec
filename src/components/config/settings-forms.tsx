"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { purgeDemoAction, saveSetting } from "@/app/actions/config";
import { NumberInput } from "@/components/quote/number-input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { Settings, SettingKey } from "@/lib/settings";

function useSave() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const save = (key: SettingKey, value: unknown) =>
    start(async () => {
      const res = await saveSetting(key, value);
      if (!res.ok) return void toast.error(res.problems?.[0] ?? res.error);
      toast.success("Configuración guardada");
      router.refresh();
    });
  return { pending, save };
}

function Panel({ title, subtitle, children, onSave, pending }: { title: string; subtitle: string; children: React.ReactNode; onSave: () => void; pending: boolean }) {
  return (
    <section className="card">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[16px] font-semibold">{title}</h2>
        <p className="text-[13px] text-muted">{subtitle}</p>
      </div>
      <div className="p-5">{children}</div>
      <div className="flex justify-end border-t border-line px-5 py-3">
        <Button onClick={onSave} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
        </Button>
      </div>
    </section>
  );
}

const pct = (n: number) => Math.round(n * 10000) / 100;

export function SettingsForms({ settings, demoCount }: { settings: Settings; demoCount: number }) {
  const router = useRouter();
  const company = useSave();
  const quote = useSave();
  const limits = useSave();
  const email = useSave();
  const [c, setC] = useState(settings.company);
  const [q, setQ] = useState(settings.quote);
  const [l, setL] = useState(settings.limits);
  const [e, setE] = useState(settings.email);
  const [purge, setPurge] = useState(false);
  const [purging, startPurge] = useTransition();

  return (
    <div className="space-y-5">
      <Panel title="Datos de la empresa" subtitle="Aparecen en el encabezado de cada PDF." onSave={() => company.save("company", c)} pending={company.pending}>
        <div className="grid gap-3 md:grid-cols-2">
          <div><label className="label">Razón social</label><input className="input" value={c.name} onChange={(ev) => setC({ ...c, name: ev.target.value })} /></div>
          <div><label className="label">R.U.C.</label><input className="input" value={c.ruc} onChange={(ev) => setC({ ...c, ruc: ev.target.value })} /></div>
          <div><label className="label">Contribuyente especial</label><input className="input" value={c.specialTaxpayer} onChange={(ev) => setC({ ...c, specialTaxpayer: ev.target.value })} /></div>
          <div><label className="label">Teléfono</label><input className="input" value={c.phone} onChange={(ev) => setC({ ...c, phone: ev.target.value })} /></div>
          <div className="md:col-span-2">
            <label className="label">Direcciones (una por línea)</label>
            <textarea rows={3} className="input" value={c.addresses.join("\n")} onChange={(ev) => setC({ ...c, addresses: ev.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
          </div>
        </div>
      </Panel>

      <Panel title="Parámetros de la cotización" subtitle="IVA y textos por defecto. El IVA nuevo aplica solo a cotizaciones nuevas." onSave={() => quote.save("quote", q)} pending={quote.pending}>
        <div className="grid gap-3 md:grid-cols-4">
          <div><label className="label">IVA</label><NumberInput suffix="%" value={pct(q.ivaRate)} onValueChange={(n) => setQ({ ...q, ivaRate: (n ?? 0) / 100 })} /></div>
          <div><label className="label">Validez por defecto</label><NumberInput suffix="días" digits={0} value={q.validityDays} onValueChange={(n) => setQ({ ...q, validityDays: Math.round(n ?? 15) })} /></div>
          <div className="md:col-span-4"><label className="label">Texto de introducción</label><textarea rows={2} className="input" value={q.intro} onChange={(ev) => setQ({ ...q, intro: ev.target.value })} /></div>
          <div className="md:col-span-4"><label className="label">Observaciones por defecto</label><textarea rows={2} className="input" value={q.defaultNotes} onChange={(ev) => setQ({ ...q, defaultNotes: ev.target.value })} /></div>
          <div className="md:col-span-4"><label className="label">Condiciones al pie del PDF</label><textarea rows={2} className="input" value={q.footer} onChange={(ev) => setQ({ ...q, footer: ev.target.value })} /></div>
        </div>
      </Panel>

      <Panel
        title="Límites de ajuste por rol"
        subtitle="Cuánto puede bajar cada rol el precio de una línea respecto a la lista (y el descuento adicional sobre el total). Por encima del límite, la cotización no se puede guardar."
        onSave={() => limits.save("limits", l)}
        pending={limits.pending}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="th">Rol</th>
                <th className="th">Ajuste máx. de precio por línea</th>
                <th className="th">Descuento adicional máx.</th>
              </tr>
            </thead>
            <tbody>
              {(["ASESOR", "SUPERVISOR", "ADMIN"] as const).map((r) => (
                <tr key={r}>
                  <td className="td font-medium">{r === "ASESOR" ? "Asesor comercial" : r === "SUPERVISOR" ? "Supervisor comercial" : "Administrador"}</td>
                  <td className="td w-[220px]"><NumberInput suffix="%" value={pct(l.priceOverride[r])} onValueChange={(n) => setL({ ...l, priceOverride: { ...l.priceOverride, [r]: Math.min(100, Math.max(0, n ?? 0)) / 100 } })} /></td>
                  <td className="td w-[220px]"><NumberInput suffix="%" value={pct(l.globalDiscount[r])} onValueChange={(n) => setL({ ...l, globalDiscount: { ...l.globalDiscount, [r]: Math.min(100, Math.max(0, n ?? 0)) / 100 } })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div><label className="label">Descuento máximo “livianos” (alambre de púas)</label><NumberInput suffix="%" value={pct(l.maxLivianos)} onValueChange={(n) => setL({ ...l, maxLivianos: (n ?? 0) / 100 })} /></div>
          <div><label className="label">Descuento máximo “pesados”</label><NumberInput suffix="%" value={pct(l.maxPesados)} onValueChange={(n) => setL({ ...l, maxPesados: (n ?? 0) / 100 })} /></div>
        </div>
      </Panel>

      <Panel
        title="Plantilla del correo al cliente"
        subtitle="Variables: {numero} {cliente} {empresa} {total} {validez} {asesor} {telefono_asesor} {correo_asesor}. El asesor puede editar el texto antes de enviar."
        onSave={() => email.save("email", e)}
        pending={email.pending}
      >
        <div className="grid gap-3">
          <div><label className="label">Asunto</label><input className="input" value={e.subject} onChange={(ev) => setE({ ...e, subject: ev.target.value })} /></div>
          <div><label className="label">Mensaje</label><textarea rows={8} className="input" value={e.body} onChange={(ev) => setE({ ...e, body: ev.target.value })} /></div>
        </div>
      </Panel>

      {demoCount > 0 && (
        <section className="card border-warn/40 p-5">
          <h2 className="text-[16px] font-semibold">Datos de demostración</h2>
          <p className="mt-1 text-[13px] text-ink-2">
            Hay {demoCount} cotizaciones ficticias (marcadas “demo”) para mostrar el tablero durante el piloto. Bórralas antes de empezar a usar el sistema en serio.
          </p>
          <Button variant="danger" className="mt-3" onClick={() => setPurge(true)}>
            <Trash2 className="h-4 w-4" /> Borrar datos de demostración
          </Button>
          <Dialog
            open={purge}
            onOpenChange={setPurge}
            title="¿Borrar los datos de demostración?"
            description="Se eliminan las cotizaciones y clientes ficticios y se desactivan los asesores demo. Los datos reales no se tocan."
            footer={
              <>
                <Button variant="ghost" onClick={() => setPurge(false)}>Cancelar</Button>
                <Button
                  variant="danger"
                  disabled={purging}
                  onClick={() =>
                    startPurge(async () => {
                      const res = await purgeDemoAction();
                      if (!res.ok) return void toast.error(res.error);
                      toast.success(`Se eliminaron ${res.data.quotes} cotizaciones demo`);
                      setPurge(false);
                      router.refresh();
                    })
                  }
                >
                  {purging && <Loader2 className="h-4 w-4 animate-spin" />} Borrar
                </Button>
              </>
            }
          >
            <p className="text-[14px] text-ink-2">La acción queda registrada en la auditoría.</p>
          </Dialog>
        </section>
      )}
    </div>
  );
}
