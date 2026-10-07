const money = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const number = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("es-EC", { notation: "compact", maximumFractionDigits: 1 });

export const fmtMoney = (n: number | string | { toString(): string }) => money.format(Number(n));
export const fmtNumber = (n: number | string | { toString(): string }, digits = 2) =>
  new Intl.NumberFormat("es-EC", { maximumFractionDigits: digits }).format(Number(n));
export const fmtQty = (n: number | string | { toString(): string }) => number.format(Number(n));
export const fmtCompactMoney = (n: number) => `$${compact.format(n)}`;
export const fmtPct = (n: number | string | { toString(): string }, digits = 1) =>
  `${new Intl.NumberFormat("es-EC", { maximumFractionDigits: digits }).format(Number(n) * 100)} %`;
export const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Guayaquil" }).format(new Date(d));
export const fmtDateTime = (d: Date | string) =>
  new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Guayaquil" }).format(new Date(d));
