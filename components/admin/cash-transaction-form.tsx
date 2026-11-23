"use client";

import { useRef, useState } from "react";
import { Camera, ScanLine } from "lucide-react";
import { saveCashTransactionAction } from "@/app/actions";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractReceiptFields } from "@/lib/receipt-ocr";

export function CashTransactionForm({ today }: { today: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");

  async function scanReceipt() {
    const form = formRef.current;
    const file = form?.receipt.files?.[0];
    if (!form || !file) return setScanMessage("Pilih atau foto struk terlebih dahulu.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setScanMessage("Baca otomatis mendukung foto JPG, PNG, atau WebP. PDF tetap dapat disimpan sebagai bukti.");
    setScanning(true);
    setScanMessage("Menyiapkan OCR lokal…");
    let terminateWorker: (() => Promise<unknown>) | null = null;
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", undefined, {
        logger: ({ status, progress }) => {
          if (status === "recognizing text") setScanMessage(`Membaca tulisan… ${Math.round(progress * 100)}%`);
        },
      });
      terminateWorker = () => worker.terminate();
      await worker.setParameters({ preserve_interword_spaces: "1", user_defined_dpi: "300" });
      const { data } = await worker.recognize(file);
      const result = extractReceiptFields(data.text);
      if (result.amount) form.amount.value = String(Math.round(result.amount));
      if (result.transactionDate && /^\d{4}-\d{2}-\d{2}$/.test(result.transactionDate)) form.transactionDate.value = result.transactionDate;
      if (result.description) form.description.value = result.description.slice(0, 200);
      form.category.value = result.category;
      form.transactionType.value = "EXPENSE";
      setScanMessage(result.amount ? "Hasil OCR sudah diisikan. Periksa kembali sebelum menyimpan." : "Tulisan terbaca, tetapi baris TOTAL belum dikenali. Lengkapi nominal secara manual.");
    } catch (error) {
      console.error("Local receipt OCR failed", error);
      setScanMessage("Struk belum berhasil dibaca. Coba foto yang lebih terang dan lurus, atau isi manual.");
    } finally {
      if (terminateWorker) await terminateWorker();
      setScanning(false);
    }
  }

  return <form ref={formRef} action={saveCashTransactionAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
    <div>
      <Label htmlFor="transactionType">Jenis</Label>
      <select id="transactionType" name="transactionType" defaultValue="EXPENSE" className="h-11 w-full rounded-xl border bg-white px-3 text-sm" required>
        <option value="INCOME">Uang masuk</option>
        <option value="EXPENSE">Uang keluar</option>
      </select>
    </div>
    <div>
      <Label htmlFor="transactionDate">Tanggal</Label>
      <Input id="transactionDate" name="transactionDate" type="date" defaultValue={today} required />
    </div>
    <div>
      <Label htmlFor="amount">Nominal</Label>
      <Input id="amount" name="amount" type="number" inputMode="numeric" min="1" max="9999999999" step="1" placeholder="Contoh: 150000" required />
    </div>
    <div>
      <Label htmlFor="category">Kategori</Label>
      <Input id="category" name="category" list="cash-categories" maxLength={50} placeholder="Bahan / Jasa jahit" required />
      <datalist id="cash-categories"><option value="Kursus"/><option value="Jasa jahit"/><option value="Bahan"/><option value="Operasional"/><option value="Gaji / Honor"/><option value="Lainnya"/></datalist>
    </div>
    <div className="md:col-span-2">
      <Label htmlFor="description">Keterangan</Label>
      <Input id="description" name="description" minLength={2} maxLength={200} placeholder="Contoh: Beli benang dan resleting" required />
    </div>
    <div className="md:col-span-2 xl:col-span-4">
      <Label htmlFor="receipt">Foto struk <span className="font-normal text-muted">(opsional, maks. 5 MB)</span></Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input id="receipt" name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" className="h-auto py-2" />
        <Button type="button" variant="secondary" onClick={scanReceipt} disabled={scanning}><ScanLine className="size-4"/>{scanning ? "Membaca…" : "Baca struk"}</Button>
      </div>
      <p className="mt-2 text-xs text-muted">Pembacaan berjalan lokal di perangkat tanpa token. Foto tidak dikirim ke layanan OCR eksternal. Periksa hasilnya sebelum menyimpan.</p>
      {scanMessage && <p className="mt-1 text-xs font-semibold text-muted" role="status">{scanMessage}</p>}
    </div>
    <div className="flex items-end gap-3 md:col-span-2 xl:justify-end">
      <SubmitButton className="w-full sm:w-auto" pendingText="Menyimpan…"><Camera className="size-4"/>Simpan transaksi</SubmitButton>
    </div>
  </form>;
}
