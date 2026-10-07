import type { PrismaClient } from "@prisma/client";

// Removes the fictitious demo quotes/customers created by the seed. Demo users are deactivated
// (not deleted) because the append-only audit log may reference them.
export async function purgeDemoData(db: PrismaClient) {
  const quotes = await db.quote.deleteMany({ where: { isDemo: true } });
  const customers = await db.customer.deleteMany({ where: { isDemo: true, quotes: { none: {} } } });
  const users = await db.user.updateMany({ where: { isDemo: true }, data: { active: false } });
  return { quotes: quotes.count, customers: customers.count, users: users.count };
}
