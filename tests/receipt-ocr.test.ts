import { describe, expect, it } from "vitest";
import { extractReceiptFields } from "@/lib/receipt-ocr";

describe("ekstraksi OCR struk", () => {
  it("membaca total, tanggal lokal, merchant, dan kategori bahan", () => {
    expect(extractReceiptFields("TOKO KAIN MAJU\nTanggal 23/11/2026\nSubtotal Rp 125.000\nGRAND TOTAL Rp 135.000\nTunai Rp 150.000")).toEqual({
      amount: 135000,
      transactionDate: "2026-11-23",
      description: "TOKO KAIN MAJU",
      category: "Bahan",
    });
  });

  it("membaca format ISO dan nominal dengan desimal", () => {
    const result = extractReceiptFields("PLN MOBILE\n2026-11-20\nTOTAL BAYAR 250.000,00");
    expect(result.amount).toBe(250000);
    expect(result.transactionDate).toBe("2026-11-20");
    expect(result.category).toBe("Operasional");
  });

  it("tidak menebak nominal jika label total tidak ditemukan", () => {
    expect(extractReceiptFields("TOKO CONTOH\nTunai 100.000\nKembali 25.000").amount).toBeNull();
  });
});
