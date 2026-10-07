import Image from "next/image";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { ssoProviders } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ROLE_LABEL } from "@/lib/permissions";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  NoAutorizado: "Tu cuenta no está habilitada en el cotizador. Pide a un administrador que te agregue.",
  CredentialsSignin: "Correo o PIN incorrectos.",
  SessionRequired: "Inicia sesión para continuar.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; callbackUrl?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const sp = await searchParams;
  const pilotUsers = ssoProviders.pilot
    ? (await prisma.user.findMany({ where: { email: { endsWith: "@piloto.local" }, active: true, isDemo: false }, orderBy: { role: "asc" } })).map((u) => ({
        email: u.email,
        name: u.name,
        role: ROLE_LABEL[u.role],
      }))
    : [];

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-navy lg:block">
        <Image src="/img/fence-closeup.webp" alt="" fill priority className="object-cover opacity-45 mix-blend-luminosity" sizes="55vw" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-800/90 via-navy/80 to-brand-600/70" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="text-[13px] font-medium tracking-[0.2em] text-cyan uppercase">Cotizador CercasPro</div>
          <div className="max-w-lg">
            <h1 className="text-[40px] leading-[1.1] font-semibold tracking-tight">Cotiza cerramientos en minutos, con los precios siempre al día.</h1>
            <ul className="mt-8 space-y-3 text-[15px] text-white/85">
              {[
                "Una sola lista de precios para todo el equipo: se actualiza en un clic.",
                "Cada cotización queda registrada con quién la hizo y qué cambió.",
                "PDF con la marca de Ideal Alambrec listo para enviar al cliente.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="text-[12px] text-white/60">Ideal Alambrec S.A. · Grupo AG</div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          <Image src="/brand/logo-ideal-alambrec-grupo-ag.png" alt="Ideal Alambrec — Grupo AG" width={300} height={83} priority className="mb-8 h-auto w-[240px]" />
          <h2 className="text-[24px] font-semibold tracking-tight">Inicia sesión</h2>
          <p className="mt-1 text-[14px] text-ink-2">Usa tu cuenta corporativa de Grupo AG.</p>
          {sp.error && (
            <div role="alert" className="mt-5 rounded-lg border border-bad/30 bg-bad-bg px-3 py-2.5 text-[13px] text-bad-ink">
              {ERRORS[sp.error] ?? "No se pudo iniciar sesión. Inténtalo de nuevo."}
            </div>
          )}
          <LoginForm
            microsoft={ssoProviders.microsoft}
            google={ssoProviders.google}
            pilot={ssoProviders.pilot}
            pilotUsers={pilotUsers}
            callbackUrl={sp.callbackUrl && sp.callbackUrl.startsWith("/") ? sp.callbackUrl : "/"}
          />
        </div>
      </section>
    </main>
  );
}
