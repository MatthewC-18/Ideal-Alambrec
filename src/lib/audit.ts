import type { Prisma, User } from "@prisma/client";
import { prisma } from "./db";

type AuditInput = {
  user: Pick<User, "id" | "email"> | null;
  action: string;
  entity: string;
  entityId?: string | null;
  summary: string;
  before?: unknown;
  after?: unknown;
};

async function requestMeta() {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
    return { ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
  } catch {
    return { ip: null, userAgent: null };
  }
}

const toJson = (v: unknown) => (v === undefined ? undefined : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue));

export async function writeAudit(input: AuditInput, tx: Prisma.TransactionClient = prisma) {
  const meta = await requestMeta();
  await tx.auditLog.create({
    data: {
      userId: input.user?.id ?? null,
      userEmail: input.user?.email ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      summary: input.summary,
      before: toJson(input.before),
      after: toJson(input.after),
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  });
}
