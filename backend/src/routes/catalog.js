import express from 'express';
import * as catalogController from '../controllers/catalogController.js';
import { verifyAdmin } from '../middleware/auth.js';
import { globalDb, defaultCakes } from '../config/constants.js';
import { v4 as uuidv4 } from 'uuid';
import cloudinary, { uploadToCloudinary, uploadVideoToCloudinary } from '../utils/cloudinary.js';
import { getRootFolderForBranch } from '../utils/branchConfig.js';

const router = express.Router();

const BRANCH_IDS = ['branch-1', 'branch-2'];

const fetchCloudinaryReelsForBranch = async (branch) => {
  const rootFolder = getRootFolderForBranch(branch);
  const prefixes = [
    `Home/${rootFolder}/reels`,
    `Home/${rootFolder}/videos`,
    `Home/${rootFolder}/gallery-videos`,
  ];

  const responses = await Promise.all(
    prefixes.map((prefix) => cloudinary.api.resources({
      type: 'upload',
      resource_type: 'video',
      prefix,
      max_results: 100,
      context: true,
    }))
  );

  const seen = new Set();
  const items = [];

  for (const response of responses) {
    for (const resource of response?.resources || []) {
      const url = resource.secure_url || '';
      const publicId = resource.public_id || '';
      const uniqueKey = publicId || url;
      if (!uniqueKey || seen.has(uniqueKey)) continue;
      seen.add(uniqueKey);
      items.push({
        id: publicId || `${branch}-${items.length}`,
        branch,
        url,
        title: resource?.context?.custom?.caption || resource.filename || 'Reel',
        publicId,
        createdAt: resource.created_at || '',
      });
    }
  }

  return items.filter((reel) => reel.url);
};

