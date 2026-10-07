"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { CopyPlus, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { createDraftFromList, importPriceListAction } from "@/app/actions/config";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function PriceListTools({ activeId }: { activeId: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [fileName, setFileName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-wrap gap-2">
      {activeId && (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await createDraftFromList(activeId);
              if (!res.ok) return void toast.error(res.error);
              router.push(`/configuracion/precios/${res.data.id}`);
            })
          }
        >
          <CopyPlus className="h-4 w-4" /> Editar sobre la vigente
        </Button>
      )}
      <Button onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" /> Importar desde Excel
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Importar lista de precios desde Excel"
        description="Se crea un borrador: revisas los cambios contra la lista vigente y luego lo publicas."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={pending || !fileName}
              onClick={() =>
                start(async () => {
                  const res = await importPriceListAction(new FormData(formRef.current!));
                  if (!res.ok) return void toast.error(res.error);
                  if (res.data.warnings.length) toast.warning(`${res.data.warnings.length} advertencia(s) al importar: ${res.data.warnings[0]}`);
                  toast.success("Borrador creado. Revisa los cambios antes de publicar.");
                  router.push(`/configuracion/precios/${res.data.id}`);
                })
              }
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Importar
            </Button>
          </>
        }
      >
        <form ref={formRef} className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-page/50 px-4 py-8 text-center hover:border-brand-300">
            <FileSpreadsheet className="h-8 w-8 text-brand-600" />
            <span className="text-[14px] font-medium">{fileName || "Elige el archivo .xlsx o .xlsm"}</span>
            <span className="text-[12px] text-muted">Debe tener una hoja con columnas SAP, Producto, peso, ACABADO, las categorías y PVS (como CP_2026).</span>
            <input name="file" type="file" accept=".xlsx,.xlsm" className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="pl-name">Nombre de la lista (opcional)</label>
              <input id="pl-name" name="name" className="input" placeholder="Ej. Lista noviembre 2026" />
            </div>
            <div>
              <label className="label" htmlFor="pl-sheet">Hoja (opcional)</label>
              <input id="pl-sheet" name="sheet" className="input" placeholder="Se detecta automáticamente" />
            </div>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
