import ExcelJS from "exceljs";

export type ImportedProduct = { sap: string; name: string; family: string; finish: string | null; weightKg: number; pvs: number; sortOrder: number };
export type ImportedTier = { key: string; label: string; discountPct: number; sortOrder: number };
export type ImportedPriceList = { sheetName: string; title: string; tiers: ImportedTier[]; products: ImportedProduct[]; warnings: string[] };
export type ImportedAdvisor = { name: string; email: string; phone: string | null };

function cellValue(v: ExcelJS.CellValue): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") {
    if ("result" in v) return (v as { result?: unknown }).result ?? null;
    if ("richText" in v) return (v as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join("");
    if ("text" in v) return (v as { text: string }).text;
    if (v instanceof Date) return v;
    if ("error" in v) return null;
  }
  return v;
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).replace(/\s+/g, " ").trim());
const numOrNull = (v: unknown) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v.replace(",", ".")))) return Number(v.replace(",", "."));
  return null;
};
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function priceListName(title: string, sheetName: string): string {
  const cleaned = title
    .toLowerCase()
    .replace(/lista de precios/g, "")
    .replace(/vigente/g, "")
    .replace(/\bde\s+(\d{4})/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? `Lista de precios ${cleaned}` : `Lista de precios ${sheetName}`;
}

export async function loadWorkbook(data: ArrayBuffer | Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as ArrayBuffer);
  return wb;
}

function findHeader(ws: ExcelJS.Worksheet) {
  for (let r = 1; r <= Math.min(ws.rowCount, 40); r++) {
    const row = ws.getRow(r);
    const cols: Record<string, number> = {};
    row.eachCell({ includeEmpty: false }, (cell, c) => {
      const t = norm(str(cellValue(cell.value)));
      if (t === "sap") cols.sap = c;
      else if (t === "producto") cols.name = c;
      else if (t.startsWith("peso")) cols.weight = c;
      else if (t === "acabado") cols.finish = c;
      else if (t === "pvs") cols.pvs = c;
    });
    if (cols.sap && cols.name && cols.pvs) return { row: r, cols };
  }
  return null;
}

export function listPriceSheets(wb: ExcelJS.Workbook): string[] {
  return wb.worksheets.filter((ws) => findHeader(ws)).map((ws) => ws.name);
}

export function parsePriceList(wb: ExcelJS.Workbook, sheetName?: string): ImportedPriceList {
  const candidates = listPriceSheets(wb);
  const name = sheetName ?? candidates.find((n) => /^CP_/i.test(n)) ?? candidates[0];
  if (!name) throw new Error("No se encontró una hoja con columnas SAP / Producto / PVS.");
  const ws = wb.getWorksheet(name);
  if (!ws) throw new Error(`La hoja "${name}" no existe.`);
  const header = findHeader(ws);
  if (!header) throw new Error(`La hoja "${name}" no tiene encabezados SAP / Producto / PVS.`);
  const { row: hr, cols } = header;
  const warnings: string[] = [];

  let title = "";
  for (let r = 1; r < hr; r++) {
    ws.getRow(r).eachCell((cell) => {
      const t = str(cellValue(cell.value));
      if (!title && /lista de precios/i.test(t)) title = t;
    });
  }

  // Tier columns sit between ACABADO and PVS; their discount % is on the row right below the header.
  const tiers: ImportedTier[] = [];
  const firstTierCol = (cols.finish ?? cols.weight ?? cols.name) + 1;
  const pctRow = ws.getRow(hr + 1);
  for (let c = firstTierCol; c < cols.pvs; c++) {
    const label = str(cellValue(ws.getRow(hr).getCell(c).value));
    if (!label) continue;
    const pct = numOrNull(cellValue(pctRow.getCell(c).value));
    if (pct === null) {
      warnings.push(`No se encontró el % de descuento para la categoría "${label}"; se usó 0 %.`);
    }
    tiers.push({ key: label, label, discountPct: pct ?? 0, sortOrder: tiers.length });
  }
  tiers.push({ key: "PVS", label: "PVS", discountPct: 0, sortOrder: tiers.length });

  const products: ImportedProduct[] = [];
  const seen = new Set<string>();
  let family = "General";
  for (let r = hr + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const sapRaw = cellValue(row.getCell(cols.sap).value);
    const nameV = str(cellValue(row.getCell(cols.name).value));
    const sapNum = numOrNull(sapRaw);
    const first = str(cellValue(row.getCell(1).value));
    if (sapNum === null) {
      if (first && !nameV && first.length > 3 && !/^(s|mto|\d+)$/i.test(first)) family = first;
      continue;
    }
    const sap = String(Math.trunc(sapNum));
    const pvs = numOrNull(cellValue(row.getCell(cols.pvs).value));
    if (!nameV || pvs === null) {
      warnings.push(`Fila ${r}: SAP ${sap} sin nombre o sin PVS; se omitió.`);
      continue;
    }
    if (seen.has(sap)) continue;
    seen.add(sap);
    products.push({
      sap,
      name: nameV,
      family,
      finish: cols.finish ? str(cellValue(row.getCell(cols.finish).value)) || null : null,
      weightKg: cols.weight ? numOrNull(cellValue(row.getCell(cols.weight).value)) ?? 0 : 0,
      pvs,
      sortOrder: products.length,
    });
  }
  if (products.length === 0) throw new Error(`La hoja "${name}" no tiene productos con código SAP y PVS.`);
  return { sheetName: name, title, tiers, products, warnings };
}

export function parseAdvisors(wb: ExcelJS.Workbook): ImportedAdvisor[] {
  const out: ImportedAdvisor[] = [];
  const seen = new Set<string>();
  for (const ws of wb.worksheets) {
    ws.eachRow((row) => {
      const cells = (row.values as ExcelJS.CellValue[]).map((v) => str(cellValue(v)));
      for (let i = 0; i < cells.length - 1; i++) {
        const email = cells[i + 1];
        if (cells[i] && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email) && !/@gmail\.com$/i.test(email)) {
          const key = email.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ name: cells[i], email: key, phone: cells[i + 2]?.replace(/^[´'`]+/, "") || null });
        }
      }
    });
  }
  return out;
}
