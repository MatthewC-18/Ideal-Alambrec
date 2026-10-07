import { timingSafeEqual } from "crypto";
import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./db";
import { writeAudit } from "./audit";

export const ssoProviders = {
  microsoft: Boolean(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID),
  google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  pilot: process.env.PILOT_LOGIN === "true" && Boolean(process.env.PILOT_PIN),
};

function samePin(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

async function findActiveUser(email: string | null | undefined) {
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  return user && user.active ? user : null;
}

const providers: NextAuthOptions["providers"] = [];
if (ssoProviders.microsoft) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
  );
}
if (ssoProviders.google) {
  providers.push(GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }));
}
if (ssoProviders.pilot) {
  providers.push(
    CredentialsProvider({
      id: "piloto",
      name: "Acceso piloto",
      credentials: { email: { label: "Correo", type: "email" }, pin: { label: "PIN", type: "password" } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.pin || !samePin(credentials.pin, process.env.PILOT_PIN!)) return null;
        const user = await findActiveUser(credentials.email);
        return user ? { id: user.id, email: user.email, name: user.name } : null;
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ user, account, profile }) {
      const p = profile as { email?: string; preferred_username?: string; upn?: string } | undefined;
      const email = user.email ?? p?.email ?? p?.preferred_username ?? p?.upn;
      const dbUser = await findActiveUser(email);
      if (!dbUser) return "/login?error=NoAutorizado";
      await prisma.user.update({ where: { id: dbUser.id }, data: { lastLoginAt: new Date() } });
      await writeAudit({
        user: dbUser,
        action: "login",
        entity: "Sesion",
        entityId: dbUser.id,
        summary: `Inicio de sesión (${account?.provider === "piloto" ? "acceso piloto" : account?.provider ?? "sso"})`,
      });
      user.email = dbUser.email;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await findActiveUser(user.email);
        if (dbUser) {
          token.uid = dbUser.id;
          token.role = dbUser.role;
          token.name = dbUser.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.uid as string | undefined;
        (session.user as { role?: string }).role = token.role as string | undefined;
      }
      return session;
    },
  },
};
