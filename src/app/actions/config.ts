"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { purgeDemoData } from "@/lib/demo";
import { ruleSetSchema } from "@/lib/engine/types";
import { validateRules } from "@/lib/server/rules-validate";
import { loadWorkbook, parsePriceList, priceListName } from "@/lib/import/excel";
import { can } from "@/lib/permissions";
import { requireActionUser, ForbiddenError } from "@/lib/session";
import { settingSchemas, type SettingKey } from "@/lib/settings";
import { toActionError, type ActionResult } from "./result";

const r2 = (n: number) => Math.round(n * 100) / 100;

async function draftList(id: string) {
  const list = await prisma.priceList.findUnique({ where: { id } });
  if (!list) throw new ForbiddenError("La lista no existe.");
  if (list.status !== "BORRADOR") throw new ForbiddenError("Solo se pueden modificar listas en borrador.");
  return list;
}

export async function importPriceListAction(form: FormData): Promise<ActionResult<{ id: string; warnings: string[] }>> {
  try {
    const user = await requireActionUser(can.managePrices);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new ForbiddenError("Selecciona un archivo Excel.");
    if (file.size > 10 * 1024 * 1024) throw new ForbiddenError("El archivo supera 10 MB.");
    if (!/\.(xlsx|xlsm)$/i.test(file.name)) throw new ForbiddenError("El archivo debe ser .xlsx o .xlsm.");
    let parsed;
    try {
      parsed = parsePriceList(await loadWorkbook(Buffer.from(await file.arrayBuffer())), (form.get("sheet") as string) || undefined);
    } catch (e) {
      throw new ForbiddenError(`No se pudo leer el Excel: ${(e as Error).message}`);
    }
    const name = String(form.get("name") || "").trim() || priceListName(parsed.title, parsed.sheetName);
    const created = await prisma.$transaction(async (tx) => {
      const ids: Record<string, string> = {};
      for (const p of parsed.products) {
        const prod = await tx.product.upsert({
          where: { sap: p.sap },
          update: { name: p.name, family: p.family, finish: p.finish, weightKg: p.weightKg, sortOrder: p.sortOrder, active: true },
          create: { sap: p.sap, name: p.name, family: p.family, finish: p.finish, weightKg: p.weightKg, sortOrder: p.sortOrder },
        });
        ids[p.sap] = prod.id;
      }
      const list = await tx.priceList.create({
        data: {
          name,
          status: "BORRADOR",
          source: `Excel ${file.name} · hoja ${parsed.sheetName}`,
          createdById: user.id,
          tiers: { create: parsed.tiers },
          items: { create: parsed.products.map((p) => ({ productId: ids[p.sap], pvs: p.pvs })) },
        },
      });
      await writeAudit({ user, action: "importar", entity: "ListaPrecios", entityId: list.id, summary: `Importó "${name}" desde ${file.name} (${parsed.products.length} productos) como borrador` }, tx);
      return list;
    });
    revalidatePath("/configuracion/precios");
    return { ok: true, data: { id: created.id, warnings: parsed.warnings } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function createDraftFromList(sourceId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireActionUser(can.managePrices);
    const src = await prisma.priceList.findUniqueOrThrow({ where: { id: sourceId }, include: { items: true, tiers: true } });
    const list = await prisma.priceList.create({
      data: {
        name: src.name.replace(/\s*\(borrador\)$/, "") + " (borrador)",
        status: "BORRADOR",
        source: `Copia de ${src.name}`,
        createdById: user.id,
        tiers: { create: src.tiers.map(({ key, label, discountPct, sortOrder }) => ({ key, label, discountPct, sortOrder })) },
        items: { create: src.items.map(({ productId, pvs }) => ({ productId, pvs })) },
      },
    });
    await writeAudit({ user, action: "crear", entity: "ListaPrecios", entityId: list.id, summary: `Creó un borrador a partir de "${src.name}"` });
    revalidatePath("/configuracion/precios");
    return { ok: true, data: { id: list.id } };
  } catch (e) {
    return toActionError(e);
  }
}

const draftEditSchema = z.object({
  name: z.string().trim().min(3).max(120),
  notes: z.string().max(2000).optional(),
  tiers: z.array(z.object({ key: z.string(), discountPct: z.number().min(0).max(0.95) })),
  prices: z.array(z.object({ itemId: z.string(), pvs: z.number().min(0).max(1e7) })),
});

export async function saveDraftList(id: string, raw: z.infer<typeof draftEditSchema>): Promise<ActionResult> {
  try {
    const user = await requireActionUser(can.managePrices);
    await draftList(id);
    const input = draftEditSchema.parse(raw);
    await prisma.$transaction(async (tx) => {
      await tx.priceList.update({ where: { id }, data: { name: input.name, notes: input.notes || null } });
      for (const t of input.tiers) await tx.priceListTier.update({ where: { priceListId_key: { priceListId: id, key: t.key } }, data: { discountPct: t.discountPct } });
      for (const p of input.prices) await tx.priceListItem.update({ where: { id: p.itemId, priceListId: id }, data: { pvs: p.pvs } });
      await writeAudit({ user, action: "editar", entity: "ListaPrecios", entityId: id, summary: `Guardó el borrador "${input.name}" (${input.prices.length} precio(s) modificados)`, after: input }, tx);
    });
    revalidatePath(`/configuracion/precios/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e);
  }
}

export async function bulkAdjustDraft(id: string, family: string | null, pct: number): Promise<ActionResult<{ count: number }>> {
  try {
    const user = await requireActionUser(can.managePrices);
    await draftList(id);
    if (!(pct > -0.9 && pct < 5)) throw new ForbiddenError("El porcentaje debe estar entre −90 % y +500 %.");
    const items = await prisma.priceListItem.findMany({ where: { priceListId: id, ...(family ? { product: { family } } : {}) } });
    await prisma.$transaction(items.map((i) => prisma.priceListItem.update({ where: { id: i.id }, data: { pvs: r2(Number(i.pvs) * (1 + pct)) } })));
    await writeAudit({ user, action: "ajuste_masivo", entity: "ListaPrecios", entityId: id, summary: `Ajustó ${(pct * 100).toFixed(2)} % a ${items.length} precios${family ? ` de ${family}` : ""}` });
    revalidatePath(`/configuracion/precios/${id}`);
    return { ok: true, data: { count: items.length } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function publishPriceList(id: string): Promise<ActionResult> {
  try {
    const user = await requireActionUser(can.managePrices);
    const list = await draftList(id);
    const [items, active] = await Promise.all([
      prisma.priceListItem.findMany({ where: { priceListId: id } }),
      prisma.priceList.findFirst({ where: { status: "VIGENTE" }, include: { items: true } }),
    ]);
    if (items.length === 0) throw new ForbiddenError("La lista no tiene productos.");
    const prev = new Map(active?.items.map((i) => [i.productId, Number(i.pvs)]) ?? []);
    const changed = items.filter((i) => prev.has(i.productId) && Math.abs(prev.get(i.productId)! - Number(i.pvs)) > 1e-6).length;
    const added = items.filter((i) => !prev.has(i.productId)).length;
    await prisma.$transaction(async (tx) => {
      await tx.priceList.updateMany({ where: { status: "VIGENTE" }, data: { status: "ARCHIVADA" } });
      await tx.priceList.update({ where: { id }, data: { status: "VIGENTE", publishedAt: new Date(), publishedById: user.id } });
      await writeAudit(
        {
          user,
          action: "publicar",
          entity: "ListaPrecios",
          entityId: id,
          summary: `Publicó "${list.name}": ${changed} precio(s) cambiados, ${added} producto(s) nuevos${active ? `; reemplaza a "${active.name}"` : ""}`,
        },
        tx,
      );
    });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteDraftList(id: string): Promise<ActionResult> {
  try {
    const user = await requireActionUser(can.managePrices);
    const list = await draftList(id);
    await prisma.priceList.delete({ where: { id } });
    await writeAudit({ user, action: "eliminar", entity: "ListaPrecios", entityId: id, summary: `Eliminó el borrador "${list.name}"` });
    revalidatePath("/configuracion/precios");
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e);
  }
}

// ---------------------------------------------------------------- rules

export async function createRulesDraft(fromId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireActionUser(can.manageRules);
    const src = await prisma.ruleSet.findUniqueOrThrow({ where: { id: fromId } });
    const existing = await prisma.ruleSet.findFirst({ where: { status: "BORRADOR" } });
    if (existing) return { ok: true, data: { id: existing.id } };
    const last = await prisma.ruleSet.aggregate({ _max: { version: true } });
    const rs = await prisma.ruleSet.create({
      data: { version: (last._max.version ?? 0) + 1, status: "BORRADOR", data: src.data as Prisma.InputJsonValue, notes: `Basado en v${src.version}`, createdById: user.id },
    });
    await writeAudit({ user, action: "crear", entity: "ReglasCalculo", entityId: rs.id, summary: `Creó el borrador v${rs.version} de reglas a partir de v${src.version}` });
    revalidatePath("/configuracion/reglas");
    return { ok: true, data: { id: rs.id } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function saveRulesDraft(id: string, raw: unknown, notes: string): Promise<ActionResult<{ problems: string[] }>> {
  try {
    const user = await requireActionUser(can.manageRules);
    const rs = await prisma.ruleSet.findUniqueOrThrow({ where: { id } });
    if (rs.status !== "BORRADOR") throw new ForbiddenError("Solo se puede editar un borrador.");
    const data = ruleSetSchema.parse(raw);
    await prisma.ruleSet.update({ where: { id }, data: { data: data as Prisma.InputJsonValue, notes: notes.slice(0, 2000) } });
    await writeAudit({ user, action: "editar", entity: "ReglasCalculo", entityId: id, summary: `Guardó el borrador v${rs.version} de reglas`, before: rs.data, after: data });
    revalidatePath("/configuracion/reglas");
    return { ok: true, data: { problems: await validateRules(data) } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function publishRules(id: string): Promise<ActionResult> {
  try {
    const user = await requireActionUser(can.manageRules);
    const rs = await prisma.ruleSet.findUniqueOrThrow({ where: { id } });
    if (rs.status !== "BORRADOR") throw new ForbiddenError("Solo se puede publicar un borrador.");
    const data = ruleSetSchema.parse(rs.data);
    const problems = await validateRules(data);
    if (problems.length) throw new ForbiddenError(`Corrige las reglas antes de publicar: ${problems[0]}`);
    await prisma.$transaction(async (tx) => {
      await tx.ruleSet.updateMany({ where: { status: "VIGENTE" }, data: { status: "ARCHIVADA" } });
      await tx.ruleSet.update({ where: { id }, data: { status: "VIGENTE", publishedAt: new Date() } });
      await writeAudit({ user, action: "publicar", entity: "ReglasCalculo", entityId: id, summary: `Publicó las reglas de cálculo v${rs.version}` }, tx);
    });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteRulesDraft(id: string): Promise<ActionResult> {
  try {
    const user = await requireActionUser(can.manageRules);
    const rs = await prisma.ruleSet.findUniqueOrThrow({ where: { id } });
    if (rs.status !== "BORRADOR") throw new ForbiddenError("Solo se puede descartar un borrador.");
    await prisma.ruleSet.delete({ where: { id } });
    await writeAudit({ user, action: "eliminar", entity: "ReglasCalculo", entityId: id, summary: `Descartó el borrador v${rs.version} de reglas` });
    revalidatePath("/configuracion/reglas");
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e);
  }
}

// ---------------------------------------------------------------- users

const userSchema = z.object({
  id: z.string().optional(),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional(),
  role: z.enum(["ADMIN", "SUPERVISOR", "ASESOR", "LECTOR"]),
  active: z.boolean(),
});

export async function saveUser(raw: z.infer<typeof userSchema>): Promise<ActionResult> {
  try {
    const user = await requireActionUser(can.manageUsers);
    const input = userSchema.parse(raw);
    if (input.id === user.id && (!input.active || input.role !== "ADMIN")) throw new ForbiddenError("No puedes quitarte tu propio acceso de administrador.");
    const data = { email: input.email, name: input.name, phone: input.phone || null, role: input.role, active: input.active };
    if (input.id) {
      const before = await prisma.user.findUniqueOrThrow({ where: { id: input.id } });
      await prisma.user.update({ where: { id: input.id }, data });
      await writeAudit({ user, action: "editar", entity: "Usuario", entityId: input.id, summary: `Actualizó al usuario ${input.email}`, before: { role: before.role, active: before.active, name: before.name }, after: data });
    } else {
      const exists = await prisma.user.findUnique({ where: { email: input.email } });
      if (exists) throw new ForbiddenError("Ya existe un usuario con ese correo.");
      const u = await prisma.user.create({ data });
      await writeAudit({ user, action: "crear", entity: "Usuario", entityId: u.id, summary: `Dio acceso a ${input.email} como ${input.role}`, after: data });
    }
    revalidatePath("/configuracion/usuarios");
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e);
  }
}

// ---------------------------------------------------------------- settings

export async function saveSetting(key: SettingKey, value: unknown): Promise<ActionResult> {
  try {
    const user = await requireActionUser(can.manageSettings);
    if (!(key in settingSchemas)) throw new ForbiddenError("Configuración desconocida.");
    const parsed = settingSchemas[key].parse(value);
    const before = await prisma.setting.findUnique({ where: { key } });
    await prisma.setting.upsert({ where: { key }, update: { value: parsed, updatedById: user.id }, create: { key, value: parsed, updatedById: user.id } });
    const labels: Record<SettingKey, string> = { company: "datos de la empresa", quote: "parámetros de cotización", limits: "límites de descuento", email: "plantilla de correo" };
    await writeAudit({ user, action: "editar", entity: "Configuracion", entityId: key, summary: `Actualizó ${labels[key]}`, before: before?.value, after: parsed });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return toActionError(e);
  }
}

export async function purgeDemoAction(): Promise<ActionResult<{ quotes: number; customers: number; users: number }>> {
  try {
    const user = await requireActionUser(can.manageSettings);
    const res = await purgeDemoData(prisma);
    await writeAudit({ user, action: "eliminar", entity: "Configuracion", entityId: "demo", summary: `Eliminó los datos de demostración (${res.quotes} cotizaciones, ${res.customers} clientes; ${res.users} usuarios demo desactivados)` });
    revalidatePath("/", "layout");
    return { ok: true, data: res };
  } catch (e) {
    return toActionError(e);
  }
}
