export type ReceiptFields = {
  amount: number | null;
  transactionDate: string | null;
  description: string | null;
  category: string;
};

function validDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function receiptDate(text: string) {
  const iso = text.match(/\b(20\d{2})[\/.\-](0?[1-9]|1[0-2])[\/.\-]([0-2]?\d|3[01])\b/);
  if (iso) {
    const [, year, month, day] = iso.map(Number);
    if (validDate(year, month, day)) return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const local = text.match(/\b([0-2]?\d|3[01])[\/.\-](0?[1-9]|1[0-2])[\/.\-](\d{2}|20\d{2})\b/);
  if (!local) return null;
  const [, day, month, shortYear] = local.map(Number);
  let year = shortYear;
  if (year < 100) year += 2000;
  return validDate(year, month, day) ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
}

function moneyValue(raw: string) {
  let value = raw.toUpperCase().replace(/[O]/g, "0").replace(/[^0-9.,]/g, "");
  if (!value) return null;
  const lastDot = value.lastIndexOf(".");
  const lastComma = value.lastIndexOf(",");
  const lastSeparator = Math.max(lastDot, lastComma);
  if (lastSeparator >= 0 && value.length - lastSeparator - 1 === 2) value = value.slice(0, lastSeparator);
  const number = Number(value.replace(/[.,]/g, ""));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function amountsOnLine(line: string) {
  const matches = line.match(/(?:RP\.?\s*)?\d[\d\s.,]{1,18}/gi) || [];
  return matches.map(moneyValue).filter((value): value is number => value !== null && value <= 9_999_999_999);
}

function receiptAmount(lines: string[]) {
  const priorities = [
    /\b(grand\s*total|total\s*(bayar|akhir|belanja)|jumlah\s*(bayar|akhir))\b/i,
    /\b(total|jumlah)\b/i,
  ];
  for (const priority of priorities) {
    const candidates = lines
      .filter((line) => priority.test(line) && !/\b(sub\s*total|subtotal|kembali|kembalian|change)\b/i.test(line))
      .flatMap(amountsOnLine);
    if (candidates.length) return Math.max(...candidates);
  }
  return null;
}

function merchantName(lines: string[]) {
  return lines.find((line) => {
    const cleaned = line.trim();
    return cleaned.length >= 3 && cleaned.length <= 70 && /[A-ZÀ-ÿ]{2}/i.test(cleaned) && !/\b(struk|receipt|invoice|nota|alamat|telp|phone|tanggal|date|kasir|cashier|npwp|www\.|http|total)\b/i.test(cleaned);
  })?.replace(/\s+/g, " ").trim() || null;
}

function categoryFor(text: string) {
  if (/\b(kain|benang|resleting|ritsleting|kancing|tekstil|fabric)\b/i.test(text)) return "Bahan";
  if (/\b(pln|listrik|internet|wifi|pulsa|transport|bensin|parkir)\b/i.test(text)) return "Operasional";
  return "Lainnya";
}

export function extractReceiptFields(rawText: string): ReceiptFields {
  const text = rawText.replace(/\r/g, "");
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  return {
    amount: receiptAmount(lines),
    transactionDate: receiptDate(text),
    description: merchantName(lines),
    category: categoryFor(text),
  };
}
