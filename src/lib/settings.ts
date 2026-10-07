import { z } from "zod";
import { prisma } from "./db";

export const companySchema = z.object({
  name: z.string().min(1),
  ruc: z.string(),
  specialTaxpayer: z.string(),
  phone: z.string(),
  website: z.string(),
  addresses: z.array(z.string()),
});

export const quoteSettingsSchema = z.object({
  ivaRate: z.number().min(0).max(1),
  validityDays: z.number().int().min(1).max(365),
  intro: z.string(),
  defaultNotes: z.string(),
  footer: z.string(),
});

const roleLimits = z.object({ ASESOR: z.number().min(0).max(1), SUPERVISOR: z.number().min(0).max(1), ADMIN: z.number().min(0).max(1) });

export const limitsSchema = z.object({
  maxLivianos: z.number().min(0).max(1),
  maxPesados: z.number().min(0).max(1),
  priceOverride: roleLimits,
  globalDiscount: roleLimits,
});

export const emailSettingsSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});

export const DEFAULT_SETTINGS = {
  company: {
    name: "Ideal Alambrec S.A.",
    ruc: "1790050947001",
    specialTaxpayer: "Contribuyente especial No. 5368",
    phone: "593 02 2978100",
    website: "",
    addresses: [
      "Planta Quito: Calle S60 No. E3-423 y calle E3E",
      "Guayaquil: Av. Velasco Ibarra No. 101 y Calle Primera S.O. Bellavista (4) 220-4109",
      "Cuenca: Av. Pablo del Lago No. 2-13 y Cuicocha (7) 408-5669",
    ],
  },
  quote: {
    ivaRate: 0.15,
    validityDays: 15,
    intro: "Por medio de la presente y de acuerdo a la información por ustedes proporcionada, nos es grato poner a su consideración nuestra oferta por:",
    defaultNotes: "",
    footer: "Precios sujetos a cambio sin previo aviso. Disponibilidad sujeta a stock al momento de la orden de compra.",
  },
  limits: {
    maxLivianos: 0.2,
    maxPesados: 0.46,
    priceOverride: { ASESOR: 0.05, SUPERVISOR: 0.15, ADMIN: 1 },
    globalDiscount: { ASESOR: 0.03, SUPERVISOR: 0.1, ADMIN: 1 },
  },
  email: {
    subject: "Cotización {numero} — Ideal Alambrec",
    body:
      "Estimado/a {cliente}:\n\nAdjuntamos la cotización {numero} por un total de {total}, válida por {validez} días.\n\nQuedo atento/a a cualquier consulta.\n\nSaludos cordiales,\n{asesor}\n{telefono_asesor}\nIdeal Alambrec S.A.",
  },
};

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof Settings;

export const settingSchemas = {
  company: companySchema,
  quote: quoteSettingsSchema,
  limits: limitsSchema,
  email: emailSettingsSchema,
} satisfies Record<SettingKey, z.ZodTypeAny>;

export async function getSettings(): Promise<Settings> {
  const rows = await prisma.setting.findMany();
  const out = structuredClone(DEFAULT_SETTINGS) as Settings;
  for (const row of rows) {
    const key = row.key as SettingKey;
    if (!(key in settingSchemas)) continue;
    const parsed = settingSchemas[key].safeParse({ ...(DEFAULT_SETTINGS[key] as object), ...(row.value as object) });
    if (parsed.success) (out as Record<string, unknown>)[key] = parsed.data;
  }
  return out;
}
