import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe,expect,it } from "vitest";

const schema=readFileSync(resolve("supabase/migrations/202611170001_initial_schema.sql"),"utf8");
const multiSession=readFileSync(resolve("supabase/migrations/202611170006_multi_session_registration.sql"),"utf8");
const profileRegions=readFileSync(resolve("supabase/migrations/202611170007_profile_regions.sql"),"utf8");
const profileRegionCodes=readFileSync(resolve("supabase/migrations/202611170008_profile_region_codes.sql"),"utf8");

describe("jaminan schema dan keamanan",()=>{
  it("mengaktifkan RLS pada seluruh tabel operasional",()=>{
    for(const table of ["profiles","class_themes","theme_modules","class_dates","calendar_blocks","bookings","payments","attendance","app_settings","booking_status_history","audit_logs"]){
      expect(schema).toContain(`alter table public.${table} enable row level security`);
    }
  });
  it("member hanya dapat membaca payment miliknya dan tidak memiliki policy update",()=>{
    expect(schema).toContain('create policy "payments own read"');
    expect(schema).not.toMatch(/create policy "payments own update"/);
  });
  it("perubahan role member dilindungi trigger database",()=>{
    expect(schema).toContain("ROLE_CHANGE_FORBIDDEN");
    expect(schema).toContain("create trigger protect_profile");
  });
  it("confirm ditolak jika payment belum verified dan confirmed tidak dapat expired",()=>{
    expect(schema).toContain("PAYMENT_NOT_VERIFIED");
    expect(schema).toContain("CONFIRMED_CANNOT_EXPIRE");
  });
  it("double submit dilindungi idempotency dan partial unique index",()=>{
    expect(schema).toContain("unique(member_id, idempotency_key)");
    expect(schema).toContain("bookings_one_active_member_date_idx");
  });
  it("booking dan reschedule memakai lock transaksi",()=>{
    expect(schema.match(/pg_advisory_xact_lock/g)?.length).toBeGreaterThanOrEqual(3);
    expect(schema).toContain("first_date:=least(old_date.class_date,p_target_date)");
  });
  it("tanggal operasional dihitung konsisten dalam Asia/Jakarta",()=>{
    expect(schema.match(/Asia\/Jakarta/g)?.length).toBeGreaterThanOrEqual(2);
  });
  it("multi tanggal dibatasi rekomendasi dan dibuat dalam satu RPC",()=>{
    expect(multiSession).toContain("cardinality(p_class_dates) > v_theme.recommended_sessions");
    expect(multiSession).toContain("DUPLICATE_DATES");
    expect(multiSession).toContain("from public.create_booking(");
    expect(multiSession).toContain("grant execute on function public.create_bookings");
  });
  it("profil menyimpan alamat dan penanda password sementara",()=>{
    expect(multiSession).toContain("add column if not exists address");
    expect(multiSession).toContain("add column if not exists must_change_password");
  });
  it("profil menyimpan kelurahan, kota, dan provinsi secara terpisah",()=>{
    for(const column of ["village","city","province"]){
      expect(profileRegions).toContain(`add column if not exists ${column}`);
      expect(profileRegions).toContain(`new.raw_user_meta_data->>'${column}'`);
    }
  });
  it("profil menyimpan kode wilayah untuk filter bertingkat",()=>{
    for(const column of ["village_code","city_code","province_code"]){
      expect(profileRegionCodes).toContain(`add column if not exists ${column}`);
      expect(profileRegionCodes).toContain(`new.raw_user_meta_data->>'${column}'`);
    }
  });
});
