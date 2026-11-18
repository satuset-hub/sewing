"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, requireAdmin, requireMember } from "@/lib/auth";
import { loginSchema, registrationSchema, themeSchema } from "@/lib/validation";
import { normalizeIndonesianPhone } from "@/lib/utils";
import { resolvePostLoginPath, type AppRole } from "@/lib/auth-routing";

export type ActionState = { ok: boolean; message?: string; fieldErrors?: Record<string, string[]>; data?: Record<string, string> };
const initialError = (message: string): ActionState => ({ ok: false, message });

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Periksa email dan password.", fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return initialError("Email atau password tidak sesuai.");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  if (profileError || !profile) {
    await supabase.auth.signOut();
    return initialError("Profil akun tidak dapat dibaca. Silakan hubungi admin.");
  }
  redirect(resolvePostLoginPath(profile.role as AppRole, parsed.data.next));
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function forgotPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") || "");
  if (!/^\S+@\S+\.\S+$/.test(email)) return initialError("Masukkan alamat email yang valid.");
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset-password` });
  return { ok: true, message: "Jika email terdaftar, tautan reset password telah dikirim." };
}

export async function updatePasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireMember();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return initialError("Password minimal 8 karakter, satu huruf besar, dan satu angka.");
  if (password !== confirmPassword) return initialError("Konfirmasi password tidak sama.");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return initialError("Password belum berhasil diubah.");
  await supabase.from("profiles").update({ must_change_password: false }).eq("id", auth.user.id);
  revalidatePath("/member");
  revalidatePath("/member/profil");
  return { ok: true, message: "Password berhasil diubah." };
}

function friendlyBookingError(message: string) {
  if (message.includes("CLASS_FULL")) return "Maaf, kuota pada tanggal ini sudah penuh.";
  if (message.includes("THEME_MISMATCH")) return "Tanggal ini sudah digunakan untuk tema lain.";
  if (message.includes("DATE_UNAVAILABLE") || message.includes("DATE_IN_PAST")) return "Tanggal yang dipilih sedang tidak tersedia.";
  if (message.includes("ALREADY_BOOKED")) return "Kamu sudah terdaftar pada tanggal tersebut.";
  if (message.includes("SESSION_LIMIT")) return "Jumlah tanggal melebihi rekomendasi pertemuan tema.";
  if (message.includes("DATES_REQUIRED")) return "Pilih minimal satu tanggal kelas.";
  if (message.includes("DUPLICATE_DATES")) return "Ada tanggal yang dipilih lebih dari sekali.";
  return "Pendaftaran belum berhasil. Silakan coba kembali.";
}

function usernameFromName(fullName: string) {
  const normalized = fullName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return (normalized.length >= 3 ? normalized : "member").slice(0, 23);
}

function bookingKey(rootKey: string, classDate: string) {
  const hex = createHash("sha256").update(`${rootKey}:${classDate}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function registerBookingAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Periksa kembali data pendaftaran.", fieldErrors: parsed.error.flatten().fieldErrors };
  const values = parsed.data;
  let classDates: string[];
  try {
    const rawDates: unknown = JSON.parse(values.classDates);
    if (!Array.isArray(rawDates)) throw new Error("INVALID_DATES");
    classDates = [...new Set(rawDates.map(String))];
  } catch {
    return initialError("Pilih minimal satu tanggal kelas.");
  }
  const validDate = /^\d{4}-\d{2}-\d{2}$/;
  if (classDates.length < 1 || classDates.some((date) => !validDate.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)))) return initialError("Pilihan tanggal tidak valid.");
  const phone = normalizeIndonesianPhone(values.phone);
  if (!/^62[0-9]{8,13}$/.test(phone)) return initialError("Nomor WhatsApp tidak valid.");
  const supabase = await createClient();
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (!values.password || values.password.length < 8 || !/[A-Z]/.test(values.password) || !/[0-9]/.test(values.password)) return initialError("Password otomatis belum siap. Muat ulang halaman lalu coba lagi.");
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: values.email,
      password: values.password,
      email_confirm: true,
      user_metadata: {
        full_name: values.fullName,
        username: usernameFromName(values.fullName),
        phone,
        address: values.address,
        village: values.village,
        city: values.city,
        province: values.province,
        village_code: values.villageCode,
        city_code: values.cityCode,
        province_code: values.provinceCode,
        experience_level: values.experienceLevel || null,
        must_change_password: true,
      },
    });
    if (error) {
      const duplicate = error.message.toLowerCase().includes("registered") || error.message.toLowerCase().includes("already");
      const message = duplicate ? "Email sudah terdaftar. Silakan login untuk melanjutkan." : "Akun belum berhasil dibuat. Silakan coba kembali.";
      return initialError(message);
    }
    user = data.user;
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
    if (signInError) {
      if (user) await admin.auth.admin.deleteUser(user.id);
      return initialError("Akun belum berhasil diaktifkan. Silakan coba kembali.");
    }
  }
  if (!user) return initialError("Sesi akun tidak tersedia.");
  const { data, error } = await supabase.rpc("create_bookings", {
    p_theme_id: values.themeId,
    p_class_dates: classDates,
    p_idempotency_keys: classDates.map((classDate) => bookingKey(values.idempotencyKey, classDate)),
  });
  if (error) return initialError(friendlyBookingError(error.message));
  const bookingIds = (Array.isArray(data) ? data : []).map((result) => String(result.booking_id));
  if (!bookingIds.length) return initialError("Pendaftaran belum menghasilkan jadwal. Silakan coba kembali.");
  const temporaryQuery = values.showTemporaryPassword ? "&temporary=1" : "";
  redirect(`/pendaftaran/berhasil?bookings=${encodeURIComponent(bookingIds.join(","))}${temporaryQuery}`);
}

