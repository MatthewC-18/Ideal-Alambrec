"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { History, Loader2, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { createRulesDraft } from "@/app/actions/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function NewRulesDraftButton({ fromId, label }: { fromId: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await createRulesDraft(fromId);
          if (!res.ok) return void toast.error(res.error);
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PencilLine className="h-4 w-4" />} {label}
    </Button>
  );
}

export function RulesHistory({ versions, hasDraft }: { versions: { id: string; version: number; status: string; notes: string | null; date: string; author: string }[]; hasDraft: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <section className="card mt-5 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
        <History className="h-4 w-4 text-brand-600" /> Historial de versiones
      </h2>
      <ul className="divide-y divide-line">
        {versions.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
            <div>
              <div className="flex items-center gap-2 text-[14px] font-medium">
                v{v.version}
                <Badge tone={v.status === "VIGENTE" ? "good" : v.status === "BORRADOR" ? "warn" : "neutral"}>{v.status.toLowerCase()}</Badge>
              </div>
              <div className="text-[12.5px] text-muted">
                {v.notes ?? "Sin notas"} · {v.author} · {v.date}
              </div>
            </div>
            {v.status === "ARCHIVADA" && !hasDraft && (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await createRulesDraft(v.id);
                    if (!res.ok) return void toast.error(res.error);
                    toast.success(`Borrador creado a partir de v${v.version}. Revísalo y publícalo para restaurar.`);
                    router.refresh();
                  })
                }
              >
                Restaurar como borrador
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
