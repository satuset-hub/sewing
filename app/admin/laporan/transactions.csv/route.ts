import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET() {
  await requireAdmin();
  const supabase = await createClient();
  const [payments, cash] = await Promise.all([
    supabase.from("payments").select("id,amount_received,paid_at,status,bookings(booking_code,profiles(full_name),class_themes(title))").eq("status", "VERIFIED"),
    supabase.from("cash_transactions").select("id,transaction_type,transaction_date,amount,category,description,receipt_path,created_at"),
  ]);
  if (payments.error || cash.error) return new Response("Gagal membuat laporan", { status: 500 });

  const paymentRows = (payments.data || []).map((payment: any) => ({
    date: payment.paid_at,
    type: "Uang masuk",
    category: "Kursus",
    description: `${payment.bookings?.profiles?.full_name || "Member"} · ${payment.bookings?.class_themes?.title || "Pembayaran kursus"}`,
    amount: payment.amount_received,
    source: "Pembayaran otomatis",
    reference: payment.bookings?.booking_code,
    receipt: "Tidak",
  }));
  const cashRows = (cash.data || []).map((transaction) => ({
    date: transaction.transaction_date,
    type: transaction.transaction_type === "INCOME" ? "Uang masuk" : "Uang keluar",
    category: transaction.category,
    description: transaction.description,
    amount: transaction.amount,
    source: transaction.receipt_path ? "Struk" : "Manual",
    reference: transaction.id,
    receipt: transaction.receipt_path ? "Ada" : "Tidak",
  }));
  const rows = [...paymentRows, ...cashRows].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const header = ["tanggal", "jenis", "kategori", "keterangan", "jumlah", "sumber", "referensi", "bukti_struk"];
  const lines = rows.map((row) => [row.date, row.type, row.category, row.description, row.amount, row.source, row.reference, row.receipt].map(csv).join(","));
  return new Response([header.join(","), ...lines].join("\r\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=rumah-jahit-siju-transactions.csv" } });
}
