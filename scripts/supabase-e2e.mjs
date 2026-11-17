import { readFileSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function readEnv(path) {
  return Object.fromEntries(readFileSync(path, "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
    const separator = line.indexOf("=");
    const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    return [line.slice(0, separator), value];
  }));
}

const env = readEnv(".env.local");
for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const prefix = `e2e-${Date.now()}-${randomBytes(3).toString("hex")}`;
const createdUserIds = [];
const createdBookingIds = [];
const createdDates = [];
let testThemeId = null;
let storagePath = null;
const checks = [];

function pass(name, detail) {
  checks.push({ name, ok: true, ...(detail ? { detail } : {}) });
}

function assert(condition, name, detail) {
  if (!condition) throw new Error(`${name}${detail ? `: ${detail}` : ""}`);
  pass(name, detail);
}

function messageIncludes(error, code) {
  return Boolean(error && String(error.message).includes(code));
}

function jakartaDate(offsetDays) {
  const target = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(target);
}

async function createTestUser(label, index) {
  const email = `${prefix}-${label}-${index}@example.com`;
  const password = `${randomBytes(24).toString("base64url")}Aa1!`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `E2E ${label} ${index}`,
      username: `${prefix}-${label}-${index}`.slice(0, 23),
      phone: `62812000${String(index).padStart(5, "0")}`,
      experience_level: "E2E only",
    },
  });
  if (error || !data.user) throw new Error(`Failed to create ${label} test user: ${error?.message ?? "unknown"}`);
  createdUserIds.push(data.user.id);
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw new Error(`Failed to authenticate ${label} test user: ${login.error.message}`);
  return { id: data.user.id, client };
}

async function rpcBooking(user, themeId, classDate, idempotencyKey = randomUUID()) {
  return user.client.rpc("create_booking", {
    p_theme_id: themeId,
    p_class_date: classDate,
    p_module_id: null,
    p_notes: prefix,
    p_idempotency_key: idempotencyKey,
  });
}

async function cleanup() {
  if (storagePath) await service.storage.from("theme-media").remove([storagePath]);
  if (createdBookingIds.length) {
    await service.from("attendance").delete().in("booking_id", createdBookingIds);
    await service.from("payments").delete().in("booking_id", createdBookingIds);
    await service.from("booking_status_history").delete().in("booking_id", createdBookingIds);
    await service.from("audit_logs").delete().in("entity_id", createdBookingIds);
    await service.from("bookings").delete().in("id", createdBookingIds);
  }
  if (createdDates.length) {
    const { data: dateRows } = await service.from("class_dates").select("id").in("class_date", createdDates);
    if (dateRows?.length) {
      await service.from("audit_logs").delete().in("entity_id", dateRows.map((row) => row.id));
      await service.from("class_dates").delete().in("id", dateRows.map((row) => row.id));
    }
  }
  if (testThemeId) {
    await service.from("theme_modules").delete().eq("theme_id", testThemeId);
    await service.from("audit_logs").delete().eq("entity_id", testThemeId);
    await service.from("class_themes").delete().eq("id", testThemeId);
  }
  if (createdUserIds.length) {
    await service.from("audit_logs").delete().in("actor_id", createdUserIds);
    for (const id of createdUserIds) await service.auth.admin.deleteUser(id);
  }
}

