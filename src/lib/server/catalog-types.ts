export type ClientCatalog = {
  priceListId: string;
  priceListName: string;
  tiers: { key: string; label: string; discountPct: number }[];
  products: { sap: string; name: string; family: string; finish: string | null; pvs: number; weightKg: number }[];
};
