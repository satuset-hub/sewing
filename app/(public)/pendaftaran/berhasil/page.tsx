import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleCheckBig } from "lucide-react";
import { TemporaryCredentials } from "@/components/auth/temporary-credentials";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateID, formatRupiah } from "@/lib/utils";
import type { Booking } from "@/lib/types";

export const metadata = { title: "Pendaftaran berhasil" };
export const dynamic = "force-dynamic";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ bookings?: string; temporary?: string }> }) {
  const auth = await requireMember();
  const query = await searchParams;
  const ids = query.bookings?.split(",").filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 20) || [];
  if (!ids.length) redirect("/member/kelas");
  const supabase = await createClient();
  const { data } = await supabase.from("bookings").select("*,class_themes(title),class_dates(class_date,start_time,end_time),payments(amount_due,status)").in("id", ids).eq("member_id", auth.user.id).order("created_at");
  if (!data?.length) redirect("/member/kelas");
  const bookings = data as Booking[];
  const total = bookings.reduce((sum, booking) => sum + Number(booking.price_snapshot), 0);

  return <div className="container-page grid min-h-[75vh] place-items-center py-8 sm:py-12"><div className="w-full max-w-3xl rounded-[1.5rem] border bg-white p-5 text-center soft-shadow sm:rounded-[2rem] sm:p-8 md:p-10">
    <CircleCheckBig className="mx-auto size-14 text-success sm:size-16" />
    <h1 className="mt-5 font-serif text-3xl font-bold sm:text-4xl">Pendaftaran Berhasil!</h1>
    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">Kami menerima {bookings.length} jadwal pilihanmu. Admin akan menghubungi melalui WhatsApp untuk pembayaran manual, lalu jadwal dikonfirmasi setelah pembayaran diverifikasi.</p>
    <div className="mt-7 space-y-3 text-left">{bookings.map((booking) => <article key={booking.id} className="rounded-2xl bg-cream p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs text-muted">{booking.booking_code}</p><h2 className="mt-1 font-bold">{booking.class_themes?.title}</h2><p className="mt-1 text-sm">{booking.class_dates?.class_date ? formatDateID(booking.class_dates.class_date) : "-"} · {booking.class_dates?.start_time?.slice(0, 5)}</p></div><div className="sm:text-right"><p className="font-bold text-primary">{formatRupiah(booking.price_snapshot)}</p><div className="mt-2"><StatusBadge status={booking.status} /></div></div></div></article>)}</div>
    <div className="mt-4 flex items-center justify-between rounded-2xl border p-4 text-left"><span className="text-sm text-muted">Total {bookings.length} pertemuan</span><b className="text-lg text-primary">{formatRupiah(total)}</b></div>
    {query.temporary === "1" && auth.profile?.username && <TemporaryCredentials username={auth.profile.username} />}
    <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Button asChild><Link href="/member">Buka Dashboard Member</Link></Button><Button asChild variant="secondary"><Link href="/kelas">Lihat Kelas Lain</Link></Button></div>
  </div></div>;
}
