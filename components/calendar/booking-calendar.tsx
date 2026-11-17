"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Availability } from "@/lib/types";
import { cn, formatRupiah } from "@/lib/utils";

export function BookingCalendar({ dates, maxSelections, price, name = "classDates" }: { dates: Availability[]; maxSelections: number; price: number; name?: string }) {
  const available = useMemo(() => dates.filter((date) => date.status === "AVAILABLE" || date.status === "THEME_LOCKED"), [dates]);
  const months = useMemo(() => Array.from(new Set(dates.map((date) => date.class_date.slice(0, 7)))), [dates]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const month = months[index];
  const monthDates = dates.filter((date) => date.class_date.startsWith(month || ""));
  const first = monthDates[0] ? parseISO(monthDates[0].class_date) : new Date();
  const offset = first.getDay();

  function toggleDate(classDate: string) {
    setSelected((current) => {
      if (current.includes(classDate)) return current.filter((date) => date !== classDate);
      if (current.length >= maxSelections) return current;
      return [...current, classDate].sort();
    });
  }

  return <div>
    <input type="hidden" name={name} value={JSON.stringify(selected)} />
    <div className="mb-4 flex items-center justify-between gap-2">
      <Button type="button" size="icon" variant="secondary" disabled={index === 0} onClick={() => setIndex((value) => value - 1)} aria-label="Bulan sebelumnya"><ChevronLeft className="size-4" /></Button>
      <p className="text-center font-serif text-base font-bold capitalize sm:text-lg">{month ? format(parseISO(`${month}-01`), "MMMM yyyy", { locale: id }) : "Tidak tersedia"}</p>
      <Button type="button" size="icon" variant="secondary" disabled={index >= months.length - 1} onClick={() => setIndex((value) => value + 1)} aria-label="Bulan berikutnya"><ChevronRight className="size-4" /></Button>
    </div>
    <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted sm:text-xs">
      {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => <span key={day} className="py-2">{day}</span>)}
      {Array.from({ length: offset }).map((_, blankIndex) => <span key={`blank-${blankIndex}`} />)}
      {monthDates.map((date) => {
        const enabled = date.status === "AVAILABLE" || date.status === "THEME_LOCKED";
        const isSelected = selected.includes(date.class_date);
        const atLimit = !isSelected && selected.length >= maxSelections;
        return <button type="button" key={date.class_date} disabled={!enabled || atLimit} aria-pressed={isSelected} onClick={() => toggleDate(date.class_date)} title={`${date.status} — ${date.remaining_seats} kursi tersisa`} className={cn("relative aspect-square min-w-0 rounded-lg border text-xs transition enabled:hover:border-primary enabled:hover:bg-primary/5 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 sm:rounded-xl sm:text-sm", isSelected && "border-primary bg-primary text-white hover:bg-primary")}>{parseInt(date.class_date.slice(-2))}{date.status === "THEME_LOCKED" && !isSelected && <LockKeyhole className="absolute right-0.5 top-0.5 size-2.5 text-warning sm:right-1 sm:top-1 sm:size-3" />}{isSelected && <Check className="absolute right-0.5 top-0.5 size-2.5 sm:right-1 sm:top-1 sm:size-3" />}</button>;
      })}
    </div>
    <div className="mt-4 rounded-2xl bg-cream p-4">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-sm font-semibold">{selected.length} dari maksimal {maxSelections} pertemuan</p><p className="mt-1 text-xs text-muted">Kamu boleh memilih satu pertemuan dulu.</p></div>
        <div className="text-right"><p className="text-xs text-muted">Total harga</p><p className="font-bold text-primary">{formatRupiah(price * selected.length)}</p></div>
      </div>
      {selected.length > 0 ? <ul className="mt-3 space-y-1 border-t pt-3 text-xs text-success sm:text-sm">{selected.map((classDate) => <li key={classDate}><b>{format(parseISO(classDate), "EEEE, d MMMM yyyy", { locale: id })}</b>{` · ${available.find((item) => item.class_date === classDate)?.remaining_seats ?? 0} kursi tersisa`}</li>)}</ul> : <p className="mt-3 border-t pt-3 text-xs text-muted sm:text-sm">Pilih minimal satu tanggal. Tanggal abu-abu tidak tersedia, penuh, atau melewati batas pilihan.</p>}
    </div>
  </div>;
}
