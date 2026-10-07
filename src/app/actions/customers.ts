"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { requireActionUser } from "@/lib/session";
import { toActionError, type ActionResult } from "./result";

const customerSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Ingresa el nombre del contacto").max(150),
  company: z.string().trim().max(150).optional(),
  taxId: z.string().trim().max(20).optional(),
  email: z.union([z.literal(""), z.string().trim().email("Correo inválido")]).optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(250).optional(),
  city: z.string().trim().max(80).optional(),
  tierKey: z.string().min(1).max(40),
  notes: z.string().trim().max(1000).optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type CustomerDTO = { id: string; name: string; company: string | null; city: string | null; tierKey: string; email: string | null; phone: string | null; taxId: string | null; address: string | null; notes: string | null };

export async function saveCustomer(raw: CustomerInput): Promise<ActionResult<CustomerDTO>> {
  try {
    const user = await requireActionUser(can.createQuote);
    const input = customerSchema.parse(raw);
    const data = {
      name: input.name,
      company: input.company || null,
      taxId: input.taxId || null,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      city: input.city || null,
      tierKey: input.tierKey,
      notes: input.notes || null,
    };
    let c;
    if (input.id) {
      const before = await prisma.customer.findUniqueOrThrow({ where: { id: input.id } });
      c = await prisma.customer.update({ where: { id: input.id }, data });
      await writeAudit({ user, action: "editar", entity: "Cliente", entityId: c.id, summary: `Editó el cliente ${c.company || c.name}`, before, after: c });
    } else {
      c = await prisma.customer.create({ data: { ...data, createdById: user.id } });
      await writeAudit({ user, action: "crear", entity: "Cliente", entityId: c.id, summary: `Creó el cliente ${c.company || c.name}`, after: c });
    }
    revalidatePath("/clientes");
    return { ok: true, data: { id: c.id, name: c.name, company: c.company, city: c.city, tierKey: c.tierKey, email: c.email, phone: c.phone, taxId: c.taxId, address: c.address, notes: c.notes } };
  } catch (e) {
    return toActionError(e);
  }
}
