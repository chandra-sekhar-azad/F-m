-- Custom SQL migration file, put your code below! --
-- The Express backend connects with the database role. RLS blocks Data API
-- access by anon/authenticated until explicit policies are deliberately added.
ALTER TABLE "branches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "branch_catalogs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "time_slots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