export async function cancelBookingAction(formData: FormData) {
  await requireMember();
  const id = String(formData.get("bookingId") || "");
  const reason = String(formData.get("reason") || "Dibatalkan oleh member");
  const supabase = await createClient();
  await supabase.rpc("cancel_booking", { p_booking_id: id, p_reason: reason });
  revalidatePath("/member"); revalidatePath("/member/kelas");
}

export async function updateProfileAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireMember();
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = normalizeIndonesianPhone(String(formData.get("phone") || ""));
  const experience = String(formData.get("experienceLevel") || "");
  const address = String(formData.get("address") || "").trim();
  const village = String(formData.get("village") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const province = String(formData.get("province") || "").trim();
  const villageCode = String(formData.get("villageCode") || "");
  const cityCode = String(formData.get("cityCode") || "");
  const provinceCode = String(formData.get("provinceCode") || "");
  if (fullName.length < 2 || !/^62[0-9]{8,13}$/.test(phone) || address.length < 5 || village.length < 2 || city.length < 2 || province.length < 2 || !/^\d{10}$/.test(villageCode) || !/^\d{4}$/.test(cityCode) || !/^\d{2}$/.test(provinceCode)) return initialError("Nama, nomor WhatsApp, atau pilihan alamat wilayah belum valid.");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: fullName, phone, address, village, city, province, village_code: villageCode, city_code: cityCode, province_code: provinceCode, experience_level: experience || null }).eq("id", auth.user.id);
  if (error) return initialError("Profil belum berhasil disimpan.");
  revalidatePath("/member/profil");
  return { ok: true, message: "Profil berhasil diperbarui." };
}

