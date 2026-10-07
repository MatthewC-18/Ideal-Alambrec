import { existsSync, readFileSync } from "fs";
import { PrismaClient, type QuoteStatus, type Role } from "@prisma/client";
import { calculateQuote } from "../src/lib/engine/engine";
import { DEFAULT_RULES } from "../src/lib/engine/default-rules";
import type { ExtraLineInput, PriceBook, SegmentInput } from "../src/lib/engine/types";
import { loadWorkbook, parseAdvisors, parsePriceList, priceListName } from "../src/lib/import/excel";
import { purgeDemoData } from "../src/lib/demo";

const prisma = new PrismaClient();

const PILOT_USERS: { email: string; name: string; role: Role; phone?: string }[] = [
  { email: "admin@piloto.local", name: "Administrador Piloto", role: "ADMIN" },
  { email: "supervisor@piloto.local", name: "Supervisor Piloto", role: "SUPERVISOR" },
  { email: "asesor@piloto.local", name: "Asesor Piloto", role: "ASESOR", phone: "+593 99 000 0000" },
  { email: "gerencia@piloto.local", name: "Gerencia (solo lectura)", role: "LECTOR" },
];

const DEMO_ADVISORS = [
  { email: "carla.demo@piloto.local", name: "Carla Méndez (demo)", phone: "+593 99 000 0001" },
  { email: "diego.demo@piloto.local", name: "Diego Salazar (demo)", phone: "+593 99 000 0002" },
  { email: "valeria.demo@piloto.local", name: "Valeria Torres (demo)", phone: "+593 99 000 0003" },
  { email: "andres.demo@piloto.local", name: "Andrés Villacís (demo)", phone: "+593 99 000 0004" },
];

const DEMO_CUSTOMERS: [string, string, string, string][] = [
  ["Constructora Andina del Valle (demo)", "Quito", "Distribuidor", "Ing. Paola Ruiz"],
  ["Urbanización Los Arrayanes (demo)", "Cumbayá", "PVS", "Administración"],
  ["Hacienda San Isidro (demo)", "Machachi", "Detallista", "Sr. Jorge Cevallos"],
  ["Ferretería El Perno (demo)", "Ambato", "Mayorista", "Sra. Lucía Pérez"],
  ["Cercados del Pacífico (demo)", "Guayaquil", "CercaSolu", "Ing. Marco León"],
  ["Mallas y Cercas Austro (demo)", "Cuenca", "Mallero", "Sr. Fabián Ordóñez"],
  ["Parque Industrial Norte (demo)", "Quito", "PVS", "Arq. Daniela Mora"],
  ["Colegio Nuevo Horizonte (demo)", "Ibarra", "PVS", "Lic. Ramiro Vega"],
  ["Franquicia CercasPro Manta (demo)", "Manta", "Franquicia", "Sr. Óscar Zambrano"],
  ["Agrícola Las Palmas (demo)", "Santo Domingo", "Detallista", "Ing. Rosa Andrade"],
  ["Condominio Vista Hermosa (demo)", "Samborondón", "PVS", "Administración"],
  ["Distribuidora La Sierra (demo)", "Riobamba", "Distribuidor", "Sr. Hugo Naranjo"],
  ["Bodegas Logísticas Sur (demo)", "Quito", "PVS", "Ing. Tatiana Ríos"],
  ["Club Deportivo Los Pinos (demo)", "Loja", "PVS", "Sr. Esteban Paz"],
  ["Ferrecentro Costa (demo)", "Portoviejo", "Mayorista", "Sra. Gabriela Loor"],
  ["Planta de Tratamiento Ríos (demo)", "Latacunga", "PVS", "Ing. Iván Guerrero"],
  ["Residencial El Bosque (demo)", "Tumbaco", "PVS", "Administración"],
  ["Cercas Express (demo)", "Quevedo", "CercaSolu", "Sr. Luis Bravo"],
  ["Granja Avícola Cotopaxi (demo)", "Salcedo", "Detallista", "Ing. Nelly Toapanta"],
  ["Subestación Eléctrica Norte (demo)", "Otavalo", "PVS", "Ing. Patricio Haro"],
  ["Inmobiliaria Altos del Sur (demo)", "Cuenca", "Distribuidor", "Arq. Felipe Malo"],
  ["Ferretería San Gabriel (demo)", "Tulcán", "Mayorista", "Sr. Wilson Pozo"],
];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

