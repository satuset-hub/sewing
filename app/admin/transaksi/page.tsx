import Link from "next/link";
import { Paperclip } from "lucide-react";
import { CashTransactionForm } from "@/components/admin/cash-transaction-form";
import { MonthFilter } from "@/components/admin/month-filter";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateID, formatRupiah } from "@/lib/utils";

type SearchParams = Promise<{ period?: string; month?: string; cashSaved?: string; cashError?: string }>;
type CashRow = { id: string; transaction_type: "INCOME" | "EXPENSE"; transaction_date: string; amount: number | string; category: string; description: string; receipt_path: string | null; created_at: string };

function dateKey(date: Date) { return date.toISOString().slice(0, 10); }

function periodRange(today: string, period: string, month: string) {
  if (period === "all") return { start: null, end: null, label: "Semua periode" };
  if (period === "week") {
    const current = new Date(`${today}T00:00:00Z`); const day = current.getUTCDay() || 7;
    const start = new Date(current); start.setUTCDate(current.getUTCDate() - day + 1);
    const end = new Date(start); end.setUTCDate(start.getUTCDate() + 6);
    return { start: dateKey(start), end: dateKey(end), label: "Minggu ini" };
  }
  const [year, monthNumber] = month.split("-").map(Number);
  const end = new Date(Date.UTC(year, monthNumber, 0));
  const label = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  return { start: `${month}-01`, end: dateKey(end), label };
}

export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const supabase = await createClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const period = ["week", "month", "all"].includes(params.period || "") ? String(params.period) : "month";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month || "") ? String(params.month) : today.slice(0, 7);
  const range = periodRange(today, period, month);

  let paymentsQuery = supabase.from("payments").select("id,amount_received,paid_at,created_at,bookings(booking_code,profiles(full_name),class_themes(title))").eq("status", "VERIFIED").order("paid_at", { ascending: false });
  let cashQuery = supabase.from("cash_transactions").select("id,transaction_type,transaction_date,amount,category,description,receipt_path,created_at").order("transaction_date", { ascending: false }).order("created_at", { ascending: false });
  if (range.start && range.end) {
    paymentsQuery = paymentsQuery.gte("paid_at", `${range.start}T00:00:00+07:00`).lte("paid_at", `${range.end}T23:59:59.999+07:00`);
    cashQuery = cashQuery.gte("transaction_date", range.start).lte("transaction_date", range.end);
  }
  const [payments, cash] = await Promise.all([paymentsQuery, cashQuery]);
  const paymentTransactions = (payments.data || []).map((payment: any) => ({
    id: `payment-${payment.id}`, originalId: payment.id,
    date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(payment.paid_at || payment.created_at)),
    createdAt: payment.paid_at || payment.created_at, type: "INCOME" as const, category: "Kursus",
    description: `${payment.bookings?.profiles?.full_name || "Member"} · ${payment.bookings?.class_themes?.title || payment.bookings?.booking_code || "Pembayaran kursus"}`,
    amount: Number(payment.amount_received), source: "Pembayaran otomatis", receipt: false,
  }));
  const manualTransactions = ((cash.data || []) as CashRow[]).map((row) => ({ id: row.id, originalId: row.id, date: row.transaction_date, createdAt: row.created_at, type: row.transaction_type, category: row.category, description: row.description, amount: Number(row.amount), source: row.receipt_path ? "Struk" : "Manual", receipt: Boolean(row.receipt_path) }));
  const transactions = [...paymentTransactions, ...manualTransactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  return <section id="transaksi" className="scroll-mt-6">
    <PageHeader eyebrow="Keuangan" title="Transaksi" description="Catat pemasukan dan pengeluaran, serta periksa pembayaran kursus yang masuk otomatis." />
    {(params.cashSaved || params.cashError) && <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${params.cashError ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>{params.cashError || "Transaksi berhasil disimpan."}</div>}
    <Card id="tambah" className="scroll-mt-6"><CardContent className="p-6"><div className="mb-5"><h2 className="font-serif text-xl font-bold">Tambah transaksi</h2><p className="mt-1 text-sm text-muted">Isi manual atau pilih foto struk. OCR akan berjalan otomatis setelah foto dipilih.</p></div><CashTransactionForm today={today}/></CardContent></Card>

    <div className="mt-6 overflow-hidden rounded-3xl border bg-white soft-shadow">
      <div className="flex flex-col gap-3 border-b p-5 lg:flex-row lg:items-end lg:justify-between">
        <div><h2 className="font-serif text-xl font-bold">Daftar transaksi</h2><p className="text-xs text-muted">{range.label} · {transactions.length} transaksi</p></div>
        <div className="flex flex-wrap items-center gap-2">
          {[["week", "Minggu ini"], ["month", "Bulanan"], ["all", "Semua"]].map(([value, label]) => <Link key={value} href={`/admin/transaksi?period=${value}${value === "month" ? `&month=${month}` : ""}#transaksi`} className={`rounded-full border px-4 py-2 text-xs font-semibold ${period === value ? "border-primary bg-primary text-white" : "bg-white hover:bg-cream"}`}>{label}</Link>)}
          {period === "month" && <MonthFilter month={month} />}
        </div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-cream text-xs text-muted"><tr>{["Tanggal", "Keterangan", "Kategori", "Sumber", "Masuk", "Keluar", "Bukti"].map((heading) => <th className="p-4" key={heading}>{heading}</th>)}</tr></thead><tbody>
        {transactions.map((transaction) => <tr key={transaction.id} className="border-t"><td className="whitespace-nowrap p-4">{formatDateID(transaction.date)}</td><td className="p-4 font-semibold">{transaction.description}</td><td className="p-4">{transaction.category}</td><td className="p-4 text-xs text-muted">{transaction.source}</td><td className="p-4 font-semibold text-success">{transaction.type === "INCOME" ? formatRupiah(transaction.amount) : "—"}</td><td className="p-4 font-semibold text-red-600">{transaction.type === "EXPENSE" ? formatRupiah(transaction.amount) : "—"}</td><td className="p-4">{transaction.receipt ? <Link href={`/admin/receipts/${transaction.originalId}`} target="_blank" className="inline-flex items-center gap-1 font-semibold text-primary"><Paperclip className="size-4"/>Buka</Link> : "—"}</td></tr>)}
        {!transactions.length && <tr><td colSpan={7} className="p-8 text-center text-muted">Belum ada transaksi pada periode ini.</td></tr>}
      </tbody></table></div>
    </div>
  </section>;
}