// Pricing
router.get('/pricing', async (req, res) => {
  try {
    const resolved = await catalogController.getCatalogOrSendError(req, res, false);
    if (!resolved) return;
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json(resolved.catalog.pricing);
  } catch (err) {
    console.error('Get Pricing Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/reels', async (req, res) => {
  try {
    const requestedBranch = req.query.branch;
    const branches = requestedBranch && requestedBranch !== 'all' ? [requestedBranch] : BRANCH_IDS;
    const reelsByBranch = await Promise.all(branches.map(fetchCloudinaryReelsForBranch));
    const reels = reelsByBranch
      .flat()
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    res.json(reels);
  } catch (err) {
    console.error('Get Reels Error:', err);
    res.status(500).json({ error: 'Failed to fetch reels' });
  }
});

router.put('/pricing', verifyAdmin, async (req, res) => {
  try {
    const resolved = await catalogController.getCatalogOrSendError(req, res, true);
    if (!resolved) return;
    const { branch, catalog } = resolved;
    const { service, hallId, duration, price, offerPrice } = req.body;
    if (!catalog.pricing[service]) catalog.pricing[service] = {};
    
    let targetObj = catalog.pricing[service];
    if (hallId) {
      if (!targetObj[hallId]) targetObj[hallId] = {};
      targetObj = targetObj[hallId];
    }
    
    if (offerPrice !== undefined && offerPrice !== null && offerPrice !== "") {
      targetObj[duration] = { price: Number(price), offerPrice: Number(offerPrice) };
    } else {
      targetObj[duration] = Number(price);
    }
    
    await catalogController.saveCatalogForBranch(branch, catalog);
    res.json(catalog.pricing);
  } catch (err) {
    console.error('Update Pricing Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/pricing/:service/:duration', async (req, res) => {
  try {
    const resolved = await catalogController.getCatalogOrSendError(req, res, false);
    if (!resolved) return;
    const { service, duration } = req.params;
    const price = resolved.catalog.pricing[service]?.[duration];
    if (price === undefined) return res.status(404).json({ error: 'Pricing not found' });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json({ service, duration, price });
  } catch (err) {
    console.error('Get Specific Pricing Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Decoration Price
router.get('/decoration-price', async (req, res) => {
  try {
    const resolved = await catalogController.getCatalogOrSendError(req, res, false);
    if (!resolved) return;
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json({ decorationPrice: resolved.catalog.decorationPrice });
  } catch (err) {
    console.error('Get Decoration Price Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/decoration-price', verifyAdmin, async (req, res) => {
  try {
    const resolved = await catalogController.getCatalogOrSendError(req, res, true);
    if (!resolved) return;
    const { branch, catalog } = resolved;
    const { price } = req.body;
    if (price !== undefined) catalog.decorationPrice = price;
    await catalogController.saveCatalogForBranch(branch, catalog);
    res.json({ decorationPrice: catalog.decorationPrice });
  } catch (err) {
    console.error('Update Decoration Price Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cakes
router.get('/cakes', async (req, res) => {
  try {
    const resolved = await catalogController.getCatalogOrSendError(req, res, false);
    if (!resolved) return;
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json(resolved.catalog.cakes);
  } catch (err) {
    console.error('Get Cakes Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/cakes', verifyAdmin, async (req, res) => {
  try {
    const resolved = await catalogController.getCatalogOrSendError(req, res, true);
    if (!resolved) return;
    const { branch, catalog } = resolved;
    const { name, price, description, image, originalPrice, offerPrice, quantity } = req.body;

    let imageUrl = image;
    if (image && image.startsWith('data:image')) {
      imageUrl = await uploadToCloudinary(image, 'cakes', getRootFolderForBranch(branch));
    }
    const cake = {
      id: `cake-${uuidv4()}`,
      name,
      price,
      description,
      image: imageUrl,
      quantity: quantity || '1kg',
      ...(originalPrice !== undefined && { originalPrice }),
      ...(offerPrice !== undefined && { offerPrice })
    };
    catalog.cakes.push(cake);
    await catalogController.saveCatalogForBranch(branch, catalog);
    res.status(201).json(cake);
  } catch (err) {
    console.error('Add Cake Error:', err);
    res.status(500).json({ error: 'Failed to upload/save cake' });
  }
});

router.put('/cakes/:id', verifyAdmin, async (req, res) => {
  const resolved = await catalogController.getCatalogOrSendError(req, res, true);
  if (!resolved) return;
  const { branch, catalog } = resolved;
  const item = catalog.cakes.find(c => c.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Cake not found' });

  try {
    const updateData = { ...req.body };
    if (updateData.image && updateData.image.startsWith('data:image')) {
      updateData.image = await uploadToCloudinary(updateData.image, 'cakes', getRootFolderForBranch(branch));
    }
    Object.assign(item, updateData);
    await catalogController.saveCatalogForBranch(branch, catalog);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload/update cake' });
  }
});

router.delete('/cakes/:id', verifyAdmin, async (req, res) => {
  try {
    const resolved = await catalogController.getCatalogOrSendError(req, res, true);
    if (!resolved) return;
    const { branch, catalog } = resolved;
    const index = catalog.cakes.findIndex(c => c.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Cake not found' });
    catalog.cakes.splice(index, 1);
    await catalogController.saveCatalogForBranch(branch, catalog);
    res.json({ message: 'Cake deleted' });
  } catch (err) {
    console.error('Delete Cake Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Decorations
router.get('/decorations', async (req, res) => {
  try {
    const resolved = await catalogController.getCatalogOrSendError(req, res, false);
    if (!resolved) return;
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json(resolved.catalog.decorations);
  } catch (err) {
    console.error('Get Decorations Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/decorations', verifyAdmin, async (req, res) => {
  try {
    const resolved = await catalogController.getCatalogOrSendError(req, res, true);
    if (!resolved) return;
    const { branch, catalog } = resolved;
    const { name, price, description, image, video, originalPrice, offerPrice } = req.body;

    let imageUrl = image;
    if (image && image.startsWith('data:image')) {
      imageUrl = await uploadToCloudinary(image, 'decorations', getRootFolderForBranch(branch));
    }
    let videoUrl = video;
    if (video && video.startsWith('data:video')) {
      videoUrl = await uploadVideoToCloudinary(video, 'decorations', getRootFolderForBranch(branch));
    }
    const decoration = {
      id: `extra-${uuidv4()}`,
      name,
      price,
      description,
      image: imageUrl,
      video: videoUrl,
      ...(originalPrice !== undefined && { originalPrice }),
      ...(offerPrice !== undefined && { offerPrice })
    };
    catalog.decorations.push(decoration);
    await catalogController.saveCatalogForBranch(branch, catalog);
    res.status(201).json(decoration);
  } catch (err) {
    console.error('Add Decoration Error:', err);
    res.status(500).json({ error: 'Failed to upload/save decoration' });
  }
});

router.put('/decorations/:id', verifyAdmin, async (req, res) => {
  const resolved = await catalogController.getCatalogOrSendError(req, res, true);
  if (!resolved) return;
  const { branch, catalog } = resolved;
  const item = catalog.decorations.find(d => d.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Decoration not found' });

  try {
    const updateData = { ...req.body };
    if (updateData.image && updateData.image.startsWith('data:image')) {
      updateData.image = await uploadToCloudinary(updateData.image, 'decorations', getRootFolderForBranch(branch));
    }
    if (updateData.video && updateData.video.startsWith('data:video')) {
      updateData.video = await uploadVideoToCloudinary(updateData.video, 'decorations', getRootFolderForBranch(branch));
    }
    Object.assign(item, updateData);
    await catalogController.saveCatalogForBranch(branch, catalog);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload/update decoration' });
  }
});

router.delete('/decorations/:id', verifyAdmin, async (req, res) => {
  try {
    const resolved = await catalogController.getCatalogOrSendError(req, res, true);
    if (!resolved) return;
    const { branch, catalog } = resolved;
    const index = catalog.decorations.findIndex(d => d.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Decoration not found' });
    catalog.decorations.splice(index, 1);
    await catalogController.saveCatalogForBranch(branch, catalog);
    res.json({ message: 'Decoration deleted' });
  } catch (err) {
    console.error('Delete Decoration Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Testimonials (Public)
router.get('/testimonials', async (req, res) => {
  try {
    const branch = req.query.branch || 'branch-1';
    const catalog = await catalogController.getCatalogForBranch(branch);
    if (!catalog) return res.status(400).json({ error: 'Invalid branch' });
    res.json(catalog.testimonials || []);
  } catch (err) {
    console.error('Get Testimonials Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Alias for compatibility
router.get('/gallery/testimonials', async (req, res) => {
  try {
    const branch = req.query.branch || 'branch-1';
    const catalog = await catalogController.getCatalogForBranch(branch);
    if (!catalog) return res.status(400).json({ error: 'Invalid branch' });
    res.json(catalog.testimonials || []);
  } catch (err) {
    console.error('Get Gallery Testimonials Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Social Links
router.get('/social-links', async (req, res) => {
  try {
    const resolved = await catalogController.getCatalogOrSendError(req, res, false);
    if (!resolved) return;
    res.json(resolved.catalog.socialLinks || { instagram: "", facebook: "", whatsapp: "" });
  } catch (err) {
    console.error('Get Social Links Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/social-links', verifyAdmin, async (req, res) => {
  try {
    const resolved = await catalogController.getCatalogOrSendError(req, res, true);
    if (!resolved) return;
    const { branch, catalog } = resolved;
    const { instagram, facebook, whatsapp } = req.body;

    if (!catalog.socialLinks) catalog.socialLinks = {};
    if (instagram !== undefined) catalog.socialLinks.instagram = instagram;
    if (facebook !== undefined) catalog.socialLinks.facebook = facebook;
    if (whatsapp !== undefined) catalog.socialLinks.whatsapp = whatsapp;

    await catalogController.saveCatalogForBranch(branch, catalog);
    res.json(catalog.socialLinks);
  } catch (err) {
    console.error('Update Social Links Error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message, stack: err.stack });
  }
});

// Branch Details
router.get('/branch-details', async (req, res) => {
  try {
    const resolved = await catalogController.getCatalogOrSendError(req, res, false);
    if (!resolved) return;
    const { catalog } = resolved;
    res.json({
      name: catalog.name,
      address: catalog.address,
      phone: catalog.phone,
      mapLink: catalog.mapLink
    });
  } catch (err) {
    console.error('Get Branch Details Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/branch-details', verifyAdmin, async (req, res) => {
  try {
    const resolved = await catalogController.getCatalogOrSendError(req, res, true);
    if (!resolved) return;
    const { branch, catalog } = resolved;
    const { name, address, phone, mapLink } = req.body;

    if (name !== undefined) catalog.name = name;
    if (address !== undefined) catalog.address = address;
    if (phone !== undefined) catalog.phone = phone;
    if (mapLink !== undefined) catalog.mapLink = mapLink;

    await catalogController.saveCatalogForBranch(branch, catalog);
    res.json({
      name: catalog.name,
      address: catalog.address,
      phone: catalog.phone,
      mapLink: catalog.mapLink
    });
  } catch (err) {
    console.error('Update Branch Details Error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message, stack: err.stack });
  }
});

// General info
router.get('/occasions', (req, res) => res.json(globalDb.occasions));
router.get('/services', (req, res) => res.json(globalDb.services));

// Reviews
router.get('/reviews', async (req, res) => {
  try {
    const reviews = await catalogController.getAllReviews();
    res.json(reviews);
  } catch (err) {
    console.error('Fetch Reviews Error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews', details: err.message });
  }
});

router.post('/reviews', async (req, res) => {
  try {
    const branch = req.query.branch || 'branch-1';
    const { name, rating, comment } = req.body;
    if (!name || !rating || !comment) {
      return res.status(400).json({ error: 'Name, rating and comment are required' });
    }
    const review = await catalogController.addReview(branch, { name, rating, comment });
    res.status(201).json(review);
  } catch (err) {
    console.error('Add Review Error:', err);
    res.status(500).json({ error: 'Failed to add review', details: err.message });
  }
});

export default router;