try {
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: publicThemes, error: publicThemeError } = await anon.from("class_themes").select("id,slug,is_active").eq("is_active", true);
  assert(!publicThemeError && publicThemes.length === 1, "Guest can read active seeded theme");
  const seedThemeId = publicThemes[0].id;

  const anonProfiles = await anon.from("profiles").select("id");
  assert(Boolean(anonProfiles.error) || anonProfiles.data.length === 0, "Guest cannot read profiles");
  const anonBookings = await anon.from("bookings").select("id");
  assert(Boolean(anonBookings.error) || anonBookings.data.length === 0, "Guest cannot read bookings");

  const { data: secondTheme, error: themeError } = await service.from("class_themes").insert({
    title: `E2E Theme ${prefix}`,
    slug: prefix,
    short_description: "Tema khusus pengujian integrasi yang akan dihapus.",
    description: "Tema ini dibuat otomatis untuk menguji penguncian tema dan dibersihkan setelah pengujian.",
    price: 90000,
    duration_minutes: 120,
    recommended_sessions: 1,
    difficulty_level: "E2E",
    requirements: "E2E",
    materials_info: "E2E",
    is_active: true,
    sort_order: 9999,
  }).select("id").single();
  if (themeError) throw themeError;
  testThemeId = secondTheme.id;

  const admin = await createTestUser("admin", 1);
  const members = [];
  for (let index = 1; index <= 4; index += 1) members.push(await createTestUser("member", index + 1));
  pass("Authentication works for generated test users");

  const bootstrap = await admin.client.rpc("bootstrap_first_admin", { bootstrap_user: admin.id });
  assert(!bootstrap.error, "First admin bootstrap works without a default password");
  const { data: adminProfile } = await service.from("profiles").select("role").eq("id", admin.id).single();
  assert(adminProfile.role === "admin", "Admin role persisted in profile");

  const selfEscalation = await members[0].client.from("profiles").update({ role: "admin" }).eq("id", members[0].id).select("role");
  assert(Boolean(selfEscalation.error), "Member cannot promote own role");
  const otherProfile = await members[0].client.from("profiles").select("id").eq("id", members[1].id);
  assert(!otherProfile.error && otherProfile.data.length === 0, "Member cannot read another profile");

  const availability = await anon.rpc("get_calendar_availability", {
    date_from: jakartaDate(1),
    date_to: jakartaDate(30),
    filter_theme_id: seedThemeId,
  });
  if (availability.error) throw availability.error;
  const availableDates = availability.data.filter((row) => row.status === "AVAILABLE").map((row) => row.class_date);
  assert(availableDates.length >= 7, "Public calendar RPC returns future availability");
  const [primaryDate, capacityDate, raceDate, rescheduleSource, rescheduleTarget, multiDateOne, multiDateTwo] = availableDates.slice(0, 7);
  createdDates.push(primaryDate, capacityDate, raceDate, rescheduleSource, rescheduleTarget, multiDateOne, multiDateTwo);

  const multiBooking = await members[0].client.rpc("create_bookings", {
    p_theme_id: seedThemeId,
    p_class_dates: [multiDateOne, multiDateTwo],
    p_idempotency_keys: [randomUUID(), randomUUID()],
  });
  if (multiBooking.error) throw multiBooking.error;
  multiBooking.data.forEach((row) => createdBookingIds.push(row.booking_id));
  assert(multiBooking.data.length === 2, "Member can book multiple recommended meetings atomically");

  const overLimit = await members[1].client.rpc("create_bookings", {
    p_theme_id: testThemeId,
    p_class_dates: [multiDateOne, multiDateTwo],
    p_idempotency_keys: [randomUUID(), randomUUID()],
  });
  assert(messageIncludes(overLimit.error, "SESSION_LIMIT"), "Theme recommendation limits selected meetings");

  const primaryKey = randomUUID();
  const first = await rpcBooking(members[0], seedThemeId, primaryDate, primaryKey);
  if (first.error) throw first.error;
  const firstBooking = first.data[0];
  createdBookingIds.push(firstBooking.booking_id);
  const retry = await rpcBooking(members[0], seedThemeId, primaryDate, primaryKey);
  assert(!retry.error && retry.data[0].booking_id === firstBooking.booking_id, "Idempotent retry returns original booking");

  const wrongTheme = await rpcBooking(members[1], testThemeId, primaryDate);
  assert(messageIncludes(wrongTheme.error, "THEME_MISMATCH"), "Different theme is rejected on locked date");
  for (const member of members.slice(1, 3)) {
    const result = await rpcBooking(member, seedThemeId, primaryDate);
    if (result.error) throw result.error;
    createdBookingIds.push(result.data[0].booking_id);
  }
  const fourth = await rpcBooking(members[3], seedThemeId, primaryDate);
  assert(messageIncludes(fourth.error, "CLASS_FULL"), "Fourth participant is rejected at capacity three");
  const { data: lockedDate } = await service.from("class_dates").select("theme_id,capacity").eq("class_date", primaryDate).single();
  assert(lockedDate.theme_id === seedThemeId && lockedDate.capacity === 3, "First participant locks theme and capacity is three");

  const otherBooking = await members[1].client.from("bookings").select("id").eq("id", firstBooking.booking_id);
  assert(!otherBooking.error && otherBooking.data.length === 0, "Member cannot read another booking");

  const { data: payment } = await service.from("payments").select("id,amount_due,status").eq("booking_id", firstBooking.booking_id).single();
  for (const status of ["AWAITING_PAYMENT", "PAYMENT_REVIEW"]) {
    const update = await admin.client.rpc("admin_update_booking_status", { p_booking_id: firstBooking.booking_id, p_status: status, p_reason: prefix });
    if (update.error) throw update.error;
  }
  const verify = await admin.client.rpc("admin_verify_payment", {
    p_payment_id: payment.id,
    p_amount: payment.amount_due,
    p_method: "E2E_MANUAL_TRANSFER",
    p_paid_at: new Date().toISOString(),
    p_notes: prefix,
  });
  if (verify.error) throw verify.error;
  const { data: verifiedPayment } = await service.from("payments").select("status").eq("id", payment.id).single();
  const { data: reviewBooking } = await service.from("bookings").select("status").eq("id", firstBooking.booking_id).single();
  assert(verifiedPayment.status === "VERIFIED" && reviewBooking.status === "PAYMENT_REVIEW", "Payment verification does not silently approve booking");
  const approve = await admin.client.rpc("admin_update_booking_status", { p_booking_id: firstBooking.booking_id, p_status: "CONFIRMED", p_reason: prefix });
  if (approve.error) throw approve.error;
  const { data: approvedBooking } = await service.from("bookings").select("status").eq("id", firstBooking.booking_id).single();
  assert(approvedBooking.status === "CONFIRMED", "Admin can approve after verified payment");

  await members[1].client.from("payments").update({ status: "REJECTED" }).eq("id", payment.id);
  const { data: unchangedPayment } = await service.from("payments").select("status").eq("id", payment.id).single();
  assert(unchangedPayment.status === "VERIFIED", "Member cannot change payment status");

  const seedModule = await service.from("theme_modules").select("id").eq("theme_id", seedThemeId).order("sequence_no").limit(1).single();
  const attendance = await admin.client.from("attendance").insert({
    booking_id: firstBooking.booking_id,
    status: "PRESENT",
    completed_module_id: seedModule.data.id,
    notes: prefix,
    recorded_by: admin.id,
  });
  if (attendance.error) throw attendance.error;
  const complete = await admin.client.rpc("admin_update_booking_status", { p_booking_id: firstBooking.booking_id, p_status: "COMPLETED", p_reason: prefix });
  if (complete.error) throw complete.error;
  const ownAttendance = await members[0].client.from("attendance").select("status,completed_module_id").eq("booking_id", firstBooking.booking_id).single();
  assert(!ownAttendance.error && ownAttendance.data.status === "PRESENT", "Completed learning history is visible to its member");

  const concurrent = await Promise.all(members.map((member) => rpcBooking(member, seedThemeId, capacityDate)));
  const concurrentSuccess = concurrent.map((result, index) => ({ result, index })).filter(({ result }) => !result.error);
  const concurrentFailure = concurrent.map((result, index) => ({ result, index })).filter(({ result }) => Boolean(result.error));
  concurrentSuccess.forEach(({ result }) => createdBookingIds.push(result.data[0].booking_id));
  assert(concurrentSuccess.length === 3 && concurrentFailure.length === 1 && messageIncludes(concurrentFailure[0].result.error, "CLASS_FULL"), "Concurrent requests never exceed capacity three");
  const cancelled = concurrentSuccess[0];
  const cancelResult = await members[cancelled.index].client.rpc("cancel_booking", { p_booking_id: cancelled.result.data[0].booking_id, p_reason: prefix });
  if (cancelResult.error) throw cancelResult.error;
  const replacement = await rpcBooking(members[concurrentFailure[0].index], seedThemeId, capacityDate);
  if (replacement.error) throw replacement.error;
  createdBookingIds.push(replacement.data[0].booking_id);
  pass("Cancellation returns a seat for another participant");
  for (const { result, index } of concurrentSuccess.slice(1)) await members[index].client.rpc("cancel_booking", { p_booking_id: result.data[0].booking_id, p_reason: prefix });
  await members[concurrentFailure[0].index].client.rpc("cancel_booking", { p_booking_id: replacement.data[0].booking_id, p_reason: prefix });
  const { data: releasedDate } = await service.from("class_dates").select("theme_id").eq("class_date", capacityDate).single();
  assert(releasedDate.theme_id === null, "Theme unlocks after all active bookings are cancelled");

  const race = await Promise.all([
    rpcBooking(members[0], seedThemeId, raceDate),
    rpcBooking(members[1], testThemeId, raceDate),
  ]);
  const raceSuccess = race.map((result, index) => ({ result, index })).filter(({ result }) => !result.error);
  const raceFailure = race.filter((result) => Boolean(result.error));
  raceSuccess.forEach(({ result }) => createdBookingIds.push(result.data[0].booking_id));
  assert(raceSuccess.length === 1 && raceFailure.length === 1 && messageIncludes(raceFailure[0].error, "THEME_MISMATCH"), "Concurrent first bookings cannot lock two themes");

  const sourceBooking = await rpcBooking(members[3], seedThemeId, rescheduleSource);
  if (sourceBooking.error) throw sourceBooking.error;
  createdBookingIds.push(sourceBooking.data[0].booking_id);
  const moved = await admin.client.rpc("admin_reschedule_booking", { p_booking_id: sourceBooking.data[0].booking_id, p_target_date: rescheduleTarget });
  if (moved.error) throw moved.error;
  const { data: movedBooking } = await service.from("bookings").select("class_dates(class_date)").eq("id", sourceBooking.data[0].booking_id).single();
  assert(movedBooking.class_dates.class_date === rescheduleTarget, "Admin reschedule validates and moves booking atomically");

  storagePath = `${prefix}/pixel.png`;
  const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const adminUpload = await admin.client.storage.from("theme-media").upload(storagePath, pixel, { contentType: "image/png", upsert: false });
  if (adminUpload.error) throw adminUpload.error;
  const memberUpload = await members[0].client.storage.from("theme-media").upload(`${prefix}/forbidden.png`, pixel, { contentType: "image/png", upsert: false });
  assert(Boolean(memberUpload.error), "Non-admin member cannot upload theme media");
  const publicDownload = await anon.storage.from("theme-media").download(storagePath);
  assert(!publicDownload.error && publicDownload.data.size > 0, "Public can read approved theme media");

  const past = await anon.rpc("get_calendar_availability", { date_from: jakartaDate(-1), date_to: jakartaDate(-1), filter_theme_id: seedThemeId });
  assert(!past.error && past.data[0].status === "PAST", "Calendar uses Asia/Jakarta date semantics");

  console.log(JSON.stringify({ ok: true, prefix, checksPassed: checks.length, checks }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, prefix, checksPassed: checks.length, failed: String(error.message).slice(0, 240), checks }, null, 2));
  process.exitCode = 1;
} finally {
  await cleanup();
  const remainingUsers = await service.from("profiles").select("id", { count: "exact", head: true }).like("username", `${prefix}%`);
  const remainingThemes = await service.from("class_themes").select("id", { count: "exact", head: true }).eq("slug", prefix);
  const remainingBookings = await service.from("bookings").select("id", { count: "exact", head: true }).eq("notes", prefix);
  console.log(JSON.stringify({ cleanup: { users: remainingUsers.count ?? 0, themes: remainingThemes.count ?? 0, bookings: remainingBookings.count ?? 0 } }, null, 2));
}
