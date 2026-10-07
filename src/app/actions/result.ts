import { ZodError } from "zod";
import { ForbiddenError } from "@/lib/session";
import { QuoteValidationError } from "@/lib/server/quotes";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; problems?: string[] };

export function toActionError(e: unknown): { ok: false; error: string; problems?: string[] } {
  if (e instanceof QuoteValidationError) return { ok: false, error: e.problems[0] ?? "Revisa la cotización.", problems: e.problems };
  if (e instanceof ForbiddenError) return { ok: false, error: e.message };
  if (e instanceof ZodError) return { ok: false, error: "Hay datos inválidos en el formulario.", problems: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  console.error(e);
  return { ok: false, error: "Ocurrió un error inesperado. Intenta de nuevo." };
}
