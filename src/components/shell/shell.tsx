"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Boxes, FileText, Home, LogOut, Menu, Plus, Settings, ShieldCheck, Users, X } from "lucide-react";
import { cn } from "@/lib/cn";

const ICONS = { home: Home, plus: Plus, file: FileText, users: Users, box: Boxes, settings: Settings, shield: ShieldCheck };

type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/cotizaciones") return pathname === "/cotizaciones" || (/^\/cotizaciones\/(?!nueva)/.test(pathname));
  return pathname === href || pathname.startsWith(href + "/");
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function Shell({ nav, user, children }: { nav: NavItem[]; user: { name: string; email: string; role: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link href="/" aria-label="Inicio">
          <Image src="/brand/logo-ideal-alambrec-grupo-ag.png" alt="Ideal Alambrec — Grupo AG" width={180} height={50} priority className="h-auto w-[168px]" />
        </Link>
      </div>
      <div className="px-5 pb-3 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Cotizador CercasPro</div>
      <nav className="flex-1 space-y-0.5 px-3" aria-label="Principal">
        {nav.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(pathname, item.href);
          if (item.icon === "plus")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium text-white shadow-sm transition",
                  active ? "bg-brand-700" : "bg-brand-600 hover:bg-brand-700",
                )}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden /> {item.label}
              </Link>
            );
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition",
                active ? "bg-brand-50 font-medium text-brand-700" : "text-ink-2 hover:bg-page hover:text-ink",
              )}
            >
              <Icon className={cn("h-[18px] w-[18px]", active ? "text-brand-600" : "text-muted")} aria-hidden /> {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="m-3 rounded-xl border border-line bg-page/60 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-[13px] font-semibold text-white">{initials(user.name)}</div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium">{user.name}</div>
            <div className="truncate text-[12px] text-muted">{user.role}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-white py-1.5 text-[13px] text-ink-2 transition hover:text-ink"
        >
          <LogOut className="h-4 w-4" aria-hidden /> Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-white lg:block">{sidebar}</aside>
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:hidden">
        <Image src="/brand/logo-ideal-alambrec-grupo-ag.png" alt="Ideal Alambrec — Grupo AG" width={130} height={36} className="h-auto w-[124px]" />
        <button onClick={() => setOpen(true)} className="rounded-md p-2 text-ink-2 hover:bg-page" aria-label="Abrir menú">
          <Menu className="h-5 w-5" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-3 rounded-md p-1.5 text-muted hover:bg-page" aria-label="Cerrar menú">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
