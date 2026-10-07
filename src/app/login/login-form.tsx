"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 21 21" className="h-4 w-4" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export function LoginForm(props: {
  microsoft: boolean;
  google: boolean;
  pilot: boolean;
  pilotUsers: { email: string; name: string; role: string }[];
  callbackUrl: string;
}) {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const noProviders = !props.microsoft && !props.google && !props.pilot;

  return (
    <div className="mt-6 space-y-3">
      {props.microsoft && (
        <Button variant="outline" size="lg" className="w-full" disabled={!!busy} onClick={() => { setBusy("ms"); signIn("azure-ad", { callbackUrl: props.callbackUrl }); }}>
          {busy === "ms" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MicrosoftLogo />} Continuar con Microsoft
        </Button>
      )}
      {props.google && (
        <Button variant="outline" size="lg" className="w-full" disabled={!!busy} onClick={() => { setBusy("g"); signIn("google", { callbackUrl: props.callbackUrl }); }}>
          {busy === "g" ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="font-bold text-[#4285f4]">G</span>} Continuar con Google
        </Button>
      )}
      {noProviders && (
        <div className="rounded-lg border border-warn/40 bg-warn-bg px-3 py-2.5 text-[13px] text-warn-ink">
          No hay métodos de acceso configurados. Define las variables de SSO o activa el acceso piloto en el archivo .env.
        </div>
      )}

      {props.pilot && (
        <>
          {(props.microsoft || props.google) && (
            <div className="flex items-center gap-3 py-2 text-[12px] text-muted">
              <div className="h-px flex-1 bg-line" /> o acceso piloto <div className="h-px flex-1 bg-line" />
            </div>
          )}
          <form
            className="card space-y-3 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              setBusy("pilot");
              signIn("piloto", { email, pin, callbackUrl: props.callbackUrl });
            }}
          >
            <div className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
              <KeyRound className="h-4 w-4 text-brand-600" /> Acceso piloto (mientras se configura el SSO)
            </div>
            <div>
              <label className="label" htmlFor="email">Correo</label>
              <input id="email" type="email" required autoComplete="username" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@somosgrupoag.com" />
            </div>
            <div>
              <label className="label" htmlFor="pin">PIN del piloto</label>
              <input id="pin" type="password" required autoComplete="current-password" className="input" value={pin} onChange={(e) => setPin(e.target.value)} />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={!!busy}>
              {busy === "pilot" && <Loader2 className="h-4 w-4 animate-spin" />} Entrar
            </Button>
            {props.pilotUsers.length > 0 && (
              <div className="border-t border-line pt-3">
                <div className="mb-2 text-[12px] text-muted">Cuentas de prueba (elige una y escribe el PIN):</div>
                <div className="grid grid-cols-2 gap-2">
                  {props.pilotUsers.map((u) => (
                    <button
                      type="button"
                      key={u.email}
                      onClick={() => setEmail(u.email)}
                      className={`rounded-lg border px-2.5 py-2 text-left transition hover:border-brand-300 hover:bg-brand-50 ${email === u.email ? "border-brand-500 bg-brand-50" : "border-line"}`}
                    >
                      <div className="truncate text-[13px] font-medium">{u.name}</div>
                      <div className="truncate text-[11px] text-muted">{u.role}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </>
      )}
    </div>
  );
}
