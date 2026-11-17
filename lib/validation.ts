import { z } from "zod";

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8), next: z.string().startsWith("/").optional() });
export const registrationSchema = z.object({
  themeId: z.string().uuid(),
  classDates: z.string().min(2),
  fullName: z.string().min(2).max(100),
  phone: z.string().min(9).max(20),
  email: z.string().email(),
  address: z.string().min(5).max(500),
  village: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  province: z.string().min(2).max(100),
  villageCode: z.string().regex(/^\d{10}$/),
  cityCode: z.string().regex(/^\d{4}$/),
  provinceCode: z.string().regex(/^\d{2}$/),
  password: z.string().optional(),
  experienceLevel: z.string().max(100).optional(),
  terms: z.literal("on"),
  idempotencyKey: z.string().uuid(),
  showTemporaryPassword: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export const themeSchema = z.object({
  title: z.string().min(3), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  short_description: z.string().min(10), description: z.string().min(20), thumbnail_url: z.string().url().optional().or(z.literal("")),
  price: z.coerce.number().nonnegative(), duration_minutes: z.coerce.number().int().positive(), recommended_sessions: z.coerce.number().int().positive(),
  difficulty_level: z.string().min(2), requirements: z.string(), materials_info: z.string(), sort_order: z.coerce.number().int(), is_active: z.enum(["true","false"]).transform((v) => v === "true"),
});
