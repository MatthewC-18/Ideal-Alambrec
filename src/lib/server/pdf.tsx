import "server-only";
import { readFileSync } from "fs";
import path from "path";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { fmtDate, fmtMoney, fmtNumber, fmtPct, fmtQty } from "@/lib/format";
import { ruleSetSchema } from "@/lib/engine/types";
import { segmentTitle } from "@/lib/engine/engine";

const BLUE = "#003da7";
const NAVY = "#294a8d";
const CYAN = "#00aeef";
const INK = "#0f1b2d";
const MUTED = "#6b7486";
const LINE = "#dfe5ee";

const s = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 56, paddingHorizontal: 36, fontSize: 9, fontFamily: "Helvetica", color: INK },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  logo: { width: 170 },
  docTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: BLUE, textAlign: "right" },
  docMeta: { fontSize: 9, color: MUTED, textAlign: "right", marginTop: 2 },
  rule: { height: 3, backgroundColor: CYAN, marginBottom: 2 },
  rule2: { height: 1, backgroundColor: NAVY, marginBottom: 12 },
  company: { fontSize: 8, color: MUTED, marginBottom: 12, lineHeight: 1.4 },
  boxes: { flexDirection: "row", gap: 10, marginBottom: 12 },
  box: { flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 4, padding: 8 },
  boxTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLUE, letterSpacing: 0.8, marginBottom: 4 },
  boxStrong: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  boxLine: { fontSize: 8.5, color: "#374151", marginBottom: 1.5 },
  intro: { marginBottom: 10 },
  segTitle: { backgroundColor: "#eef4ff", color: BLUE, fontFamily: "Helvetica-Bold", fontSize: 9, paddingVertical: 5, paddingHorizontal: 6, marginTop: 8 },
  subTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 0.6, paddingTop: 6, paddingBottom: 2, paddingHorizontal: 6 },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: NAVY, paddingVertical: 4, paddingHorizontal: 6, fontFamily: "Helvetica-Bold", fontSize: 7.5, color: NAVY },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: LINE, paddingVertical: 3.5, paddingHorizontal: 6 },
  cCode: { width: 52 },
  cDesc: { flex: 1, paddingRight: 6 },
  cQty: { width: 48, textAlign: "right" },
  cPrice: { width: 64, textAlign: "right" },
  cTotal: { width: 72, textAlign: "right" },
  totalsWrap: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, gap: 16 },
  notes: { flex: 1, fontSize: 8.5, lineHeight: 1.4 },
  totals: { width: 210 },
  tRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  tGrand: { flexDirection: "row", justifyContent: "space-between", backgroundColor: BLUE, color: "white", paddingVertical: 6, paddingHorizontal: 8, marginTop: 4, borderRadius: 3 },
  sign: { marginTop: 14, fontSize: 9 },
  footer: { position: "absolute", bottom: 22, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: MUTED, borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 6 },
});

let logoCache: Buffer | null = null;
function logo() {
  if (!logoCache) logoCache = readFileSync(path.join(process.cwd(), "public/brand/logo-ideal-alambrec-grupo-ag.png"));
  return logoCache;
}

