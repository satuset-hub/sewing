import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Availability, Booking, Theme } from "@/lib/types";

export async function getPublicSettings(): Promise<Record<string, unknown>> {
  if (!getSupabaseEnv().configured) return {};
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_settings");
  return (data ?? {}) as Record<string, unknown>;
}

export async function getPublicThemes(): Promise<Theme[]> {
  if (!getSupabaseEnv().configured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("class_themes").select("*, theme_modules(*)").eq("is_active", true).order("sort_order");
  if (error) {
    console.error("getPublicThemes failed", { code: error.code, message: error.message });
    throw new Error("Gagal memuat tema kelas");
  }
  return (data ?? []) as Theme[];
}

export async function getThemeDetails(slug: string): Promise<Theme | null> {
  if (!getSupabaseEnv().configured) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("class_themes").select("*, theme_modules(*)").eq("slug", slug).eq("is_active", true).order("sequence_no", { referencedTable: "theme_modules" }).maybeSingle();
  return data as Theme | null;
}

export async function getCalendarAvailability(from: string, to: string, themeId?: string): Promise<Availability[]> {
  if (!getSupabaseEnv().configured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_calendar_availability", { date_from: from, date_to: to, filter_theme_id: themeId ?? null });
  if (error) throw new Error("Gagal memuat kalender");
  return (data ?? []) as Availability[];
}

export async function getMemberBookings(memberId: string): Promise<Booking[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("bookings").select("*, class_themes(title,slug,thumbnail_url), class_dates(class_date,start_time,end_time), payments(id,status,amount_due,amount_received)").eq("member_id", memberId).order("created_at", { ascending: false });
  if (error) throw new Error("Gagal memuat kelas");
  return (data ?? []) as Booking[];
}
