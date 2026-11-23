import { ArrowDownCircle, ArrowUpCircle, BarChart3, Download, PiggyBank, WalletCards } from "lucide-react";
import { StatsCard } from "@/components/admin/stats-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils";

export default async function ReportsPage() {
  const supabase = await createClient();
  const [bookings, payments, cashTransactions, members, dates, attendance] = await Promise.all([
    supabase.from("bookings").select("id,status,created_at,theme_id,class_themes(title)"),
    supabase.from("payments").select("status,amount_received"),
    supabase.from("cash_transactions").select("transaction_type,amount"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "member"),
    supabase.from("class_dates").select("id,capacity,bookings(status)"),
    supabase.from("attendance").select("id", { count: "exact", head: true }).eq("status", "PRESENT"),
  ]);

  const courseIncome = (payments.data || []).filter((payment) => payment.status === "VERIFIED").reduce((sum, payment) => sum + Number(payment.amount_received), 0);
  const manualIncome = (cashTransactions.data || []).filter((transaction) => transaction.transaction_type === "INCOME").reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const expenses = (cashTransactions.data || []).filter((transaction) => transaction.transaction_type === "EXPENSE").reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const totalIncome = courseIncome + manualIncome;
  const netCash = totalIncome - expenses;
  const unverified = (payments.data || []).filter((payment) => payment.status !== "VERIFIED").length;
  const classes = bookings.data?.filter((booking) => booking.status === "COMPLETED").length || 0;
  const capacity = (dates.data || []).reduce((sum, date) => sum + date.capacity, 0);
  const occupied = (dates.data || []).reduce((sum, date) => sum + date.bookings.filter((booking: any) => !["CANCELLED", "EXPIRED"].includes(booking.status)).length, 0);
  const perTheme = new Map<string, number>();
  bookings.data?.forEach((booking: any) => perTheme.set(booking.class_themes?.title || "Tanpa tema", (perTheme.get(booking.class_themes?.title || "Tanpa tema") || 0) + 1));

  return <>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <PageHeader eyebrow="Laporan" title="Ringkasan operasional dan keuangan" description="Rekap seluruh data sejak pencatatan dimulai." />
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary"><a href="/admin/laporan/bookings.csv"><Download className="size-4"/>Booking CSV</a></Button>
        <Button asChild variant="secondary"><a href="/admin/laporan/payments.csv"><Download className="size-4"/>Pembayaran CSV</a></Button>
        <Button asChild variant="secondary"><a href="/admin/laporan/transactions.csv"><Download className="size-4"/>Transaksi CSV</a></Button>
      </div>
    </div>

    <section>
      <h2 className="mb-4 font-serif text-xl font-bold">Keuangan</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard icon={ArrowUpCircle} label="Total pemasukan" value={formatRupiah(totalIncome)} />
        <StatsCard icon={ArrowDownCircle} label="Total pengeluaran" value={formatRupiah(expenses)} />
        <StatsCard icon={WalletCards} label="Selisih kas" value={formatRupiah(netCash)} />
        <StatsCard icon={PiggyBank} label="Saldo kas saat ini" value={formatRupiah(netCash)} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card><CardContent className="p-5"><p className="text-xs text-muted">Pemasukan pembayaran kursus</p><p className="mt-2 text-xl font-bold text-success">{formatRupiah(courseIncome)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted">Pemasukan manual</p><p className="mt-2 text-xl font-bold text-success">{formatRupiah(manualIncome)}</p></CardContent></Card>
      </div>
    </section>

    <section className="mt-8">
      <h2 className="mb-4 font-serif text-xl font-bold">Operasional</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[["Total member unik", members.count || 0], ["Kelas terlaksana", classes], ["Pembayaran belum terverifikasi", unverified], ["Tingkat keterisian", capacity ? `${Math.round(occupied / capacity * 100)}%` : "0%"], ["Kehadiran valid", attendance.count || 0], ["Transaksi manual", cashTransactions.data?.length || 0]].map(([label, value]) => <Card key={label}><CardContent className="p-5"><BarChart3 className="size-5 text-primary"/><p className="mt-4 text-xs text-muted">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>)}
      </div>
    </section>

    <Card className="mt-6"><CardContent className="p-6"><h2 className="font-serif text-xl font-bold">Pendaftaran per tema</h2><div className="mt-5 space-y-3">{Array.from(perTheme.entries()).map(([theme, count]) => <div key={theme} className="flex justify-between border-b pb-3 text-sm"><span>{theme}</span><b>{count}</b></div>)}</div></CardContent></Card>
  </>;
}
