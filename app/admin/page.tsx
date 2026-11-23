import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, CalendarCheck2, CalendarClock, ClipboardList, CreditCard, Hourglass, Paperclip, PiggyBank, UsersRound, WalletCards } from "lucide-react";
import { CashTransactionForm } from "@/components/admin/cash-transaction-form";
import { StatsCard } from "@/components/admin/stats-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateID, formatRupiah } from "@/lib/utils";

type SearchParams = Promise<{ period?: string; month?: string; cashSaved?: string; cashError?: string }>;
type CashRow = { id: string; transaction_type: "INCOME" | "EXPENSE"; transaction_date: string; amount: number | string; category: string; description: string; receipt_path: string | null; created_at: string };

function calendarDate(date: Date) { return date.toISOString().slice(0, 10); }

function periodRange(today: string, period: string, month: string) {
  if (period === "all") return { start: null, end: null, label: "Semua periode" };
  if (period === "week") {
    const current = new Date(`${today}T00:00:00Z`);
    const day = current.getUTCDay() || 7;
    const start = new Date(current); start.setUTCDate(current.getUTCDate() - day + 1);
    const end = new Date(start); end.setUTCDate(start.getUTCDate() + 6);
    return { start: calendarDate(start), end: calendarDate(end), label: "Minggu ini" };
  }
  const [year, monthNumber] = month.split("-").map(Number);
  const end = new Date(Date.UTC(year, monthNumber, 0));
  const label = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  return { start: `${month}-01`, end: calendarDate(end), label };
}

function amountSum(rows: Array<{ amount?: number | string; amount_received?: number | string }>) {
  return rows.reduce((sum, row) => sum + Number(row.amount ?? row.amount_received ?? 0), 0);
}

