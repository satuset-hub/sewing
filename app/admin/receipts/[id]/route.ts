import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getCurrentUser();
  if (!auth?.user || auth.profile?.role !== "admin") return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("cash_transactions").select("receipt_path").eq("id", id).maybeSingle();
  if (!data?.receipt_path) return NextResponse.json({ error: "Struk tidak ditemukan." }, { status: 404 });
  const { data: signed } = await supabase.storage.from("cash-receipts").createSignedUrl(data.receipt_path, 60);
  if (!signed?.signedUrl) return NextResponse.json({ error: "Struk belum dapat dibuka." }, { status: 404 });
  return NextResponse.redirect(signed.signedUrl);
}