export async function saveThemeAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const raw = Object.fromEntries(formData);
  raw.is_active = formData.get("is_active") === "on" ? "true" : "false";
  const parsed = themeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Periksa data tema.", fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const id = String(formData.get("id") || "");
  const gallery_urls = String(formData.get("gallery_urls") || "").split(/[,\n]/).map((url) => url.trim()).filter(Boolean);
  if (gallery_urls.some((url) => !/^https:\/\//.test(url))) return initialError("URL galeri harus menggunakan HTTPS.");
  const payload = { ...parsed.data, thumbnail_url: parsed.data.thumbnail_url || null, gallery_urls };
  const { data, error } = id ? await supabase.from("class_themes").update(payload).eq("id", id).select("id").single() : await supabase.from("class_themes").insert(payload).select("id").single();
  if (error) return initialError(error.code === "23505" ? "Slug sudah digunakan." : "Tema belum berhasil disimpan.");
  revalidatePath("/kelas"); revalidatePath("/admin/tema");
  redirect(`/admin/tema/${data.id}/edit?saved=1`);
}

export async function updateBookingStatusAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_booking_status", { p_booking_id: String(formData.get("bookingId")), p_status: String(formData.get("status")), p_reason: String(formData.get("reason") || "") });
  if (error) redirect(`/admin/pendaftaran/${formData.get("bookingId")}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/pendaftaran"); redirect(`/admin/pendaftaran/${formData.get("bookingId")}?saved=1`);
}

export async function verifyPaymentAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_verify_payment", {
    p_payment_id: String(formData.get("paymentId")), p_amount: Number(formData.get("amount")), p_method: String(formData.get("method")),
    p_paid_at: String(formData.get("paidAt") || new Date().toISOString()), p_notes: String(formData.get("notes") || ""),
  });
  const bookingId = String(formData.get("bookingId"));
  if (error) redirect(`/admin/pendaftaran/${bookingId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin"); revalidatePath("/admin/pendaftaran"); redirect(`/admin/pendaftaran/${bookingId}?saved=1`);
}

export async function saveSettingsAction(formData: FormData) {
  const auth = await requireAdmin();
  const allowed = ["business_name","business_description","business_phone","business_address","business_maps_url","instagram_url","logo_url","banner_url","teacher_photo_url","default_capacity","default_start_time","default_end_time","active_weekdays","reservation_timeout_enabled","reservation_timeout_hours","booking_advance_limit_days","booking_cutoff_hours","cancellation_policy","payment_bank_name","payment_account_number","payment_account_holder","payment_instructions","whatsapp_booking_template","whatsapp_payment_template","website_maintenance_mode","seo_title","seo_description"];
  const rows = allowed.filter((key) => formData.has(key)).map((key) => {
    const raw = String(formData.get(key));
    const numeric = ["default_capacity","reservation_timeout_hours","booking_advance_limit_days","booking_cutoff_hours"].includes(key);
    const bool = ["reservation_timeout_enabled","website_maintenance_mode"].includes(key);
    return { key, value: numeric ? Number(raw) : bool ? raw === "on" : key === "active_weekdays" ? raw.split(",").map(Number) : raw, updated_by: auth.user.id, updated_at: new Date().toISOString() };
  });
  const supabase = await createClient();
  await supabase.from("app_settings").upsert(rows);
  revalidatePath("/"); revalidatePath("/admin/pengaturan");
  redirect("/admin/pengaturan?saved=1");
}

export async function saveClassDateAction(formData: FormData) {
  await requireAdmin();
  const date = String(formData.get("date"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_class_date", {
    p_date: date, p_start: String(formData.get("startTime")), p_end: String(formData.get("endTime")),
    p_capacity: Number(formData.get("capacity")), p_is_open: formData.get("isOpen") === "on",
    p_theme: String(formData.get("themeId") || "") || null, p_lock: formData.get("locked") === "on", p_notes: String(formData.get("notes") || ""),
  });
  if (error) redirect(`/admin/kalender?date=${date}&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/kalender"); revalidatePath("/kelas"); redirect(`/admin/kalender?date=${date}&saved=1`);
}

export async function toggleClassDateAction(formData: FormData) {
  await requireAdmin();
  const date = String(formData.get("date") || "");
  const month = String(formData.get("month") || date.slice(0, 7));
  const isOpen = formData.get("isOpen") === "true";
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_toggle_class_date", { p_date: date, p_is_open: isOpen });

  if (error) {
    const messages: Record<string, string> = {
      DATE_IN_PAST: "Tanggal yang sudah lewat tidak dapat diubah.",
      DATE_HAS_ACTIVE_BOOKINGS: "Tanggal masih memiliki peserta aktif. Pindahkan atau batalkan booking terlebih dahulu.",
    };
    const message = messages[error.message] || "Status tanggal gagal diubah.";
    redirect(`/admin/kalender?month=${month}&date=${date}&error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/kalender");
  revalidatePath("/kelas");
  redirect(`/admin/kalender?month=${month}&date=${date}&saved=1`);
}

export async function rescheduleBookingAction(formData: FormData) {
  await requireAdmin();
  const id=String(formData.get("bookingId")); const date=String(formData.get("targetDate"));
  const supabase=await createClient(); const {error}=await supabase.rpc("admin_reschedule_booking",{p_booking_id:id,p_target_date:date});
  if(error) redirect(`/admin/pendaftaran/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/pendaftaran");redirect(`/admin/pendaftaran/${id}?saved=1`);
}

export async function addThemeModuleAction(formData: FormData) {
  await requireAdmin(); const themeId=String(formData.get("themeId")); const supabase=await createClient();
  await supabase.from("theme_modules").insert({theme_id:themeId,sequence_no:Number(formData.get("sequenceNo")),title:String(formData.get("title")),description:String(formData.get("description")||"")});
  revalidatePath(`/admin/tema/${themeId}/edit`);redirect(`/admin/tema/${themeId}/edit`);
}

export async function deleteThemeModuleAction(formData: FormData) {
  await requireAdmin(); const themeId=String(formData.get("themeId")); const supabase=await createClient();
  await supabase.from("theme_modules").delete().eq("id",String(formData.get("moduleId")));
  revalidatePath(`/admin/tema/${themeId}/edit`);redirect(`/admin/tema/${themeId}/edit`);
}

export async function recordAttendanceAction(formData: FormData) {
  const auth=await requireAdmin(); const bookingId=String(formData.get("bookingId")); const status=String(formData.get("status")); const supabase=await createClient();
  const {error}=await supabase.from("attendance").upsert({booking_id:bookingId,status,completed_module_id:String(formData.get("moduleId")||"")||null,notes:String(formData.get("notes")||""),recorded_by:auth.user.id,recorded_at:new Date().toISOString()},{onConflict:"booking_id"});
  if(!error && status==="PRESENT" && formData.get("markCompleted")==="on") await supabase.rpc("admin_update_booking_status",{p_booking_id:bookingId,p_status:"COMPLETED",p_reason:"Kehadiran dicatat selesai"});
  revalidatePath("/admin/kehadiran");revalidatePath("/member/riwayat");redirect(`/admin/kehadiran?date=${formData.get("date")}&saved=1`);
}

export async function createCalendarBlockAction(formData: FormData) {
  await requireAdmin();const supabase=await createClient();const recurring=formData.get("recurring")==="on";
  await supabase.from("calendar_blocks").insert({title:String(formData.get("title")),block_date:recurring?null:String(formData.get("blockDate")),weekday:recurring?Number(formData.get("weekday")):null,is_recurring:recurring,is_active:true});
  revalidatePath("/admin/kalender");redirect("/admin/kalender?saved=1");
}

export async function bootstrapAdminAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getCurrentUser();
  const provided = String(formData.get("secret") || "");
  const expected = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!auth?.user || !expected || provided !== expected) return initialError("Bootstrap tidak diizinkan.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("bootstrap_first_admin", { bootstrap_user: auth.user.id });
  if (error) return initialError("Bootstrap gagal atau admin sudah tersedia.");
  return { ok: true, message: "Admin pertama berhasil ditetapkan. Hapus ADMIN_BOOTSTRAP_SECRET lalu restart server." };
}
