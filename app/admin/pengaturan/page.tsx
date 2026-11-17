import { saveSettingsAction } from "@/app/actions";
import { PasswordForm } from "@/components/auth/password-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("key,value");
  const settings = Object.fromEntries((data || []).map((item) => [item.key, item.value]));
  const value = (key: string, fallback = "") => String(settings[key] ?? fallback);

  return <>
    <PageHeader eyebrow="Konfigurasi" title="Pengaturan aplikasi" description="Pengaturan ini menjadi sumber tunggal untuk website, kalender, dan alur pembayaran." />
    {query.saved && <div className="mb-5"><Notice success message="Pengaturan berhasil disimpan." /></div>}
    <form action={saveSettingsAction} className="space-y-6">
      <Card><CardContent className="p-6">
        <h2 className="font-serif text-xl font-bold">Identitas</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Nama brand" name="business_name" value={value("business_name", "Rumah Jahit Siju")} />
          <Field label="WhatsApp admin" name="business_phone" value={value("business_phone")} />
          <Area label="Deskripsi" name="business_description" value={value("business_description")} />
          <Area label="Alamat" name="business_address" value={value("business_address")} />
          <Field label="Maps URL" name="business_maps_url" value={value("business_maps_url")} />
          <Field label="Instagram URL" name="instagram_url" value={value("instagram_url")} />
          <Field label="Logo URL" name="logo_url" value={value("logo_url")} />
          <Field label="Banner URL" name="banner_url" value={value("banner_url")} />
          <Field label="Foto pengajar URL" name="teacher_photo_url" value={value("teacher_photo_url")} />
        </div>
        <p className="mt-3 text-xs text-muted">Unggah aset ke bucket Supabase Storage <b>theme-media</b>, lalu tempel URL publiknya.</p>
      </CardContent></Card>

      <Card><CardContent className="p-6">
        <h2 className="font-serif text-xl font-bold">Operasional</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Kuota default" name="default_capacity" value={value("default_capacity", "3")} type="number" />
          <Field label="Hari aktif (0=Minggu, dipisah koma)" name="active_weekdays" value={Array.isArray(settings.active_weekdays) ? settings.active_weekdays.join(",") : "1,2,3,4,5,6"} />
          <Field label="Jam mulai" name="default_start_time" value={value("default_start_time", "09:00")} type="time" />
          <Field label="Jam selesai" name="default_end_time" value={value("default_end_time", "12:00")} type="time" />
          <Field label="Batas pemesanan (hari)" name="booking_advance_limit_days" value={value("booking_advance_limit_days", "90")} type="number" />
          <Field label="Cutoff sebelum kelas (jam)" name="booking_cutoff_hours" value={value("booking_cutoff_hours", "24")} type="number" />
          <Area label="Kebijakan pembatalan" name="cancellation_policy" value={value("cancellation_policy")} />
          <div><label className="flex gap-2 text-sm font-semibold"><input type="checkbox" name="reservation_timeout_enabled" defaultChecked={settings.reservation_timeout_enabled === true} />Aktifkan timeout reservasi</label><Field label="Timeout (jam)" name="reservation_timeout_hours" value={value("reservation_timeout_hours", "24")} type="number" /></div>
        </div>
        <p className="mt-3 text-xs text-warning">V1 tidak menjalankan scheduler otomatis; expiry tetap dilakukan manual oleh admin.</p>
      </CardContent></Card>

      <Card><CardContent className="p-6">
        <h2 className="font-serif text-xl font-bold">Pembayaran</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Bank" name="payment_bank_name" value={value("payment_bank_name")} />
          <Field label="Nomor rekening" name="payment_account_number" value={value("payment_account_number")} />
          <Field label="Pemilik rekening" name="payment_account_holder" value={value("payment_account_holder")} />
          <Area label="Instruksi pembayaran" name="payment_instructions" value={value("payment_instructions")} />
          <Area label="Template WA booking" name="whatsapp_booking_template" value={value("whatsapp_booking_template")} />
          <Area label="Template WA pembayaran" name="whatsapp_payment_template" value={value("whatsapp_payment_template")} />
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-6">
        <h2 className="font-serif text-xl font-bold">Sistem & SEO</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="SEO title" name="seo_title" value={value("seo_title")} />
          <Area label="SEO description" name="seo_description" value={value("seo_description")} />
          <label className="flex gap-2 text-sm font-semibold"><input type="checkbox" name="website_maintenance_mode" defaultChecked={settings.website_maintenance_mode === true} />Mode maintenance</label>
        </div>
      </CardContent></Card>
      <SubmitButton size="lg">Simpan semua pengaturan</SubmitButton>
    </form>

    <Card id="akun-password" className="mt-6 max-w-xl scroll-mt-6"><CardContent className="p-6">
      <h2 className="font-serif text-xl font-bold">Akun & Password</h2>
      <p className="mb-5 mt-2 text-sm text-muted">Ubah password akun administrator yang sedang digunakan.</p>
      <PasswordForm />
    </CardContent></Card>
  </>;
}

function Field({ label, name, value, type = "text" }: { label: string; name: string; value: string; type?: string }) {
  return <div><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type={type} defaultValue={value} /></div>;
}

function Area({ label, name, value }: { label: string; name: string; value: string }) {
  return <div><Label htmlFor={name}>{label}</Label><Textarea id={name} name={name} defaultValue={value} /></div>;
}
