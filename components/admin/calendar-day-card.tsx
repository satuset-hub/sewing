"use client";

import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { LockKeyhole, X } from "lucide-react";
import { useFormStatus } from "react-dom";
import { lockClassDateAction, toggleClassDateAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/shared/submit-button";
import { cn } from "@/lib/utils";

type ThemeOption = { id: string; title: string };

type AdminCalendarDayCardProps = {
  date: string;
  formattedDate: string;
  dayNumber: number;
  month: string;
  isOn: boolean;
  isPast: boolean;
  isSelected: boolean;
  statusClass: string;
  themeId: string | null;
  themeTitle: string | null;
  activeBookings: number;
  capacity: number;
  themes: ThemeOption[];
};

function ToggleSwitch({ isOn, isPast, formattedDate }: Pick<AdminCalendarDayCardProps, "isOn" | "isPast" | "formattedDate">) {
  const { pending } = useFormStatus();
  return <button
    type="submit"
    role="switch"
    aria-checked={isOn}
    aria-label={`${isOn ? "Nonaktifkan" : "Aktifkan"} ${formattedDate}`}
    title={isOn ? "Tanggal aktif" : "Tanggal nonaktif"}
    disabled={isPast || pending}
    className={cn(
      "relative mt-0.5 h-4 w-8 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 sm:h-5 sm:w-10",
      isOn ? "bg-success" : "bg-stone-400",
      pending && "animate-pulse",
    )}
  >
    <span className={cn(
      "absolute left-0.5 top-0.5 size-3 rounded-full bg-white shadow-sm transition-transform sm:size-4",
      isOn ? "translate-x-4 sm:translate-x-5" : "translate-x-0",
    )} />
  </button>;
}

export function AdminCalendarDayCard(props: AdminCalendarDayCardProps) {
  const {
    date, formattedDate, dayNumber, month, isOn, isPast, isSelected, statusClass,
    themeId, themeTitle, activeBookings, capacity, themes,
  } = props;

  return <div className={cn(
    "min-h-24 rounded-lg border p-1 text-left sm:min-h-28 sm:rounded-xl sm:p-2",
    statusClass,
    isSelected && "ring-2 ring-primary",
  )}>
    <div className="flex items-start justify-between gap-1">
      <Link
        href={`/admin/kalender?month=${month}&date=${date}`}
        className="rounded px-0.5 text-xs font-bold hover:text-primary sm:text-sm"
        aria-label={`Lihat informasi ${formattedDate}`}
      >
        {dayNumber}
      </Link>
      <form action={toggleClassDateAction}>
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="month" value={month} />
        <input type="hidden" name="isOpen" value={String(!isOn)} />
        <ToggleSwitch isOn={isOn} isPast={isPast} formattedDate={formattedDate} />
      </form>
    </div>

    <Link
      href={`/admin/kalender?month=${month}&date=${date}`}
      className="mt-1 block min-h-10 rounded-md p-0.5 hover:bg-white/50 sm:min-h-12"
    >
      <span className="block truncate text-[8px] font-semibold sm:text-[10px]">{themeTitle || "Belum ada kelas"}</span>
      <span className="block text-[8px] sm:text-[10px]">{activeBookings}/{capacity} peserta</span>
    </Link>

    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant="secondary"
          disabled={isPast || !isOn || themes.length === 0}
          title={!isOn ? "Aktifkan tanggal sebelum memilih lock" : "Pilih tema untuk tanggal ini"}
          className="mt-1 h-6 w-full gap-1 px-1 text-[8px] sm:h-7 sm:text-[10px]"
        >
          <LockKeyhole className="size-2.5 sm:size-3" /> LOCK
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-espresso/45 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border bg-white p-6 shadow-2xl focus:outline-none sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-serif text-2xl font-bold">Lock tema kelas</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">Pilih tema yang khusus tersedia pada {formattedDate}.</Dialog.Description>
            </div>
            <Dialog.Close asChild><Button type="button" size="icon" variant="ghost" className="-mr-2 -mt-2"><X className="size-4" /><span className="sr-only">Tutup</span></Button></Dialog.Close>
          </div>

          <form action={lockClassDateAction} className="mt-6 space-y-5">
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="month" value={month} />
            <div>
              <label htmlFor={`theme-${date}`} className="mb-2 block text-sm font-semibold">Tema / kelas</label>
              <select
                id={`theme-${date}`}
                name="themeId"
                defaultValue={themeId || ""}
                required
                className="h-12 w-full rounded-xl border bg-white px-3 text-sm"
              >
                <option value="" disabled>Pilih tema kelas</option>
                {themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.title}</option>)}
              </select>
              {themeTitle && <p className="mt-2 text-xs text-muted">Tema saat ini: <b>{themeTitle}</b></p>}
            </div>
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild><Button type="button" variant="secondary">Batal</Button></Dialog.Close>
              <SubmitButton pendingText="Mengunci…"><LockKeyhole className="size-4" />Simpan lock</SubmitButton>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>;
}