async function main() {
  const excelPath = process.env.SEED_EXCEL_PATH || "legacy/Cotizador_PRO_V6R02-2026.xlsm";
  if (!existsSync(excelPath)) throw new Error(`No se encontró el Excel de origen en ${excelPath} (variable SEED_EXCEL_PATH).`);
  const wb = await loadWorkbook(readFileSync(excelPath));

  // Users
  for (const u of PILOT_USERS) {
    await prisma.user.upsert({ where: { email: u.email }, update: {}, create: { ...u, isDemo: false } });
  }
  const advisors = parseAdvisors(wb).filter((a) => !a.email.endsWith("@bekaert.com"));
  for (const a of advisors) {
    await prisma.user.upsert({ where: { email: a.email }, update: {}, create: { email: a.email, name: a.name, phone: a.phone, role: "ASESOR" } });
  }
  console.log(`Usuarios: ${PILOT_USERS.length} de piloto + ${advisors.length} asesores importados del Excel`);
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@piloto.local" } });

  // Price list
  let priceList = await prisma.priceList.findFirst({ where: { status: "VIGENTE" }, include: { tiers: true, items: { include: { product: true } } } });
  if (!priceList) {
    const pl = parsePriceList(wb);
    for (const p of pl.products) {
      await prisma.product.upsert({
        where: { sap: p.sap },
        update: {},
        create: { sap: p.sap, name: p.name, family: p.family, finish: p.finish, weightKg: p.weightKg, sortOrder: p.sortOrder },
      });
    }
    const products = await prisma.product.findMany();
    const bySap = new Map(products.map((p) => [p.sap, p.id]));
    const created = await prisma.priceList.create({
      data: {
        name: priceListName(pl.title, pl.sheetName),
        status: "VIGENTE",
        source: `Excel ${excelPath.split("/").pop()} · hoja ${pl.sheetName}`,
        createdById: admin.id,
        publishedById: admin.id,
        publishedAt: new Date(),
        tiers: { create: pl.tiers },
        items: { create: pl.products.map((p) => ({ productId: bySap.get(p.sap)!, pvs: p.pvs })) },
      },
    });
    await prisma.auditLog.create({
      data: { userId: admin.id, userEmail: admin.email, action: "importar", entity: "ListaPrecios", entityId: created.id, summary: `Importó ${pl.products.length} productos y ${pl.tiers.length} categorías desde ${pl.sheetName}` },
    });
    priceList = await prisma.priceList.findUniqueOrThrow({ where: { id: created.id }, include: { tiers: true, items: { include: { product: true } } } });
    console.log(`Lista de precios: ${pl.products.length} productos, ${pl.tiers.length} categorías`);
  }

  // Rules
  let ruleSet = await prisma.ruleSet.findFirst({ where: { status: "VIGENTE" } });
  if (!ruleSet) {
    ruleSet = await prisma.ruleSet.create({
      data: { version: 1, status: "VIGENTE", data: DEFAULT_RULES, notes: "Reglas transcritas del Cotizador PRO V6R02-2026 (hoja Calculo).", createdById: admin.id, publishedAt: new Date() },
    });
    console.log("Reglas de cálculo v1 publicadas");
  }

  if (process.env.SEED_DEMO_DATA !== "true") return;
  if (process.env.SEED_RESET_DEMO === "true") console.log("Demo anterior eliminada:", await purgeDemoData(prisma));
  if ((await prisma.quote.count({ where: { isDemo: true } })) > 0) {
    console.log("Datos de demostración ya existen; no se duplican.");
    return;
  }

  const rand = rng(20261007);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const demoUsers = [];
  for (const d of DEMO_ADVISORS) {
    demoUsers.push(await prisma.user.upsert({ where: { email: d.email }, update: { active: true }, create: { ...d, role: "ASESOR", isDemo: true } }));
  }
  demoUsers.push(await prisma.user.findUniqueOrThrow({ where: { email: "asesor@piloto.local" } }));

  const customers = [];
  for (const [company, city, tier, contact] of DEMO_CUSTOMERS) {
    customers.push(
      await prisma.customer.create({
        data: {
          name: contact,
          company,
          city,
          tierKey: priceList.tiers.some((t) => t.key === tier) ? tier : "PVS",
          email: `compras@${company.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "").slice(0, 18)}.demo`,
          phone: `+593 2 ${Math.floor(2000000 + rand() * 7999999)}`,
          address: `${city}, Ecuador`,
          isDemo: true,
          createdById: pick(demoUsers).id,
        },
      }),
    );
  }

  const bookFor = (tierKey: string): PriceBook => ({
    tierPct: Number(priceList!.tiers.find((t) => t.key === tierKey)?.discountPct ?? 0),
    products: Object.fromEntries(priceList!.items.map((i) => [i.product.sap, { name: i.product.name, pvs: Number(i.pvs), weightKg: Number(i.product.weightKg) }])),
  });

  const segmentFor = (): SegmentInput => {
    const r = rand();
    if (r < 0.55) {
      const height = pick([1.11, 2.08, 2.08, 2.08, 2.4, 2.4, 3.05]);
      return { systemKey: "PERIMETRAL", length: Math.round(20 + rand() * 380), height, placa: height < 3 && rand() < 0.25, puas: height > 2 && rand() < 0.35, incl: pick([0, 0, 0, 0.05, 0.1]) };
    }
    if (r < 0.75) return { systemKey: "URBANA", length: Math.round(15 + rand() * 200), height: 2.08, placa: false, puas: rand() < 0.3, incl: pick([0, 0, 0.05]) };
    if (r < 0.9) return { systemKey: "INTRADOMICILIARIA", length: Math.round(8 + rand() * 60), height: 1.25, placa: false, puas: false, incl: 0 };
    return { systemKey: "MAXIMA_SEGURIDAD", length: Math.round(40 + rand() * 300), height: pick([2.1, 2.45, 3]), placa: false, puas: false, incl: pick([0, 0.05]) };
  };

  const now = new Date();
  const counters = new Map<number, number>();
  const gates = ["189212", "189218", "189149", "189150", "189163", "189165"];
  let made = 0;
  for (let i = 0; i < 170; i++) {
    const daysAgo = Math.floor(Math.pow(rand(), 1.5) * 330);
    const createdAt = new Date(now.getTime() - daysAgo * 86400000 - Math.floor(rand() * 8) * 3600000);
    const customer = pick(customers);
    const owner = pick(demoUsers);
    const segments = [segmentFor()];
    if (rand() < 0.15) segments.push(segmentFor());
    const extras: ExtraLineInput[] = [];
    if (rand() < 0.35) extras.push({ id: "g1", sap: pick(gates), qty: 1 + Math.floor(rand() * 2) });
    if (rand() < 0.2) extras.push({ id: "t1", description: "Transporte a obra", qty: 1, unitPrice: 60 + Math.round(rand() * 140) });
    const res = calculateQuote(DEFAULT_RULES, bookFor(customer.tierKey), { segments, extras, descLivianos: 0, descPesados: 0, globalDiscountPct: 0, ivaRate: 0.15 });
    if (!res.ok) continue;

    let status: QuoteStatus;
    const s = rand();
    if (daysAgo < 10) status = s < 0.45 ? "BORRADOR" : "ENVIADA";
    else if (daysAgo < 30) status = s < 0.15 ? "BORRADOR" : s < 0.6 ? "ENVIADA" : s < 0.85 ? "ACEPTADA" : "RECHAZADA";
    else if (daysAgo < 45) status = s < 0.4 ? "ACEPTADA" : s < 0.6 ? "RECHAZADA" : s < 0.75 ? "VENCIDA" : "ENVIADA";
    else status = s < 0.45 ? "ACEPTADA" : s < 0.7 ? "RECHAZADA" : "VENCIDA";

    const year = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "America/Guayaquil" }).format(createdAt));
    counters.set(year, (counters.get(year) ?? 0) + 1);
    const sentAt = status === "BORRADOR" ? null : new Date(createdAt.getTime() + 3600000 * (1 + rand() * 30));
    const decidedAt = status === "ACEPTADA" || status === "RECHAZADA" ? new Date(createdAt.getTime() + 86400000 * (2 + rand() * 12)) : null;
    const tier = priceList.tiers.find((t) => t.key === customer.tierKey)!;

    await prisma.quote.create({
      data: {
        number: `DEMO-${year}-${String(counters.get(year)).padStart(4, "0")}`,
        status,
        customerId: customer.id,
        ownerId: owner.id,
        priceListId: priceList.id,
        ruleSetId: ruleSet.id,
        tierKey: tier.key,
        tierPct: tier.discountPct,
        ivaRate: 0.15,
        projectSite: `${customer.city} — obra ${1 + Math.floor(rand() * 40)}`,
        validityDays: 15,
        input: JSON.parse(JSON.stringify({ segments, extras })),
        subtotal: res.subtotal,
        discountTotal: res.discountTotal,
        iva: res.iva,
        total: res.total,
        weightKg: res.weightKg,
        isDemo: true,
        sentAt,
        decidedAt,
        createdAt,
        updatedAt: decidedAt ?? sentAt ?? createdAt,
        lines: {
          create: res.lines.map((l, idx) => ({
            sortOrder: idx,
            segmentIndex: l.segmentIndex,
            section: l.section,
            source: l.source,
            ruleLineId: l.ruleLineId ?? null,
            sap: l.sap,
            description: l.description,
            qty: l.qty,
            unitPvs: l.unitPvs,
            listPrice: l.listPrice,
            unitPrice: l.unitPrice,
            total: l.total,
            weightKg: Math.round(l.qty * l.weightKg * 1000) / 1000,
          })),
        },
      },
    });
    made++;
  }
  console.log(`Datos de demostración: ${customers.length} clientes y ${made} cotizaciones (marcadas como demo)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
