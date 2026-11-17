export const BOOKING_STATUSES = [
  "PENDING_ADMIN",
  "AWAITING_PAYMENT",
  "PAYMENT_REVIEW",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
] as const;

export const PAYMENT_STATUSES = ["UNPAID", "REPORTED_PAID", "VERIFIED", "REJECTED"] as const;
export const ACTIVE_BOOKING_STATUSES = BOOKING_STATUSES.slice(0, 5);

export const STATUS_LABEL: Record<string, string> = {
  PENDING_ADMIN: "Menunggu admin",
  AWAITING_PAYMENT: "Menunggu pembayaran",
  PAYMENT_REVIEW: "Pembayaran diperiksa",
  CONFIRMED: "Terkonfirmasi",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
  UNPAID: "Belum dibayar",
  REPORTED_PAID: "Dilaporkan dibayar",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
};
