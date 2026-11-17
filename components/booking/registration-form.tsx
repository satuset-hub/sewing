"use client";

import { useActionState, type FormEvent } from "react";
import { registerBookingAction, type ActionState } from "@/app/actions";
import { BookingCalendar } from "@/components/calendar/booking-calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/shared/submit-button";
import { RegionAutocomplete } from "@/components/shared/region-autocomplete";
import type { Availability, Profile, Theme } from "@/lib/types";

const initial: ActionState = { ok: false };

function generateTemporaryPassword() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return `Jsc-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")}9A`;
}

export function RegistrationForm({ theme, dates, profile }: { theme: Theme; dates: Availability[]; profile?: Profile | null }) {
  const [state, action] = useActionState(registerBookingAction, initial);

  function prepareSubmission(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const keyInput = form.elements.namedItem("idempotencyKey") as HTMLInputElement | null;
    if (keyInput && !keyInput.value) keyInput.value = crypto.randomUUID();
    if (!profile) {
      const passwordInput = form.elements.namedItem("password") as HTMLInputElement | null;
      const password = generateTemporaryPassword();
      if (passwordInput) passwordInput.value = password;
      sessionStorage.setItem("jsc-temporary-password", password);
    }
  }

  return <form action={action} onSubmitCapture={prepareSubmission} className="space-y-8">
    <input type="hidden" name="themeId" value={theme.id} />
    <input type="hidden" name="idempotencyKey" defaultValue="" />
    <input type="hidden" name="showTemporaryPassword" value={profile ? "false" : "true"} />
    {!profile && <input type="hidden" name="password" defaultValue="" />}
    <section>
      <h2 className="font-serif text-xl font-bold">1. Data peserta</h2>
      <p className="mt-1 text-sm text-muted">{profile ? "Data profilmu digunakan untuk pendaftaran ini." : "Data ini juga digunakan untuk membuat akun member."}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="fullName">Nama lengkap</Label><Input id="fullName" name="fullName" defaultValue={profile?.full_name} required /></div>
        <div><Label htmlFor="phone">Nomor WhatsApp</Label><Input id="phone" name="phone" inputMode="tel" placeholder="0812..." defaultValue={profile?.phone} required /></div>
        <div className="sm:col-span-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" defaultValue={profile?.email} readOnly={Boolean(profile)} required /></div>
        <div className="sm:col-span-2"><Label htmlFor="address">Alamat jalan</Label><Textarea id="address" name="address" defaultValue={profile?.address} placeholder="Nama jalan, nomor rumah, RT/RW" required /></div>
        <div className="sm:col-span-2"><RegionAutocomplete village={profile?.village} city={profile?.city} province={profile?.province} villageCode={profile?.village_code} cityCode={profile?.city_code} provinceCode={profile?.province_code} /></div>
        <div className="sm:col-span-2"><Label htmlFor="experienceLevel">Pengalaman menjahit (opsional)</Label><Input id="experienceLevel" name="experienceLevel" defaultValue={profile?.experience_level || ""} placeholder="Contoh: belum pernah, pemula" /></div>
      </div>
    </section>
    <section>
      <h2 className="font-serif text-xl font-bold">2. Pilih tanggal</h2>
      <p className="mb-5 mt-1 text-sm text-muted">Tema ini direkomendasikan {theme.recommended_sessions} pertemuan. Pilih satu dulu atau beberapa tanggal sekaligus, maksimal {theme.recommended_sessions}.</p>
      <BookingCalendar dates={dates} maxSelections={theme.recommended_sessions} price={theme.price} />
      <label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" name="terms" required className="mt-1 accent-primary" /><span>Saya menyetujui ketentuan kelas dan memahami bahwa jadwal dikonfirmasi setelah pembayaran diverifikasi admin.</span></label>
    </section>
    <Notice message={state.message} success={state.ok} />
    <SubmitButton className="w-full" size="lg" pendingText="Memproses pendaftaran…">Kirim pendaftaran</SubmitButton>
  </form>;
}
