import type { QuoteStatus } from "@prisma/client";
import { CheckCircle2, CircleDashed, Clock3, Send, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "brand" | "good" | "warn" | "bad" | "cyan"; className?: string }) {
  const tones = {
    neutral: "bg-page text-ink-2 ring-line",
    brand: "bg-brand-50 text-brand-700 ring-brand-100",
    cyan: "bg-cyan-50 text-cyan-600 ring-cyan-50",
    good: "bg-good-bg text-good-ink ring-good-bg",
    warn: "bg-warn-bg text-warn-ink ring-warn-bg",
    bad: "bg-bad-bg text-bad-ink ring-bad-bg",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium ring-1 ring-inset whitespace-nowrap", tones[tone], className)}>{children}</span>;
}

export const STATUS_META: Record<QuoteStatus, { label: string; tone: "neutral" | "brand" | "good" | "warn" | "bad"; icon: typeof Send }> = {
  BORRADOR: { label: "Borrador", tone: "neutral", icon: CircleDashed },
  ENVIADA: { label: "Enviada", tone: "brand", icon: Send },
  ACEPTADA: { label: "Aceptada", tone: "good", icon: CheckCircle2 },
  RECHAZADA: { label: "Rechazada", tone: "bad", icon: XCircle },
  VENCIDA: { label: "Vencida", tone: "warn", icon: Clock3 },
};

export function StatusBadge({ status }: { status: QuoteStatus }) {
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <Badge tone={m.tone}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {m.label}
    </Badge>
  );
}
