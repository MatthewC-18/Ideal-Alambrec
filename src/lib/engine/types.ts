import { z } from "zod";

export const pricingModes = ["tier", "livianos", "pesados", "pvs"] as const;
export type PricingMode = (typeof pricingModes)[number];

const paramValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const heightSchema = z.object({
  value: z.number().positive(),
  label: z.string().min(1),
  params: z.record(paramValue),
});

const baseLine = {
  id: z.string().regex(/^[a-z0-9_]+$/, "Solo minúsculas, números y _"),
  label: z.string().min(1),
  section: z.enum(["principal", "adicionales"]),
  when: z.string().optional(),
  pricing: z.enum(pricingModes).default("tier"),
};

export const productLineSchema = z.object({
  ...baseLine,
  kind: z.literal("product"),
  sku: z.string().min(1),
  qty: z.string().min(1),
});

export const rollsLineSchema = z.object({
  ...baseLine,
  kind: z.literal("rolls"),
  meters: z.string().min(1),
  rolls: z.array(z.object({ meters: z.number().positive(), sku: z.string().min(1) })).min(1),
});

export const lineSchema = z.discriminatedUnion("kind", [productLineSchema, rollsLineSchema]);

export const systemSchema = z.object({
  key: z.string().regex(/^[A-Z_]+$/),
  name: z.string().min(1),
  tagline: z.string().default(""),
  coating: z.string().default(""),
  finish: z.string().default(""),
  image: z.string().optional(),
  active: z.boolean().default(true),
  options: z.object({ placa: z.boolean(), puas: z.boolean(), inclinacion: z.boolean() }),
  heights: z.array(heightSchema).min(1),
  variables: z.array(z.object({ name: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/), label: z.string(), expr: z.string().min(1) })),
  lines: z.array(lineSchema),
  checks: z.array(z.object({ when: z.string().min(1), level: z.enum(["error", "warning"]), message: z.string().min(1) })),
});

export const ruleSetSchema = z.object({
  systems: z.array(systemSchema).min(1),
});

export type HeightRule = z.infer<typeof heightSchema>;
export type LineRule = z.infer<typeof lineSchema>;
export type SystemRule = z.infer<typeof systemSchema>;
export type RuleSetData = z.infer<typeof ruleSetSchema>;

export type PriceBook = {
  tierPct: number;
  products: Record<string, { name: string; pvs: number; weightKg: number; family?: string }>;
};

export type SegmentInput = {
  systemKey: string;
  length: number;
  height: number;
  placa: boolean;
  puas: boolean;
  incl: number;
  label?: string;
  overrides?: Record<string, { qty?: number; unitPrice?: number }>;
};

export type ExtraLineInput = {
  id: string;
  sap?: string;
  description?: string;
  qty: number;
  unitPrice?: number;
  weightKg?: number;
};

export type QuoteInput = {
  segments: SegmentInput[];
  extras: ExtraLineInput[];
  descLivianos: number;
  descPesados: number;
  globalDiscountPct: number;
  ivaRate: number;
};

export type CalcLine = {
  key: string;
  segmentIndex: number | null;
  section: "principal" | "adicionales" | "extras";
  source: "regla" | "catalogo" | "libre";
  ruleLineId?: string;
  sap: string | null;
  description: string;
  qty: number;
  calcQty: number;
  unitPvs: number | null;
  listPrice: number | null;
  unitPrice: number;
  total: number;
  weightKg: number;
  pricing: PricingMode | "manual";
  priceOverride: boolean;
  qtyOverride: boolean;
};

export type CalcMessage = { level: "error" | "warning"; message: string; segmentIndex: number | null; fromCheck?: boolean };

export type SegmentResult = {
  index: number;
  systemKey: string;
  systemName: string;
  title: string;
  variables: { name: string; label: string; value: number | string | boolean | null }[];
  subtotal: number;
};

export type QuoteResult = {
  lines: CalcLine[];
  segments: SegmentResult[];
  messages: CalcMessage[];
  subtotal: number;
  discountTotal: number;
  taxable: number;
  iva: number;
  total: number;
  weightKg: number;
  ok: boolean;
};