export async function loadQuoteForPdf(id: string) {
  const q = await prisma.quote.findUnique({
    where: { id },
    include: { customer: true, owner: true, priceList: true, ruleSet: true, lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!q) return null;
  const settings = await getSettings();
  return { q, settings };
}

type PdfData = NonNullable<Awaited<ReturnType<typeof loadQuoteForPdf>>>;

function Row({ code, desc, qty, price, total }: { code: string; desc: string; qty: string; price: string; total: string }) {
  return (
    <View style={s.tr} wrap={false}>
      <Text style={s.cCode}>{code}</Text>
      <Text style={s.cDesc}>{desc}</Text>
      <Text style={s.cQty}>{qty}</Text>
      <Text style={s.cPrice}>{price}</Text>
      <Text style={s.cTotal}>{total}</Text>
    </View>
  );
}

function Head() {
  return (
    <View style={s.th}>
      <Text style={s.cCode}>CÓDIGO</Text>
      <Text style={s.cDesc}>DESCRIPCIÓN</Text>
      <Text style={s.cQty}>CANT.</Text>
      <Text style={s.cPrice}>P. UNITARIO</Text>
      <Text style={s.cTotal}>TOTAL</Text>
    </View>
  );
}

function QuoteDocument({ q, settings }: PdfData) {
  const c = settings.company;
  const rules = ruleSetSchema.safeParse(q.ruleSet.data);
  const input = q.input as { segments: { systemKey: string; length: number; height: number; placa: boolean; puas: boolean; incl: number; label?: string }[] };
  const segTitles = input.segments.map((seg) => {
    const sys = rules.success ? rules.data.systems.find((x) => x.key === seg.systemKey) : undefined;
    return seg.label?.trim() || (sys ? segmentTitle(sys, seg) : seg.systemKey);
  });
  const lineRow = (l: PdfData["q"]["lines"][number]) => (
    <Row key={l.id} code={l.sap ?? "—"} desc={l.description} qty={fmtQty(Number(l.qty))} price={fmtMoney(Number(l.unitPrice))} total={fmtMoney(Number(l.total))} />
  );
  const extras = q.lines.filter((l) => l.section === "extras");
  const customer = q.customer;
  const validUntil = new Date(q.createdAt.getTime() + q.validityDays * 86400000);

  return (
    <Document title={`Cotización ${q.number}`} author={c.name} subject={`Cotización ${q.number} — ${customer.company || customer.name}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={logo()} style={s.logo} />
          <View>
            <Text style={s.docTitle}>COTIZACIÓN</Text>
            <Text style={s.docMeta}>N.º {q.number}</Text>
            <Text style={s.docMeta}>Fecha: {fmtDate(q.createdAt)} · Válida hasta: {fmtDate(validUntil)}</Text>
          </View>
        </View>
        <View style={s.rule} />
        <View style={s.rule2} />
        <Text style={s.company}>
          {c.name} · R.U.C. {c.ruc} · {c.specialTaxpayer} · Tel. {c.phone}
          {"\n"}
          {c.addresses.join("  ·  ")}
        </Text>

        <View style={s.boxes}>
          <View style={s.box}>
            <Text style={s.boxTitle}>CLIENTE</Text>
            <Text style={s.boxStrong}>{customer.company || customer.name}</Text>
            {customer.company ? <Text style={s.boxLine}>Atención: {customer.name}</Text> : null}
            {customer.taxId ? <Text style={s.boxLine}>RUC/CI: {customer.taxId}</Text> : null}
            {customer.phone ? <Text style={s.boxLine}>Teléfono: {customer.phone}</Text> : null}
            {customer.email ? <Text style={s.boxLine}>Correo: {customer.email}</Text> : null}
            {customer.address || customer.city ? <Text style={s.boxLine}>{[customer.address, customer.city].filter(Boolean).join(", ")}</Text> : null}
          </View>
          <View style={s.box}>
            <Text style={s.boxTitle}>PROYECTO</Text>
            <Text style={s.boxStrong}>{q.projectSite || "Sitio de obra por confirmar"}</Text>
            <Text style={s.boxLine}>Asesor: {q.owner.name}</Text>
            <Text style={s.boxLine}>Categoría de precio: {q.tierKey}</Text>
            <Text style={s.boxLine}>{q.priceList.name}</Text>
            <Text style={s.boxLine}>Peso neto aprox.: {fmtNumber(Number(q.weightKg), 1)} kg</Text>
          </View>
        </View>

        <Text style={s.intro}>{settings.quote.intro}</Text>

        <Head />
        {segTitles.map((title, i) => {
          const segLines = q.lines.filter((l) => l.segmentIndex === i);
          const main = segLines.filter((l) => l.section === "principal");
          const add = segLines.filter((l) => l.section === "adicionales");
          return (
            <View key={i}>
              <Text style={s.segTitle} wrap={false}>
                {title}
              </Text>
              {main.map(lineRow)}
              {add.length > 0 && <Text style={s.subTitle}>MATERIALES ADICIONALES</Text>}
              {add.map(lineRow)}
            </View>
          );
        })}
        {extras.length > 0 && (
          <View>
            <Text style={s.segTitle} wrap={false}>
              Puertas, portones y otros
            </Text>
            {extras.map(lineRow)}
          </View>
        )}

        <View style={s.totalsWrap} wrap={false}>
          <View style={s.notes}>
            {q.notes ? (
              <>
                <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>Observaciones</Text>
                <Text style={{ marginBottom: 6 }}>{q.notes}</Text>
              </>
            ) : null}
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>Condiciones</Text>
            <Text>Duración de la oferta: {q.validityDays} días.</Text>
            {settings.quote.footer ? <Text>{settings.quote.footer}</Text> : null}
            <View style={s.sign}>
              <Text>Atentamente,</Text>
              <Text style={{ fontFamily: "Helvetica-Bold", marginTop: 10 }}>{q.owner.name}</Text>
              <Text>
                {q.owner.email}
                {q.owner.phone ? ` · ${q.owner.phone}` : ""}
              </Text>
              <Text style={{ color: BLUE, fontFamily: "Helvetica-Bold" }}>{c.name}</Text>
            </View>
          </View>
          <View style={s.totals}>
            <View style={s.tRow}>
              <Text>Subtotal</Text>
              <Text>{fmtMoney(Number(q.subtotal))}</Text>
            </View>
            {Number(q.discountTotal) > 0 && (
              <View style={s.tRow}>
                <Text>Descuento ({fmtPct(Number(q.globalDiscountPct))})</Text>
                <Text>-{fmtMoney(Number(q.discountTotal))}</Text>
              </View>
            )}
            <View style={s.tRow}>
              <Text>Base imponible</Text>
              <Text>{fmtMoney(Number(q.subtotal) - Number(q.discountTotal))}</Text>
            </View>
            <View style={s.tRow}>
              <Text>IVA {fmtPct(Number(q.ivaRate), 0)}</Text>
              <Text>{fmtMoney(Number(q.iva))}</Text>
            </View>
            <View style={s.tGrand}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>TOTAL</Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{fmtMoney(Number(q.total))}</Text>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>
            {c.name} · Grupo AG · Cotización {q.number}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderQuotePdf(id: string): Promise<{ buffer: Buffer; number: string } | null> {
  const data = await loadQuoteForPdf(id);
  if (!data) return null;
  const buffer = await renderToBuffer(<QuoteDocument {...data} />);
  return { buffer, number: data.q.number };
}
