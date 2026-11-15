import { desc, eq } from 'drizzle-orm';
import { createPostgresClient } from '../db/client.js';
import { branchCatalogs, branches, reviews } from '../db/schema.js';
import { createBranchPricingDb, defaultPricing } from '../config/constants.js';

const withDb = async (work) => {
  const { db, client } = createPostgresClient();
  try { return await work(db); } finally { await client.end({ timeout: 5 }); }
};

const catalogRowToObject = (row, branch) => ({
  ...createBranchPricingDb(branch.id), ...row, branchId: branch.id,
  name: branch.name, address: branch.address, phone: branch.phone, mapLink: branch.mapLink,
  halls: branch.halls || [], bookingsEnabled: branch.bookingsEnabled,
  decorationPrice: Number(row.decorationPrice),
});

export const getCatalogForBranch = (branchId = 'branch-1') => withDb(async (db) => {
  const [result] = await db.select({ branch: branches, catalog: branchCatalogs }).from(branches)
    .leftJoin(branchCatalogs, eq(branchCatalogs.branch, branches.id)).where(eq(branches.id, branchId));
  if (!result) return null;
  if (!result.catalog) {
    const defaults = createBranchPricingDb(branchId);
    await db.insert(branchCatalogs).values({ branch: branchId, pricing: defaults.pricing, decorationPrice: String(defaults.decorationPrice), cakes: defaults.cakes, decorations: defaults.decorations, testimonials: [], heroImages: [], branchVideos: [], galleryVideos: [], socialLinks: defaults.socialLinks }).onConflictDoNothing();
    return { ...defaults, name: result.branch.name, address: result.branch.address, phone: result.branch.phone, mapLink: result.branch.mapLink, halls: result.branch.halls || [], bookingsEnabled: result.branch.bookingsEnabled };
  }
  return catalogRowToObject(result.catalog, result.branch);
});

export const saveCatalogForBranch = (branchId, catalog) => withDb(async (db) => {
  const now = new Date();
  await db.update(branches).set({ name: catalog.name, address: catalog.address || null, phone: catalog.phone || null, mapLink: catalog.mapLink || null, halls: catalog.halls || [], bookingsEnabled: catalog.bookingsEnabled !== false, updatedAt: now }).where(eq(branches.id, branchId));
  const values = { branch: branchId, pricing: catalog.pricing || defaultPricing, decorationPrice: String(catalog.decorationPrice ?? 1500), cakes: catalog.cakes || [], decorations: catalog.decorations || [], testimonials: catalog.testimonials || [], heroImages: catalog.heroImages || [], branchVideos: catalog.branchVideos || [], galleryVideos: catalog.galleryVideos || [], socialLinks: catalog.socialLinks || {}, updatedAt: now };
  await db.insert(branchCatalogs).values(values).onConflictDoUpdate({ target: branchCatalogs.branch, set: values });
});

export const getBranchFromRequest = (req, includeBody = true) => req.query.branch || (includeBody ? req.body.branch : undefined) || 'branch-1';
export const getCatalogOrSendError = async (req, res, includeBody = true) => {
  const branch = getBranchFromRequest(req, includeBody); const catalog = await getCatalogForBranch(branch);
  if (!catalog) { res.status(400).json({ error: 'Invalid branch' }); return null; }
  return { branch, catalog };
};
export const getAllReviews = () => withDb((db) => db.select().from(reviews).orderBy(desc(reviews.createdAt)));
export const getReviews = getAllReviews;
export const addReview = (branch, review) => withDb((db) => db.insert(reviews).values({ ...review, branch, id: review.id || crypto.randomUUID() }).returning());
