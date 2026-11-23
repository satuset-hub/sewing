"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, CreditCard, Gauge, History, LogOut, Menu, Palette, Scissors, Settings, UsersRound, UserRoundCheck, WalletCards } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const memberItems = [["/member", Gauge, "Ringkasan"], ["/member/kelas", CalendarDays, "Kelas Saya"], ["/member/daftar", Scissors, "Daftar Kelas"], ["/member/riwayat", History, "Riwayat Belajar"], ["/member/profil", UsersRound, "Profil"]] as const;
const adminItems = [["/admin", Gauge, "Dashboard"], ["/admin/transaksi", WalletCards, "Transaksi"], ["/admin/kalender", CalendarDays, "Kalender"], ["/admin/tema", Palette, "Tema Kelas"], ["/admin/pendaftaran", ClipboardList, "Pendaftaran"], ["/admin/member", UsersRound, "Member"], ["/admin/pembayaran", CreditCard, "Pembayaran"], ["/admin/kehadiran", UserRoundCheck, "Kehadiran"], ["/admin/laporan", History, "Laporan"], ["/admin/pengaturan", Settings, "Pengaturan"]] as const;

export function DashboardSidebar({ role, name }: { role: "member" | "admin"; name: string }) {
  const pathname = usePathname();
  const items = role === "admin" ? adminItems : memberItems;
  const rootPath = role === "admin" ? "/admin" : "/member";
  const active = (href: string) => href === rootPath ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return <>
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-white md:flex md:flex-col">
      <Link href="/" className="flex h-18 shrink-0 items-center gap-2 border-b px-6 font-serif text-lg font-bold"><span className="grid size-8 place-items-center rounded-full bg-primary text-white"><Scissors className="size-4"/></span>Rumah Jahit Siju</Link>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Navigasi utama">
        {items.map(([href, Icon, label]) => {
          const selected = active(href);
          return <Link key={href} href={href} aria-current={selected ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition", selected ? "bg-primary text-white shadow-sm hover:bg-primary-dark" : "text-muted hover:bg-cream hover:text-primary")}><Icon className="size-4"/>{label}</Link>;
        })}
      </nav>
      <div className="shrink-0 border-t p-4"><p className="mb-3 truncate px-2 text-xs text-muted">{name}</p><form action={logoutAction}><Button type="submit" variant="ghost" className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"><LogOut className="size-4"/>Logout</Button></form></div>
    </aside>

    <details className="fixed left-4 top-4 z-50 md:hidden">
      <summary className="list-none rounded-full border bg-white p-3 shadow-lg"><Menu className="size-5"/></summary>
      <div className="mt-2 max-h-[calc(100vh-5rem)] w-64 overflow-y-auto rounded-2xl border bg-white p-3 shadow-2xl">
        <p className="mb-2 px-3 py-2 font-serif font-bold">Rumah Jahit Siju</p>
        {items.map(([href, Icon, label]) => {
          const selected = active(href);
          return <Link key={href} href={href} aria-current={selected ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition", selected ? "bg-primary text-white" : "text-muted hover:bg-cream hover:text-primary")}><Icon className="size-4"/>{label}</Link>;
        })}
        <form action={logoutAction} className="mt-2 border-t pt-2"><Button type="submit" variant="ghost" className="w-full justify-start text-red-600"><LogOut className="size-4"/>Logout</Button></form>
      </div>
    </details>
  </>;
}
