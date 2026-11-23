"use client";

import { useRef, useState } from "react";
import { Camera, FolderOpen, Save, Upload } from "lucide-react";
import { saveCashTransactionAction } from "@/app/actions";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractReceiptFields } from "@/lib/receipt-ocr";

export function CashTransactionForm({ today }: { today: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState("");
  const [scanMessage, setScanMessage] = useState("");

  async function scanReceipt(file: File) {
    const form = formRef.current;
    if (!form) return;
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
      setScanMessage(result.amount ? "Hasil OCR sudah diisikan. Periksa kembali sebelum menyimpan." : "Foto terpilih, tetapi baris TOTAL belum dikenali. Lengkapi nominal secara manual.");
    } catch (error) {
      console.error("Local receipt OCR failed", error);
      setScanMessage("Foto tersimpan sebagai pilihan, tetapi OCR gagal. Isi data manual atau coba foto yang lebih terang.");
    } finally {
      if (terminateWorker) await terminateWorker();
      setScanning(false);
    }
  }

  function selectReceipt(file: File | undefined, source: "folder" | "camera") {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setScanMessage("Ukuran foto maksimal 5 MB.");
      if (source === "folder" && folderInputRef.current) folderInputRef.current.value = "";
      if (source === "camera" && cameraInputRef.current) cameraInputRef.current.value = "";
      return;
    }
    if (source === "folder" && cameraInputRef.current) cameraInputRef.current.value = "";
    if (source === "camera" && folderInputRef.current) folderInputRef.current.value = "";
    setUploadMenuOpen(false);
    setSelectedFile(file.name);
    void scanReceipt(file);
  }

  return <form ref={formRef} action={saveCashTransactionAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
    <div>
      <Label htmlFor="transactionType">Jenis</Label>
      <select id="transactionType" name="transactionType" defaultValue="EXPENSE" className="h-11 w-full rounded-xl border bg-white px-3 text-sm" required>
        <option value="INCOME">Uang masuk</option><option value="EXPENSE">Uang keluar</option>
      </select>
    </div>
    <div><Label htmlFor="transactionDate">Tanggal</Label><Input id="transactionDate" name="transactionDate" type="date" defaultValue={today} required /></div>
    <div><Label htmlFor="amount">Nominal</Label><Input id="amount" name="amount" type="number" inputMode="numeric" min="1" max="9999999999" step="1" placeholder="Contoh: 150000" required /></div>
    <div>
      <Label htmlFor="category">Kategori</Label><Input id="category" name="category" list="cash-categories" maxLength={50} placeholder="Bahan / Jasa jahit" required />
      <datalist id="cash-categories"><option value="Kursus"/><option value="Jasa jahit"/><option value="Bahan"/><option value="Operasional"/><option value="Gaji / Honor"/><option value="Lainnya"/></datalist>
    </div>
    <div className="md:col-span-2"><Label htmlFor="description">Keterangan</Label><Input id="description" name="description" minLength={2} maxLength={200} placeholder="Contoh: Beli benang dan resleting" required /></div>

    <div className="md:col-span-2 xl:col-span-6">
      <input ref={folderInputRef} name="receipt" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => selectReceipt(event.target.files?.[0], "folder")} />
      <input ref={cameraInputRef} name="receipt" type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => selectReceipt(event.target.files?.[0], "camera")} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-h-10 text-xs text-muted">
          {selectedFile && <p className="font-semibold text-espresso">Struk: {selectedFile}</p>}
          <p>{scanMessage || "Foto struk opsional, maksimal 5 MB. OCR berjalan otomatis setelah foto dipilih."}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative">
            <Button type="button" variant="secondary" onClick={() => setUploadMenuOpen((open) => !open)} disabled={scanning}><Upload className="size-4"/>{scanning ? "Membaca…" : "Upload"}</Button>
            {uploadMenuOpen && <div className="absolute bottom-full right-0 z-10 mb-2 w-44 rounded-2xl border bg-white p-2 shadow-xl">
              <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-cream" onClick={() => folderInputRef.current?.click()}><FolderOpen className="size-4"/>Dari folder</button>
              <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-cream" onClick={() => cameraInputRef.current?.click()}><Camera className="size-4"/>Kamera</button>
            </div>}
          </div>
          <SubmitButton disabled={scanning} pendingText="Menyimpan…"><Save className="size-4"/>Simpan</SubmitButton>
        </div>
      </div>
    </div>
  </form>;
}