export default async function AdminDashboard({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const supabase = await createClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const period = ["week", "month", "all"].includes(params.period || "") ? String(params.period) : "month";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month || "") ? String(params.month) : today.slice(0, 7);
  const range = periodRange(today, period, month);

  let filteredPaymentsQuery = supabase.from("payments").select("id,amount_received,paid_at,created_at,bookings(booking_code,profiles(full_name),class_themes(title))").eq("status", "VERIFIED").order("paid_at", { ascending: false });
  let filteredCashQuery = supabase.from("cash_transactions").select("id,transaction_type,transaction_date,amount,category,description,receipt_path,created_at").order("transaction_date", { ascending: false }).order("created_at", { ascending: false });
  if (range.start && range.end) {
    filteredPaymentsQuery = filteredPaymentsQuery.gte("paid_at", `${range.start}T00:00:00+07:00`).lte("paid_at", `${range.end}T23:59:59.999+07:00`);
    filteredCashQuery = filteredCashQuery.gte("transaction_date", range.start).lte("transaction_date", range.end);
  }

  const [profiles, bookings, newBookings, awaiting, review, confirmed, todayClasses, recent, upcoming, filteredPayments, filteredCash, allPayments, allCash] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "member"),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "PENDING_ADMIN"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "AWAITING_PAYMENT"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "PAYMENT_REVIEW"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "CONFIRMED"),
    supabase.from("class_dates").select("id", { count: "exact", head: true }).eq("class_date", today),
    supabase.from("bookings").select("id,booking_code,status,created_at,profiles(full_name),class_themes(title)").order("created_at", { ascending: false }).limit(6),
    supabase.from("class_dates").select("class_date,start_time,capacity,class_themes(title),bookings(id,status)").gte("class_date", today).order("class_date").limit(5),
    filteredPaymentsQuery, filteredCashQuery,
    supabase.from("payments").select("amount_received").eq("status", "VERIFIED"),
    supabase.from("cash_transactions").select("transaction_type,amount"),
  ]);

  const cashRows = (filteredCash.data || []) as CashRow[];
  const manualIncome = amountSum(cashRows.filter((row) => row.transaction_type === "INCOME"));
  const expenses = amountSum(cashRows.filter((row) => row.transaction_type === "EXPENSE"));
  const income = amountSum(filteredPayments.data || []) + manualIncome;
  const difference = income - expenses;
  const allManualRows = (allCash.data || []) as Array<{ transaction_type: "INCOME" | "EXPENSE"; amount: number | string }>;
  const currentBalance = amountSum(allPayments.data || []) + amountSum(allManualRows.filter((row) => row.transaction_type === "INCOME")) - amountSum(allManualRows.filter((row) => row.transaction_type === "EXPENSE"));

  const paymentTransactions = (filteredPayments.data || []).map((payment: any) => ({
    id: `payment-${payment.id}`, originalId: payment.id,
    date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(payment.paid_at || payment.created_at)),
    createdAt: payment.paid_at || payment.created_at, type: "INCOME" as const, category: "Kursus",
    description: `${payment.bookings?.profiles?.full_name || "Member"} · ${payment.bookings?.class_themes?.title || payment.bookings?.booking_code || "Pembayaran kursus"}`,
    amount: Number(payment.amount_received), source: "Pembayaran otomatis", receipt: false,
  }));
  const manualTransactions = cashRows.map((row) => ({ id: row.id, originalId: row.id, date: row.transaction_date, createdAt: row.created_at, type: row.transaction_type, category: row.category, description: row.description, amount: Number(row.amount), source: row.receipt_path ? "Struk" : "Manual", receipt: Boolean(row.receipt_path) }));
  const transactions = [...paymentTransactions, ...manualTransactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const operationalStats = [
    [UsersRound, "Total member", profiles.count || 0], [ClipboardList, "Total pendaftaran", bookings.count || 0],
    [Hourglass, "Booking baru", newBookings.count || 0], [CreditCard, "Menunggu pembayaran", awaiting.count || 0],
    [WalletCards, "Menunggu verifikasi", review.count || 0], [CalendarCheck2, "Terkonfirmasi", confirmed.count || 0],
    [CalendarClock, "Kelas hari ini", todayClasses.count || 0],
  ] as const;

  return <>
    <PageHeader eyebrow="Dashboard admin" title="Ringkasan operasional" description="Data langsung dari Supabase, diperbarui setiap halaman dimuat." />
    <section id="keuangan" className="mb-10 scroll-mt-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Keuangan</p><h2 className="mt-1 font-serif text-2xl font-bold">Ringkasan kas</h2><p className="mt-1 text-sm text-muted">Pembayaran kursus terverifikasi masuk otomatis. Saldo dihitung sejak pencatatan dimulai.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          {[["week", "Minggu ini"], ["month", "Bulanan"], ["all", "Semua"]].map(([value, label]) => <Link key={value} href={`/admin?period=${value}${value === "month" ? `&month=${month}` : ""}#keuangan`} className={`rounded-full border px-4 py-2 text-xs font-semibold ${period === value ? "border-primary bg-primary text-white" : "bg-white hover:bg-cream"}`}>{label}</Link>)}
          {period === "month" && <form method="get" className="flex items-center gap-2"><input type="hidden" name="period" value="month"/><Input aria-label="Pilih bulan" type="month" name="month" defaultValue={month} className="h-9 w-40"/><button className="rounded-full border bg-white px-3 py-2 text-xs font-semibold" type="submit">Tampilkan</button></form>}
        </div>
      </div>
      {(params.cashSaved || params.cashError) && <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${params.cashError ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>{params.cashError || "Transaksi berhasil disimpan."}</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard icon={ArrowUpCircle} label={`Pemasukan · ${range.label}`} value={formatRupiah(income)} />
        <StatsCard icon={ArrowDownCircle} label={`Pengeluaran · ${range.label}`} value={formatRupiah(expenses)} />
        <StatsCard icon={WalletCards} label={`Selisih kas · ${range.label}`} value={formatRupiah(difference)} />
        <StatsCard icon={PiggyBank} label="Saldo kas saat ini" value={formatRupiah(currentBalance)} />
      </div>
      <Card className="mt-5"><CardContent className="p-6"><div className="mb-5"><h3 className="font-serif text-xl font-bold">Tambah transaksi</h3><p className="mt-1 text-sm text-muted">Isi manual atau unggah foto struk untuk membantu mengisi datanya.</p></div><CashTransactionForm today={today}/></CardContent></Card>
      <div className="mt-5 overflow-hidden rounded-3xl border bg-white soft-shadow">
        <div className="flex items-center justify-between gap-3 border-b p-5"><div><h3 className="font-serif text-xl font-bold">Transaksi</h3><p className="text-xs text-muted">{range.label} · {transactions.length} transaksi</p></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-cream text-xs text-muted"><tr>{["Tanggal", "Keterangan", "Kategori", "Sumber", "Masuk", "Keluar", "Bukti"].map((heading) => <th className="p-4" key={heading}>{heading}</th>)}</tr></thead><tbody>
          {transactions.map((transaction) => <tr key={transaction.id} className="border-t"><td className="whitespace-nowrap p-4">{formatDateID(transaction.date)}</td><td className="p-4 font-semibold">{transaction.description}</td><td className="p-4">{transaction.category}</td><td className="p-4 text-xs text-muted">{transaction.source}</td><td className="p-4 font-semibold text-success">{transaction.type === "INCOME" ? formatRupiah(transaction.amount) : "—"}</td><td className="p-4 font-semibold text-red-600">{transaction.type === "EXPENSE" ? formatRupiah(transaction.amount) : "—"}</td><td className="p-4">{transaction.receipt ? <Link href={`/admin/receipts/${transaction.originalId}`} target="_blank" className="inline-flex items-center gap-1 font-semibold text-primary"><Paperclip className="size-4"/>Buka</Link> : "—"}</td></tr>)}
          {!transactions.length && <tr><td colSpan={7} className="p-8 text-center text-muted">Belum ada transaksi pada periode ini.</td></tr>}
        </tbody></table></div>
      </div>
    </section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{operationalStats.map(([Icon, label, value]) => <StatsCard key={label} icon={Icon} label={label} value={value}/>)}</div>
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      <Card><CardContent className="p-6"><div className="mb-5 flex justify-between"><h2 className="font-serif text-xl font-bold">Pendaftaran terbaru</h2><Link href="/admin/pendaftaran" className="text-sm font-bold text-primary">Lihat semua</Link></div><div className="space-y-4">{recent.data?.map((booking: any) => <Link key={booking.id} href={`/admin/pendaftaran/${booking.id}`} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0"><div><p className="text-sm font-bold">{booking.profiles?.full_name}</p><p className="text-xs text-muted">{booking.booking_code} · {booking.class_themes?.title}</p></div><StatusBadge status={booking.status}/></Link>) || <p className="text-sm text-muted">Belum ada data.</p>}</div></CardContent></Card>
      <Card><CardContent className="p-6"><h2 className="mb-5 font-serif text-xl font-bold">Jadwal berikutnya</h2><div className="space-y-4">{upcoming.data?.map((date: any) => <div key={date.class_date} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0"><div><p className="text-sm font-bold">{formatDateID(date.class_date)}</p><p className="text-xs text-muted">{date.start_time.slice(0, 5)} · {date.class_themes?.title || "Tema belum ditentukan"}</p></div><span className="text-xs font-semibold">{date.bookings?.filter((booking: any) => !["CANCELLED", "EXPIRED"].includes(booking.status)).length || 0}/{date.capacity}</span></div>) || <p className="text-sm text-muted">Belum ada jadwal.</p>}</div></CardContent></Card>
    </div>
  </>;
}
