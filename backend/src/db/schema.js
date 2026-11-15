import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

// Primary Supabase Postgres schema for the application.

export const branches = pgTable("branches", {
  id: text("id").primaryKey(), // Existing IDs: branch-1 and branch-2
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  mapLink: text("map_link"),
  capacity: integer("capacity"),
  amenities: jsonb("amenities").notNull().default([]),
  bookingsEnabled: boolean("bookings_enabled").notNull().default(true),
  halls: jsonb("halls").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Stored in a canonical digits-only form so a customer can only have one row.
  phone: text("phone").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("users_phone_unique_idx").on(table.phone),
]);

export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  branch: text("branch").notNull().references(() => branches.id),
  hall: text("hall"),
  service: text("service").notNull(),
  date: text("date").notNull(),
  duration: integer("duration").notNull(),
  timeSlot: text("time_slot").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  startTimeMinutes: integer("start_time_minutes"),
  endTimeWithBuffer: text("end_time_with_buffer"),
  endTimeWithBufferMinutes: integer("end_time_with_buffer_minutes"),
  membersCount: integer("members_count").notNull().default(0),
  extraPersonsCharge: numeric("extra_persons_charge", { precision: 12, scale: 2 }).notNull().default("0"),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  occasion: text("occasion"),
  customOccasion: text("custom_occasion"),
  decorationRequired: boolean("decoration_required").notNull().default(false),
  cakeRequired: boolean("cake_required").notNull().default(false),
  selectedCake: jsonb("selected_cake"),
  extraDecorations: jsonb("extra_decorations").notNull().default([]),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentType: text("payment_type"),
  paymentMode: text("payment_mode"),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  balanceAmount: numeric("balance_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  reviewRequested: boolean("review_requested").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("bookings_branch_date_idx").on(table.branch, table.date),
  index("bookings_phone_idx").on(table.phone),
]);

export const timeSlots = pgTable("time_slots", {
  id: text("id").primaryKey(),
  branch: text("branch").notNull().references(() => branches.id),
  bookingId: text("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  timeSlot: text("time_slot").notNull(),
  service: text("service").notNull(),
  isBooked: boolean("is_booked").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("time_slots_branch_date_idx").on(table.branch, table.date),
]);

export const branchCatalogs = pgTable("branch_catalogs", {
  branch: text("branch").primaryKey().references(() => branches.id, { onDelete: "cascade" }),
  pricing: jsonb("pricing").notNull().default({}),
  decorationPrice: numeric("decoration_price", { precision: 12, scale: 2 }).notNull().default("1500"),
  cakes: jsonb("cakes").notNull().default([]),
  decorations: jsonb("decorations").notNull().default([]),
  testimonials: jsonb("testimonials").notNull().default([]),
  heroImages: jsonb("hero_images").notNull().default([]),
  branchVideos: jsonb("branch_videos").notNull().default([]),
  galleryVideos: jsonb("gallery_videos").notNull().default([]),
  socialLinks: jsonb("social_links").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  branch: text("branch").references(() => branches.id),
  name: text("name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("reviews_branch_created_at_idx").on(table.branch, table.createdAt),
]);
