"use client";

import type { QuoteStatus } from "@prisma/client";
import * as DM from "@radix-ui/react-dropdown-menu";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, Copy, Download, Eye, Loader2, Mail, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteDraft, duplicateQuote, emailQuote, setQuoteStatus } from "@/app/actions/quotes";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { STATUS_META } from "@/components/ui/badge";

export function QuoteActions({
  id,
  number,
  status,
  canEdit,
  canChange,
  email,
  smtp,
}: {
  id: string;
  number: string;
  status: QuoteStatus;
  canEdit: boolean;
  canChange: boolean;
  email: { to: string; subject: string; body: string };
  smtp: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mailOpen, setMailOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mail, setMail] = useState({ ...email, cc: "" });

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "No se pudo completar");
      else {
        toast.success(okMsg);
        after?.();
        router.refresh();
      }
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Plain anchors: next/link would prefetch (and render) the PDF route in the background. */}
      <a href={`/cotizaciones/${id}/pdf`} target="_blank" rel="noopener" className={buttonClass("outline")}>
        <Eye className="h-4 w-4" /> Ver PDF
      </a>
      <a href={`/cotizaciones/${id}/pdf?descargar=1`} className={buttonClass("outline")}>
        <Download className="h-4 w-4" /> Descargar
      </a>
      {canChange && (
        <Button onClick={() => setMailOpen(true)}>
          <Mail className="h-4 w-4" /> Enviar al cliente
        </Button>
      )}
      {canChange && (
        <DM.Root>
          <DM.Trigger asChild>
            <Button variant="outline" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Más acciones <ChevronDown className="h-4 w-4" />
            </Button>
          </DM.Trigger>
          <DM.Portal>
            <DM.Content align="end" sideOffset={6} className="z-50 min-w-[220px] rounded-xl border border-line bg-white p-1 text-[14px] shadow-[var(--shadow-pop)]">
              {canEdit && (
                <DM.Item className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-page" onSelect={() => router.push(`/cotizaciones/${id}/editar`)}>
                  <Pencil className="h-4 w-4 text-muted" /> Editar
                </DM.Item>
              )}
              <DM.Item
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-page"
                onSelect={() =>
                  start(async () => {
                    const res = await duplicateQuote(id);
                    if (!res.ok) return void toast.error(res.error);
                    toast.success(`Se creó ${res.data.number} con los precios vigentes`);
                    router.push(`/cotizaciones/${res.data.id}`);
                  })
                }
              >
                <Copy className="h-4 w-4 text-muted" /> Duplicar con precios vigentes
              </DM.Item>
              <DM.Separator className="my-1 h-px bg-line" />
              <DM.Label className="px-3 py-1 text-[11px] font-semibold tracking-wide text-muted uppercase">Marcar como</DM.Label>
              {(["ENVIADA", "ACEPTADA", "RECHAZADA", "VENCIDA"] as QuoteStatus[])
                .filter((s) => s !== status)
                .map((s) => {
                  const M = STATUS_META[s];
                  const Icon = M.icon;
                  return (
                    <DM.Item
                      key={s}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-page"
                      onSelect={() => run(() => setQuoteStatus(id, s), `${number} marcada como ${M.label.toLowerCase()}`)}
                    >
                      <Icon className="h-4 w-4 text-muted" /> {M.label}
                    </DM.Item>
                  );
                })}
              {status === "BORRADOR" && (
                <>
                  <DM.Separator className="my-1 h-px bg-line" />
                  <DM.Item className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-bad-ink outline-none data-[highlighted]:bg-bad-bg" onSelect={() => setConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4" /> Eliminar borrador
                  </DM.Item>
                </>
              )}
            </DM.Content>
          </DM.Portal>
        </DM.Root>
      )}

      <Dialog
        open={mailOpen}
        onOpenChange={setMailOpen}
        title={`Enviar ${number} por correo`}
        description={smtp ? "El PDF se adjunta automáticamente." : "Modo piloto: el correo de salida aún no está configurado, el envío quedará registrado como simulado."}
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setMailOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={pending || !mail.to.trim()}
              onClick={() => run(() => emailQuote(id, mail.to, mail.cc, mail.subject, mail.body), smtp ? "Correo enviado" : "Envío registrado (modo simulado)", () => setMailOpen(false))}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Enviar con PDF adjunto
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <div>
            <label className="label" htmlFor="m-to">Para</label>
            <input id="m-to" className="input" value={mail.to} onChange={(e) => setMail((m) => ({ ...m, to: e.target.value }))} placeholder="correo@cliente.com, otro@cliente.com" />
          </div>
          <div>
            <label className="label" htmlFor="m-cc">CC (opcional)</label>
            <input id="m-cc" className="input" value={mail.cc} onChange={(e) => setMail((m) => ({ ...m, cc: e.target.value }))} />
          </div>
          <div>
            <label className="label" htmlFor="m-subject">Asunto</label>
            <input id="m-subject" className="input" value={mail.subject} onChange={(e) => setMail((m) => ({ ...m, subject: e.target.value }))} />
          </div>
          <div>
            <label className="label" htmlFor="m-body">Mensaje</label>
            <textarea id="m-body" rows={9} className="input" value={mail.body} onChange={(e) => setMail((m) => ({ ...m, body: e.target.value }))} />
          </div>
        </div>
      </Dialog>

      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`¿Eliminar el borrador ${number}?`}
        description="La eliminación queda registrada en la auditoría."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="danger" disabled={pending} onClick={() => run(() => deleteDraft(id), "Borrador eliminado", () => router.push("/cotizaciones"))}>
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-ink-2">Esta acción no se puede deshacer.</p>
      </Dialog>
    </div>
  );
}
