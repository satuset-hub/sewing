import Link from "next/link";
import { addMonths, endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { id } from "date-fns/locale";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { AdminCalendarDayCard } from "@/components/admin/calendar-day-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { getCalendarAvailability } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDateID, normalizeIndonesianPhone } from "@/lib/utils";

type SearchParams = Promise<{ month?: string; date?: string; error?: string; saved?: string }>;

export default async function AdminCalendar({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const base = query.month && /^\d{4}-\d{2}$/.test(query.month) ? parseISO(`${query.month}-01`) : new Date();
  const month = format(base, "yyyy-MM");
  const from = format(startOfMonth(base), "yyyy-MM-dd");
  const to = format(endOfMonth(base), "yyyy-MM-dd");
  const selected = query.date && query.date >= from && query.date <= to ? query.date : format(base, "yyyy-MM-dd");
  const supabase = await createClient();

  const [dates, selectedDate, themes] = await Promise.all([
    getCalendarAvailability(from, to),
    supabase
      .from("class_dates")
      .select("id,class_date,start_time,end_time,capacity,is_open,notes,class_themes(title),bookings(id,booking_code,status,profiles(full_name,phone),payments(status))")
      .eq("class_date", selected)
      .maybeSingle(),
    supabase.from("class_themes").select("id,title").eq("is_active", true).order("sort_order").order("title"),
  ]);

  const selectedAvailability = dates.find((date) => date.class_date === selected);
  const allBookings = selectedDate.data?.bookings ?? [];
  const activeBookings = allBookings.filter((booking) => !["CANCELLED", "EXPIRED"].includes(booking.status));
  const theme = Array.isArray(selectedDate.data?.class_themes) ? selectedDate.data.class_themes[0] : selectedDate.data?.class_themes;
  const offset = startOfMonth(base).getDay();
  const statusClass: Record<string, string> = {
    AVAILABLE: "bg-white",
    THEME_LOCKED: "border-yellow bg-yellow/20",
    FULL: "border-danger/30 bg-danger/10",
    CLOSED: "bg-stone-200",
    HOLIDAY: "bg-stone-200",
    PAST: "bg-stone-100 text-stone-400",
  };

  return <>
    <PageHeader
      eyebrow="Operasional"
      title="Kalender kelas"
      description="Aktifkan atau nonaktifkan tanggal langsung dari kalender. Klik tanggal untuk melihat kelas dan peserta."
    />
    {query.error && <div className="mb-4"><Notice message={decodeURIComponent(query.error)} /></div>}
    {query.saved && <div className="mb-4"><Notice message={query.saved === "lock" ? "Tema tanggal berhasil dikunci." : "Status tanggal berhasil diperbarui."} success /></div>}

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
    <Card>
      <CardContent className="p-3 sm:p-5">
        <div className="mb-5 flex items-center justify-between">
          <Button asChild size="icon" variant="secondary">
            <Link href={`/admin/kalender?month=${format(subMonths(base, 1), "yyyy-MM")}`} aria-label="Bulan sebelumnya"><ChevronLeft className="size-4" /></Link>
          </Button>
          <h2 className="font-serif text-lg font-bold capitalize sm:text-xl">{format(base, "MMMM yyyy", { locale: id })}</h2>
          <Button asChild size="icon" variant="secondary">
            <Link href={`/admin/kalender?month=${format(addMonths(base, 1), "yyyy-MM")}`} aria-label="Bulan berikutnya"><ChevronRight className="size-4" /></Link>
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-xs">
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => <span key={day} className="py-2 text-muted">{day}</span>)}
          {Array.from({ length: offset }).map((_, index) => <span key={index} />)}
          {dates.map((date) => {
            const isPast = date.status === "PAST";
            const isOn = !["CLOSED", "HOLIDAY", "PAST"].includes(date.status);
            const isSelected = selected === date.class_date;
            return <AdminCalendarDayCard
              key={date.class_date}
              date={date.class_date}
              formattedDate={formatDateID(date.class_date)}
              dayNumber={Number(date.class_date.slice(-2))}
              month={month}
              isOn={isOn}
              isPast={isPast}
              isSelected={isSelected}
              statusClass={statusClass[date.status]}
              themeId={date.theme_id}
              themeTitle={date.theme_title || (date.status === "FULL" ? "Penuh" : null)}
              activeBookings={date.active_bookings}
              capacity={date.capacity}
              themes={themes.data || []}
            />;
          })}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Informasi tanggal</p>
            <h2 className="mt-1 font-serif text-xl font-bold sm:text-2xl">{formatDateID(selected)}</h2>
          </div>
          <span className={cn(
            "w-fit rounded-full px-3 py-1.5 text-xs font-bold",
            selectedAvailability && !["CLOSED", "HOLIDAY", "PAST"].includes(selectedAvailability.status) ? "bg-success/10 text-success" : "bg-stone-100 text-muted",
          )}>
            {selectedAvailability && !["CLOSED", "HOLIDAY", "PAST"].includes(selectedAvailability.status) ? "Tanggal aktif" : "Tanggal nonaktif"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 py-5">
          <div><p className="text-xs text-muted">Kelas / tema</p><p className="mt-1 font-semibold">{theme?.title || selectedAvailability?.theme_title || "Belum ditentukan"}</p></div>
          <div><p className="text-xs text-muted">Waktu</p><p className="mt-1 font-semibold">{selectedAvailability ? `${selectedAvailability.start_time.slice(0, 5)}–${selectedAvailability.end_time.slice(0, 5)}` : "-"}</p></div>
          <div><p className="text-xs text-muted">Peserta aktif</p><p className="mt-1 font-semibold">{selectedAvailability?.active_bookings ?? 0} dari {selectedAvailability?.capacity ?? 3}</p></div>
          <div><p className="text-xs text-muted">Sisa kuota</p><p className="mt-1 font-semibold">{selectedAvailability?.remaining_seats ?? 3} tempat</p></div>
        </div>

        <div className="border-t pt-5">
          <h3 className="font-serif text-lg font-bold">Peserta ({activeBookings.length})</h3>
          {allBookings.length > 0
            ? <div className="mt-4 grid gap-3">
                {allBookings.map((booking) => {
                  const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
                  return <div key={booking.id} className="rounded-xl border bg-cream p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-bold">{profile?.full_name}</p><p className="text-xs text-muted">{booking.booking_code}</p></div>
                      <StatusBadge status={booking.status} />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-xs text-muted">Pembayaran: {booking.payments?.[0]?.status || "UNPAID"}</span>
                      <a className="inline-flex items-center gap-1 text-xs font-bold text-primary" target="_blank" rel="noreferrer" href={`https://wa.me/${normalizeIndonesianPhone(profile?.phone || "")}`}>
                        <MessageCircle className="size-3" /> WhatsApp
                      </a>
                    </div>
                  </div>;
                })}
              </div>
            : <p className="mt-3 rounded-xl bg-cream p-4 text-sm text-muted">Belum ada peserta pada tanggal ini.</p>}
        </div>
      </CardContent>
    </Card>
    </div>
  </>;
}
