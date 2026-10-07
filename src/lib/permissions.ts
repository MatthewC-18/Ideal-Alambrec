import type { Role } from "@prisma/client";

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor comercial",
  ASESOR: "Asesor comercial",
  LECTOR: "Solo lectura",
};

export const can = {
  createQuote: (r: Role) => r !== "LECTOR",
  seeAllQuotes: (r: Role) => r !== "ASESOR",
  editAnyQuote: (r: Role) => r === "ADMIN" || r === "SUPERVISOR",
  managePrices: (r: Role) => r === "ADMIN" || r === "SUPERVISOR",
  manageRules: (r: Role) => r === "ADMIN" || r === "SUPERVISOR",
  manageUsers: (r: Role) => r === "ADMIN",
  manageSettings: (r: Role) => r === "ADMIN",
  seeAudit: (r: Role) => r !== "ASESOR",
};
