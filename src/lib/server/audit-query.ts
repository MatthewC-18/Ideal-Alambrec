import "server-only";
import type { Prisma } from "@prisma/client";

export function auditWhere(sp: Record<string, string | undefined>): Prisma.AuditLogWhereInput {
  const and: Prisma.AuditLogWhereInput[] = [];
  if (sp.entidad) and.push({ entity: sp.entidad });
  if (sp.accion) and.push({ action: sp.accion });
  if (sp.usuario) and.push({ userId: sp.usuario });
  if (sp.desde) and.push({ at: { gte: new Date(`${sp.desde}T00:00:00-05:00`) } });
  if (sp.hasta) and.push({ at: { lte: new Date(`${sp.hasta}T23:59:59-05:00`) } });
  if (sp.q) and.push({ OR: [{ summary: { contains: sp.q, mode: "insensitive" } }, { userEmail: { contains: sp.q, mode: "insensitive" } }] });
  return { AND: and };
}

export const ENTITY_LABEL: Record<string, string> = {
  Cotizacion: "Cotización",
  Cliente: "Cliente",
  ListaPrecios: "Lista de precios",
  ReglasCalculo: "Reglas de cálculo",
  Usuario: "Usuario",
  Configuracion: "Configuración",
  Sesion: "Sesión",
};

export const ACTION_LABEL: Record<string, string> = {
  login: "Inicio de sesión",
  crear: "Crear",
  editar: "Editar",
  eliminar: "Eliminar",
  estado: "Cambio de estado",
  enviar: "Envío",
  descargar: "Descarga PDF",
  duplicar: "Duplicar",
  importar: "Importar",
  publicar: "Publicar",
  ajuste_masivo: "Ajuste masivo",
};
