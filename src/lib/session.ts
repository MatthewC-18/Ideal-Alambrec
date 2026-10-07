import "server-only";
import type { Role, User } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import { authOptions } from "./auth";
import { prisma } from "./db";

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  return user?.active ? user : null;
});

export async function requireUser(check?: (role: Role) => boolean): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (check && !check(user.role)) redirect("/?error=permiso");
  return user;
}

export class ForbiddenError extends Error {
  constructor(message = "No tienes permiso para esta acción.") {
    super(message);
  }
}

export async function requireActionUser(check?: (role: Role) => boolean): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError("Tu sesión expiró. Vuelve a iniciar sesión.");
  if (check && !check(user.role)) throw new ForbiddenError();
  return user;
}
