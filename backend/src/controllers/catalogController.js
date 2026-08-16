import path from 'path';
import { fileURLToPath } from 'url';
import { getBranchModels, getReviewModel } from '../config/mongo.js';
import { cloneBranchPricingDb, branchPricingDbs, createBranchPricingDb, defaultPricing, globalDb } from '../config/constants.js';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pricingDataFilePath = path.join(__dirname, '../data', 'branchPricingData.json');

export const saveBranchPricingData = async () => {
  try {
    await fs.mkdir(path.dirname(pricingDataFilePath), { recursive: true });
    await fs.writeFile(
      pricingDataFilePath,
      JSON.stringify(branchPricingDbs, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('Failed to persist branch pricing data:', error);
  }
};

export const loadBranchPricingData = async () => {
  try {
    const raw = await fs.readFile(pricingDataFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    for (const branchId of Object.keys(parsed)) {
      branchPricingDbs[branchId] = {
        ...createBranchPricingDb(),
        ...parsed[branchId],
      };
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Failed to load branch pricing data:', error);
    }
  }
};

export const getCatalogForBranch = async (branchId = 'branch-1') => {
  const models = getBranchModels(branchId);
  if (models) {
    const defaultData = createBranchPricingDb(branchId);
    let doc = await models.BranchCatalog.findOne({ branch: branchId });
    
    if (!doc) {
      // Include halls from file-based data when creating new doc
      const fileCatalog = branchPricingDbs[branchId];
      const halls = fileCatalog?.halls || defaultData.halls || [];
      doc = await models.BranchCatalog.create({ branch: branchId, ...defaultData, halls });
    } else {
      // MIGRATION: if halls not in DB yet, pull from file-based store
      if (!doc.halls || doc.halls.length === 0) {
        const fileCatalog = branchPricingDbs[branchId];
        if (fileCatalog?.halls?.length > 0) {
          await models.BranchCatalog.updateOne({ branch: branchId }, { $set: { halls: fileCatalog.halls } });
          doc.halls = fileCatalog.halls;
        }
      }

      // MIGRATION: Merge new services from defaultPricing into existing pricing
      const pricing = doc.pricing || {};
      const mergedPricing = { ...defaultPricing };
      
      // Keep existing service data
      for (const service in pricing) {
        if (service !== 'private-theatre' && service !== 'party-hall') {
          mergedPricing[service] = pricing[service];
        }
      }
      
      // Handle legacy services
      if (pricing['private-theatre'] || pricing['party-hall']) {
        const unifiedPricing = pricing['private-theatre-party-hall'] || defaultPricing['private-theatre-party-hall'];
        mergedPricing['private-theatre-party-hall'] = unifiedPricing;
      }
      
      doc.pricing = mergedPricing;
      if (doc.markModified) doc.markModified('pricing');
      // Use updateOne to only touch pricing — never overwrite bookingsEnabled or other fields
      await models.BranchCatalog.updateOne(
        { branch: branchId },
        { $set: { pricing: mergedPricing } }
      );
    }
    
    const catalogObj = doc.toObject();
    
    // Fallback to globalDb for branch info if missing in DB doc
    const branchInfo = globalDb.branches.find(b => b.id === branchId) || {};
    if (!catalogObj.name) catalogObj.name = branchInfo.name;
    if (!catalogObj.address) catalogObj.address = branchInfo.address;
    if (!catalogObj.phone) catalogObj.phone = branchInfo.phone;
    if (!catalogObj.mapLink && branchInfo.mapLink) catalogObj.mapLink = branchInfo.mapLink;

    console.log(`[DB-RETRIEVE] Retrieved catalog for ${branchId}:`, {
      pricingStructure: JSON.stringify(catalogObj.pricing),
      hasOffers: Object.keys(catalogObj.pricing).some(service => 
        Object.values(catalogObj.pricing[service]).some(price => typeof price === 'object' && price.offerPrice)
      )
    });
    
    return cloneBranchPricingDb(catalogObj);
  }

  const memoryCatalog = branchPricingDbs[branchId];
  if (memoryCatalog) {
    console.log(`[MEMORY-RETRIEVE] Using memory catalog for ${branchId}:`, {
      pricingStructure: JSON.stringify(memoryCatalog.pricing)
    });
  }
  return memoryCatalog ? cloneBranchPricingDb(memoryCatalog) : null;
};

export const saveCatalogForBranch = async (branchId, catalog) => {
  console.log(`[CATALOG-SAVE] Initiating save for ${branchId}. Data:`, {
    name: catalog.name,
    address: catalog.address,
    phone: catalog.phone,
    mapLink: catalog.mapLink,
    pricingKeys: catalog.pricing ? Object.keys(catalog.pricing) : []
  });

  // Always update memory cache and persist to file as a secondary backup
  const plainCatalog = (catalog && typeof catalog.toObject === 'function') ? catalog.toObject() : catalog;
  branchPricingDbs[branchId] = cloneBranchPricingDb(plainCatalog);
  await saveBranchPricingData();

  const models = getBranchModels(branchId);
  if (models) {
    try {
      // Build update object to avoid VersionError from concurrent saves
      const updateData = {};
      if (catalog.name !== undefined) updateData.name = catalog.name;
      if (catalog.address !== undefined) updateData.address = catalog.address;
      if (catalog.phone !== undefined) updateData.phone = catalog.phone;
      if (catalog.mapLink !== undefined) updateData.mapLink = catalog.mapLink;
      if (catalog.pricing !== undefined) updateData.pricing = catalog.pricing;
      if (catalog.cakes !== undefined) updateData.cakes = catalog.cakes;
      if (catalog.decorations !== undefined) updateData.decorations = catalog.decorations;
      if (catalog.decorationPrice !== undefined) updateData.decorationPrice = catalog.decorationPrice;
      if (catalog.testimonials !== undefined) updateData.testimonials = catalog.testimonials;
      if (catalog.heroImages !== undefined) updateData.heroImages = catalog.heroImages;
      if (catalog.branchVideos !== undefined) updateData.branchVideos = catalog.branchVideos;
      if (catalog.galleryVideos !== undefined) updateData.galleryVideos = catalog.galleryVideos;
      if (catalog.socialLinks !== undefined) updateData.socialLinks = catalog.socialLinks;
      if (catalog.bookingsEnabled !== undefined) updateData.bookingsEnabled = catalog.bookingsEnabled;
      if (catalog.halls !== undefined) updateData.halls = catalog.halls;

      await models.BranchCatalog.findOneAndUpdate(
        { branch: branchId },
        { $set: updateData },
        { upsert: true, new: true, runValidators: true }
      );
      console.log(`[DB-SAVE] Successfully persisted catalog for ${branchId} to database using atomic update.`);
    } catch (err) {
      console.error(`[DB-SAVE-ERROR] Failed to save catalog for ${branchId}:`, err);
      throw err;
    }
  }
};

export const getBranchFromRequest = (req, includeBody = true) =>
  req.query.branch || (includeBody ? req.body.branch : undefined) || 'branch-1';

export const getCatalogOrSendError = async (req, res, includeBody = true) => {
  const branch = getBranchFromRequest(req, includeBody);
  const catalog = await getCatalogForBranch(branch);
  if (!catalog) {
    res.status(400).json({ error: 'Invalid branch' });
    return null;
  }
  return { branch, catalog };
};
export const getReviews = async () => {
  const Review = getReviewModel();
  if (!Review) {
    console.warn('[REVIEWS] Review model not available - DB might not be connected');
    return [];
  }
  return Review.find().sort({ createdAt: -1 });
};

export const getAllReviews = async () => {
  return getReviews();
};

export const addReview = async (branchId, reviewData) => {
  const Review = getReviewModel();
  if (!Review) throw new Error('Review database not connected');
  return Review.create({ ...reviewData, branch: branchId });
};
