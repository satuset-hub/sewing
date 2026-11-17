export type UserRole = "admin" | "member";
export type BookingStatus = "PENDING_ADMIN" | "AWAITING_PAYMENT" | "PAYMENT_REVIEW" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "EXPIRED";
export type PaymentStatus = "UNPAID" | "REPORTED_PAID" | "VERIFIED" | "REJECTED";
export type AvailabilityStatus = "AVAILABLE" | "THEME_LOCKED" | "FULL" | "CLOSED" | "HOLIDAY" | "PAST";

export interface Theme {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  thumbnail_url: string | null;
  gallery_urls: string[];
  price: number;
  duration_minutes: number;
  recommended_sessions: number;
  difficulty_level: string;
  requirements: string;
  materials_info: string;
  is_active: boolean;
  sort_order: number;
  theme_modules?: ThemeModule[];
}

export interface ThemeModule { id: string; theme_id: string; sequence_no: number; title: string; description: string; }
export interface Profile { id: string; username: string; full_name: string; email: string; phone: string; address: string; village: string; city: string; province: string; village_code: string; city_code: string; province_code: string; role: UserRole; experience_level: string | null; must_change_password: boolean; created_at: string; }
export interface Availability { class_date: string; status: AvailabilityStatus; capacity: number; active_bookings: number; remaining_seats: number; theme_id: string | null; theme_title: string | null; start_time: string; end_time: string; }

export interface Booking {
  id: string;
  booking_code: string;
  member_id: string;
  theme_id: string;
  class_date_id: string;
  price_snapshot: number;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
  class_themes?: Pick<Theme, "title" | "slug" | "thumbnail_url">;
  class_dates?: { class_date: string; start_time: string; end_time: string };
  payments?: { id: string; status: PaymentStatus; amount_due: number; amount_received: number }[];
  profiles?: Pick<Profile, "full_name" | "phone" | "email" | "username">;
}
