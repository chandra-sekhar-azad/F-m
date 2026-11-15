CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"branch" text NOT NULL,
	"hall" text,
	"service" text NOT NULL,
	"date" text NOT NULL,
	"duration" integer NOT NULL,
	"time_slot" text NOT NULL,
	"start_time" text,
	"end_time" text,
	"start_time_minutes" integer,
	"end_time_with_buffer" text,
	"end_time_with_buffer_minutes" integer,
	"members_count" integer DEFAULT 0 NOT NULL,
	"extra_persons_charge" numeric(12, 2) DEFAULT '0' NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"occasion" text,
	"custom_occasion" text,
	"decoration_required" boolean DEFAULT false NOT NULL,
	"cake_required" boolean DEFAULT false NOT NULL,
	"selected_cake" jsonb,
	"extra_decorations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"payment_type" text,
	"payment_mode" text,
	"amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"balance_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"review_requested" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_catalogs" (
	"branch" text PRIMARY KEY NOT NULL,
	"pricing" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"decoration_price" numeric(12, 2) DEFAULT '1500' NOT NULL,
	"cakes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"decorations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"testimonials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hero_images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"branch_videos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gallery_videos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"map_link" text,
	"capacity" integer,
	"amenities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bookings_enabled" boolean DEFAULT true NOT NULL,
	"halls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"branch" text,
	"name" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"branch" text NOT NULL,
	"booking_id" text,
	"date" text NOT NULL,
	"time_slot" text NOT NULL,
	"service" text NOT NULL,
	"is_booked" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_branch_branches_id_fk" FOREIGN KEY ("branch") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_catalogs" ADD CONSTRAINT "branch_catalogs_branch_branches_id_fk" FOREIGN KEY ("branch") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_branch_branches_id_fk" FOREIGN KEY ("branch") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_branch_branches_id_fk" FOREIGN KEY ("branch") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_branch_date_idx" ON "bookings" USING btree ("branch","date");--> statement-breakpoint
CREATE INDEX "bookings_phone_idx" ON "bookings" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "reviews_branch_created_at_idx" ON "reviews" USING btree ("branch","created_at");--> statement-breakpoint
CREATE INDEX "time_slots_branch_date_idx" ON "time_slots" USING btree ("branch","date");