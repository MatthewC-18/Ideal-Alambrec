import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-[13px] font-medium text-brand-600">{eyebrow}</div>}
        <h1 className="text-[24px] leading-tight font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-3xl text-[14px] text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-3 rounded-full bg-brand-50 p-3 text-brand-600">{icon}</div>}
      <h3 className="text-[16px] font-semibold">{title}</h3>
      {children && <p className="mt-1 max-w-md text-[14px] text-ink-2">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
