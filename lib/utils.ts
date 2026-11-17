import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(value: number | string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatDateID(value: string | Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "Asia/Jakarta",
  }).format(new Date(typeof value === "string" ? `${value}T00:00:00+07:00` : value));
}

export function normalizeIndonesianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return `62${digits}`;
}
