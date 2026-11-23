import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, CalendarCheck2, CalendarClock, ClipboardList, CreditCard, Hourglass, PiggyBank, Plus, UsersRound, WalletCards } from "lucide-react";
import { StatsCard } from "@/components/admin/stats-card";
import { MonthFilter } from "@/components/admin/month-filter";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateID, formatRupiah } from "@/lib/utils";

type SearchParams = Promise<{ period?: string; month?: string }>;

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

type DashboardSummary = { members: number; bookings: number; new_bookings: number; awaiting_payment: number; payment_review: number; confirmed: number; today_classes: number; period_course_income: number; period_manual_income: number; period_expense: number; current_balance: number };

export default async function AdminDashboard({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const supabase = await createClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const period = ["week", "month", "all"].includes(params.period || "") ? String(params.period) : "month";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month || "") ? String(params.month) : today.slice(0, 7);
  const range = periodRange(today, period, month);

  const [summaryResult, recent, upcoming] = await Promise.all([
    supabase.rpc("admin_dashboard_summary", { p_start: range.start, p_end: range.end }),
    supabase.from("bookings").select("id,booking_code,status,created_at,profiles(full_name),class_themes(title)").order("created_at", { ascending: false }).limit(6),
    supabase.from("class_dates").select("class_date,start_time,capacity,class_themes(title),bookings(id,status)").gte("class_date", today).order("class_date").limit(5),
  ]);
  const emptySummary: DashboardSummary = { members: 0, bookings: 0, new_bookings: 0, awaiting_payment: 0, payment_review: 0, confirmed: 0, today_classes: 0, period_course_income: 0, period_manual_income: 0, period_expense: 0, current_balance: 0 };
  const summary = { ...emptySummary, ...((summaryResult.data || {}) as Partial<DashboardSummary>) };
  const income = Number(summary.period_course_income) + Number(summary.period_manual_income);
  const expenses = Number(summary.period_expense);
  const difference = income - expenses;

  const operationalStats = [
    [UsersRound, "Total member", summary.members], [ClipboardList, "Total pendaftaran", summary.bookings],
    [Hourglass, "Booking baru", summary.new_bookings], [CreditCard, "Menunggu pembayaran", summary.awaiting_payment],
    [WalletCards, "Menunggu verifikasi", summary.payment_review], [CalendarCheck2, "Terkonfirmasi", summary.confirmed],
    [CalendarClock, "Kelas hari ini", summary.today_classes],
  ] as const;

  return <>
    <PageHeader eyebrow="Dashboard admin" title="Ringkasan operasional" description="Data langsung dari Supabase, diperbarui setiap halaman dimuat." />
    <section id="keuangan" className="mb-10 scroll-mt-6">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          {[["week", "Minggu ini"], ["month", "Bulanan"], ["all", "Semua"]].map(([value, label]) => <Link key={value} href={`/admin?period=${value}${value === "month" ? `&month=${month}` : ""}#keuangan`} className={`rounded-full border px-4 py-2 text-xs font-semibold ${period === value ? "border-primary bg-primary text-white" : "bg-white hover:bg-cream"}`}>{label}</Link>)}
          {period === "month" && <MonthFilter month={month} />}
          <Button asChild size="sm"><Link href="/admin/transaksi#tambah"><Plus className="size-4"/>Tambah Transaksi</Link></Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard icon={ArrowUpCircle} label={`Pemasukan · ${range.label}`} value={formatRupiah(income)} />
        <StatsCard icon={ArrowDownCircle} label={`Pengeluaran · ${range.label}`} value={formatRupiah(expenses)} />
        <StatsCard icon={WalletCards} label={`Selisih kas · ${range.label}`} value={formatRupiah(difference)} />
        <StatsCard icon={PiggyBank} label="Saldo kas saat ini" value={formatRupiah(summary.current_balance)} />
      </div>
    </section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{operationalStats.map(([Icon, label, value]) => <StatsCard key={label} icon={Icon} label={label} value={value}/>)}</div>
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      <Card><CardContent className="p-6"><div className="mb-5 flex justify-between"><h2 className="font-serif text-xl font-bold">Pendaftaran terbaru</h2><Link href="/admin/pendaftaran" className="text-sm font-bold text-primary">Lihat semua</Link></div><div className="space-y-4">{recent.data?.map((booking: any) => <Link key={booking.id} href={`/admin/pendaftaran/${booking.id}`} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0"><div><p className="text-sm font-bold">{booking.profiles?.full_name}</p><p className="text-xs text-muted">{booking.booking_code} · {booking.class_themes?.title}</p></div><StatusBadge status={booking.status}/></Link>) || <p className="text-sm text-muted">Belum ada data.</p>}</div></CardContent></Card>
      <Card><CardContent className="p-6"><h2 className="mb-5 font-serif text-xl font-bold">Jadwal berikutnya</h2><div className="space-y-4">{upcoming.data?.map((date: any) => <div key={date.class_date} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0"><div><p className="text-sm font-bold">{formatDateID(date.class_date)}</p><p className="text-xs text-muted">{date.start_time.slice(0, 5)} · {date.class_themes?.title || "Tema belum ditentukan"}</p></div><span className="text-xs font-semibold">{date.bookings?.filter((booking: any) => !["CANCELLED", "EXPIRED"].includes(booking.status)).length || 0}/{date.capacity}</span></div>) || <p className="text-sm text-muted">Belum ada jadwal.</p>}</div></CardContent></Card>
    </div>
  </>;
}
