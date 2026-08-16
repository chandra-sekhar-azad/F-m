import express from 'express';
import * as adminController from '../controllers/adminController.js';
import * as catalogController from '../controllers/catalogController.js';
import { verifyAdmin } from '../middleware/auth.js';
import { getAllBookingsFromFiles } from '../utils/migration.js';
import { mongoConnections, getBranchModels } from '../config/mongo.js';
import { branchDbs } from '../config/constants.js';
import { v4 as uuidv4 } from 'uuid';
import { uploadToCloudinary, uploadVideoToCloudinary } from '../utils/cloudinary.js';
import cloudinary from '../utils/cloudinary.js';
import { getRootFolderForBranch } from '../utils/branchConfig.js';

const router = express.Router();

const normalizeBranchVideos = (videos = []) => {
  return (Array.isArray(videos) ? videos : [])
    .map((video, index) => {
      if (typeof video === 'string') {
        return {
          id: `video-${index}`,
          url: video,
          title: '',
          publicId: getCloudinaryVideoPublicId(video),
        };
      }

      if (!video || typeof video !== 'object') return null;

      return {
        id: video.id || `video-${index}`,
        url: video.url || video.secure_url || video.videoUrl || '',
        title: video.title || video.name || '',
        publicId: video.publicId || getCloudinaryVideoPublicId(video.url || video.secure_url || video.videoUrl || ''),
      };
    })
    .filter((video) => video && video.url);
};

const getCloudinaryVideoPublicId = (url = '') => {
  try {
    const parsed = new URL(url);
    const uploadIndex = parsed.pathname.indexOf('/video/upload/');
    if (uploadIndex === -1) return '';

    const pathAfterUpload = parsed.pathname.slice(uploadIndex + '/video/upload/'.length);
    const parts = pathAfterUpload.split('/').filter(Boolean);
    const versionIndex = parts.findIndex((part) => /^v\d+$/.test(part));
    const publicIdParts = parts.slice(versionIndex >= 0 ? versionIndex + 1 : 0);
    const publicId = publicIdParts.join('/').replace(/\.[^/.]+$/, '');
    return decodeURIComponent(publicId);
  } catch {
    return '';
  }
};

const getAdminBranch = (req) => req.admin?.branch || req.query.branch || req.body.branch || 'branch-1';

const fetchCloudinaryBranchVideos = async (branch) => {
  const rootFolder = getRootFolderForBranch(branch);
  const prefix = `Home/${rootFolder}/videos`;

  const response = await cloudinary.api.resources({
    type: 'upload',
    resource_type: 'video',
    prefix,
    max_results: 30,
    context: true,
  });

  const resources = response?.resources || [];
  return resources
    .map((resource, index) => ({
      id: `cloudinary-${resource.public_id || index}`,
      url: resource.secure_url || '',
      title: resource?.context?.custom?.caption || resource.filename || 'Branch Video',
      publicId: resource.public_id || '',
    }))
    .filter((video) => video.url);
};

const filterConfirmedExistingVideos = async (videos) => {
  const checks = await Promise.all(videos.map(async (video) => {
    if (!video.publicId || !video.url.includes('res.cloudinary.com')) return video;

    try {
      await cloudinary.api.resource(video.publicId, { resource_type: 'video' });
      return video;
    } catch (error) {
      if (error?.http_code === 404) return null;
      console.warn(`Could not verify Cloudinary video ${video.publicId}:`, error.message);
      return video;
    }
  }));

  return checks.filter(Boolean);
};

const reconcileBranchVideosWithCloudinary = (savedVideos, cloudinaryVideos) => {
  const savedByPublicId = new Map(savedVideos.filter((video) => video.publicId).map((video) => [video.publicId, video]));
  const savedByUrl = new Map(savedVideos.map((video) => [video.url, video]));

  const reconciledCloudinaryVideos = cloudinaryVideos.map((video) => {
    const saved = savedByPublicId.get(video.publicId) || savedByUrl.get(video.url);
    return {
      id: saved?.id || video.id,
      url: video.url,
      title: saved?.title || video.title || '',
      publicId: video.publicId || saved?.publicId || '',
    };
  });

  const reconciledIds = new Set(reconciledCloudinaryVideos.map((video) => video.id));
  const reconciledPublicIds = new Set(reconciledCloudinaryVideos.map((video) => video.publicId).filter(Boolean));
  const reconciledUrls = new Set(reconciledCloudinaryVideos.map((video) => video.url));

  const remainingSavedVideos = savedVideos.filter((video) => {
    if (reconciledIds.has(video.id)) return false;
    if (video.publicId && reconciledPublicIds.has(video.publicId)) return false;
    return !reconciledUrls.has(video.url);
  });

  return [...remainingSavedVideos, ...reconciledCloudinaryVideos];
};

router.post('/login', adminController.login);
router.post('/logout', (req, res) => res.json({ message: 'Logout successful' }));

router.get('/dashboard/stats', verifyAdmin, adminController.getDashboardStats);
router.post('/migrate-to-mongo', verifyAdmin, adminController.migrateToMongo);
router.post('/migrate-pricing-to-mongo', verifyAdmin, adminController.migratePricingToMongo);
router.post('/clear-bookings', verifyAdmin, adminController.clearBookings);

router.get('/all-bookings', verifyAdmin, async (req, res) => {
  try {
    const allBookings = await getAllBookingsFromFiles();
    res.json({ count: allBookings.length, bookings: allBookings, timestamp: new Date() });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Gallery & Testimonials (Admin)
router.get('/gallery', verifyAdmin, async (req, res) => {
  try {
    const branch = req.query.branch || 'branch-1';
    const type = req.query.type;
    const catalog = await catalogController.getCatalogForBranch(branch);
    if (!catalog) return res.status(400).json({ error: 'Invalid branch' });
    const cakes = catalog.cakes.map((item) => ({ ...item, type: 'cake' }));
    const decorations = catalog.decorations.map((item) => ({ ...item, type: 'decoration' }));
    let items = [...cakes, ...decorations];
    if (type === 'cake' || type === 'decoration') {
      items = items.filter((item) => item.type === type);
    }
    res.json(items);
  } catch (err) {
    console.error('Get Gallery Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/gallery/:type/:id', verifyAdmin, async (req, res) => {
  const branch = req.query.branch || req.body.branch || 'branch-1';
  const { type, id } = req.params;
  const { image, price, originalPrice, offerPrice, name, description } = req.body;
  if (type !== 'cake' && type !== 'decoration') return res.status(400).json({ error: 'Invalid type' });
  
  try {
    // If it's a data URL (base64 from frontend), upload to Cloudinary
    let imageUrl = image;
    if (image && image.startsWith('data:image')) {
      const rootFolder = getRootFolderForBranch(branch);
      console.log(`☁️ Uploading ${type} image to Cloudinary [${rootFolder}]...`);
      imageUrl = await uploadToCloudinary(image, type + 's', rootFolder);
      console.log(`✅ ${type} image uploaded: ${imageUrl}`);
    }

    const catalog = await catalogController.getCatalogForBranch(branch);
    if (!catalog) return res.status(400).json({ error: 'Invalid branch' });
    const list = type === 'cake' ? catalog.cakes : catalog.decorations;
    const item = list.find((entry) => entry.id === id);
    if (!item) return res.status(404).json({ error: `${type} not found` });
    
    // Update fields
    if (imageUrl) item.image = imageUrl;
    if (price !== undefined) item.price = price;
    if (originalPrice !== undefined) item.originalPrice = originalPrice;
    if (offerPrice !== undefined) item.offerPrice = offerPrice;
    if (name !== undefined) item.name = name;
    if (description !== undefined) item.description = description;
    
    await catalogController.saveCatalogForBranch(branch, catalog);
    res.json(item);
  } catch (err) {
    console.error('Update failed:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

router.post('/gallery/testimonials', verifyAdmin, async (req, res) => {
  const branch = req.query.branch || req.body.branch || 'branch-1';
  const { image, title, date } = req.body;
  if (!image) return res.status(400).json({ error: 'Image required' });
  
  try {
    let imageUrl = image;
    if (image.startsWith('data:image')) {
      const rootFolder = getRootFolderForBranch(branch);
      console.log(`☁️ Uploading testimonial image to Cloudinary [${rootFolder}]...`);
      imageUrl = await uploadToCloudinary(image, 'testimonials', rootFolder);
    }

    const catalog = await catalogController.getCatalogForBranch(branch);
    if (!catalog) return res.status(400).json({ error: 'Invalid branch' });
    const testimonial = {
      id: `testimonial-${uuidv4()}`,
      image: imageUrl,
      title: title || 'Customer Memory',
      date: date || new Date().toLocaleDateString(),
    };
    catalog.testimonials.push(testimonial);
    await catalogController.saveCatalogForBranch(branch, catalog);
    res.status(201).json(testimonial);
  } catch (err) {
    console.error('Testimonial upload failed:', err);
    res.status(500).json({ error: 'Failed to upload/save testimonial' });
  }
});

router.delete('/gallery/testimonials/:id', verifyAdmin, async (req, res) => {
  const branch = req.query.branch || req.body.branch || 'branch-1';
  const catalog = await catalogController.getCatalogForBranch(branch);
  if (!catalog) return res.status(400).json({ error: 'Invalid branch' });
  const index = catalog.testimonials.findIndex((item) => item.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  catalog.testimonials.splice(index, 1);
  await catalogController.saveCatalogForBranch(branch, catalog);
  res.json({ message: 'Deleted' });
});

// Update testimonial title or replace image
router.put('/gallery/testimonials/:id', verifyAdmin, async (req, res) => {
  const branch = req.query.branch || req.body.branch || 'branch-1';
  const { title, image } = req.body;
  try {
    const catalog = await catalogController.getCatalogForBranch(branch);
    if (!catalog) return res.status(400).json({ error: 'Invalid branch' });
    const item = catalog.testimonials.find((t) => t.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });

    if (title !== undefined) item.title = title;
    if (image) {
      let imageUrl = image;
      if (image.startsWith('data:image')) {
        const rootFolder = getRootFolderForBranch(branch);
        imageUrl = await uploadToCloudinary(image, 'testimonials', rootFolder);
      }
      item.image = imageUrl;
    }
    await catalogController.saveCatalogForBranch(branch, catalog);
    res.json(item);
  } catch (err) {
    console.error('Update testimonial failed:', err);
    res.status(500).json({ error: 'Failed to update testimonial' });
  }
});

// Gallery Videos
router.get('/gallery/videos', async (req, res) => {
  try {
    const branch = req.query.branch || 'branch-1';
    const catalog = await catalogController.getCatalogForBranch(branch);
    if (!catalog) return res.status(400).json({ error: 'Invalid branch' });
    res.json(catalog.galleryVideos || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch gallery videos' });
  }
});

router.post('/gallery/videos/sign', verifyAdmin, async (req, res) => {
  try {
    const branch = req.query.branch || req.body.branch || 'branch-1';
    const rootFolder = getRootFolderForBranch(branch);
    const folder = `Home/${rootFolder}/gallery-videos`;
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = { folder, timestamp };
    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);
    res.json({ signature, timestamp, folder, cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate upload signature' });
  }
});

router.post('/gallery/videos', verifyAdmin, async (req, res) => {
  const branch = req.query.branch || req.body.branch || 'branch-1';
  const { url, title } = req.body;
  if (!url) return res.status(400).json({ error: 'Video URL required' });
  try {
    const catalog = await catalogController.getCatalogForBranch(branch);
    if (!catalog) return res.status(400).json({ error: 'Invalid branch' });
    if (!catalog.galleryVideos) catalog.galleryVideos = [];
    const entry = { id: `gvideo-${uuidv4()}`, url, title: title || '' };
    catalog.galleryVideos.push(entry);
    await catalogController.saveCatalogForBranch(branch, catalog);
    res.json(catalog.galleryVideos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save gallery video' });
  }
});

router.put('/gallery/videos/:id', verifyAdmin, async (req, res) => {
  const branch = req.query.branch || req.body.branch || 'branch-1';
  const { title } = req.body;
  try {
    const catalog = await catalogController.getCatalogForBranch(branch);
    if (!catalog) return res.status(400).json({ error: 'Invalid branch' });
    const item = (catalog.galleryVideos || []).find((v) => v.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    if (title !== undefined) item.title = title;
    await catalogController.saveCatalogForBranch(branch, catalog);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update gallery video' });
  }
});

router.delete('/gallery/videos/:id', verifyAdmin, async (req, res) => {
  const branch = req.query.branch || 'branch-1';
  try {
    const catalog = await catalogController.getCatalogForBranch(branch);
    if (!catalog) return res.status(400).json({ error: 'Invalid branch' });
    const index = (catalog.galleryVideos || []).findIndex((v) => v.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Not found' });
    catalog.galleryVideos.splice(index, 1);
    await catalogController.saveCatalogForBranch(branch, catalog);
    res.json(catalog.galleryVideos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete gallery video' });
  }
});

// Hero Images (Admin)
router.get('/hero-images', async (req, res) => {
  try {
    const branch = req.query.branch || 'branch-1';
    const catalog = await catalogController.getCatalogForBranch(branch);
    if (!catalog) return res.status(400).json({ error: 'Invalid branch' });
    res.json(catalog.heroImages || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hero images' });
  }
});

router.post('/hero-images', verifyAdmin, async (req, res) => {
  const branch = req.query.branch || req.body.branch || 'branch-1';
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'Image required' });
  
  try {
    let imageUrl = image;
    if (image.startsWith('data:image')) {
      const rootFolder = getRootFolderForBranch(branch);
      console.log(`☁️ Uploading hero image to Cloudinary [${rootFolder}]...`);
      imageUrl = await uploadToCloudinary(image, 'hero', rootFolder);
    }

    const catalog = await catalogController.getCatalogForBranch(branch);
    if (!catalog) return res.status(400).json({ error: 'Invalid branch' });
    
    if (!catalog.heroImages) catalog.heroImages = [];
    catalog.heroImages.push(imageUrl);
    await catalogController.saveCatalogForBranch(branch, catalog);
    res.json(catalog.heroImages);
  } catch (err) {
    console.error('Hero upload failed:', err);
    res.status(500).json({ error: 'Failed to upload/save hero image' });
  }
});

router.delete('/hero-images/:index', verifyAdmin, async (req, res) => {
  const branch = req.query.branch || 'branch-1';
  const index = parseInt(req.params.index);
  
  try {
    const catalog = await catalogController.getCatalogForBranch(branch);
    if (!catalog) return res.status(400).json({ error: 'Invalid branch' });
    if (!catalog.heroImages || index < 0 || index >= catalog.heroImages.length) {
      return res.status(404).json({ error: 'Index out of bounds' });
    }
    
    catalog.heroImages.splice(index, 1);
    await catalogController.saveCatalogForBranch(branch, catalog);
    res.json(catalog.heroImages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete hero image' });
  }
});

// Branch Videos — Signed Upload (direct browser → Cloudinary, no server file transfer)
router.get('/branch-videos', async (req, res) => {
  try {
    const branch = req.query.branch || 'branch-1';
    const catalog = await catalogController.getCatalogForBranch(branch);
    if (!catalog) return res.status(400).json({ error: 'Invalid branch' });

    const normalizedSavedVideos = normalizeBranchVideos(catalog.branchVideos || []);
    const verifiedSavedVideos = await filterConfirmedExistingVideos(normalizedSavedVideos);

    try {
      const cloudinaryVideos = await fetchCloudinaryBranchVideos(branch);
      const reconciledVideos = reconcileBranchVideosWithCloudinary(verifiedSavedVideos, cloudinaryVideos);

      if (JSON.stringify(normalizedSavedVideos) !== JSON.stringify(reconciledVideos)) {
        catalog.branchVideos = reconciledVideos;
        await catalogController.saveCatalogForBranch(branch, catalog);
      }

      return res.json(reconciledVideos);
    } catch (cloudinaryError) {
      console.warn(`Failed to fetch Cloudinary branch videos for ${branch}:`, cloudinaryError.message);
      if (JSON.stringify(normalizedSavedVideos) !== JSON.stringify(verifiedSavedVideos)) {
        catalog.branchVideos = verifiedSavedVideos;
        await catalogController.saveCatalogForBranch(branch, catalog);
      }
      return res.json(verifiedSavedVideos);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch branch videos' });
  }
});

router.post('/branch-videos/sign', verifyAdmin, async (req, res) => {
  try {
    const branch = getAdminBranch(req);
    const rootFolder = getRootFolderForBranch(branch);
    const folder = `Home/${rootFolder}/videos`;
    const timestamp = Math.round(Date.now() / 1000);

    const paramsToSign = { folder, timestamp };
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      signature,
      timestamp,
      folder,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
    });
  } catch (err) {
    console.error('Sign upload error:', err);
    res.status(500).json({ error: 'Failed to generate upload signature' });
  }
});

// Branch Videos — Save URL after direct Cloudinary upload
router.post('/branch-videos', verifyAdmin, async (req, res) => {
  const branch = getAdminBranch(req);
  const { url, title } = req.body;
  if (!url) return res.status(400).json({ error: 'Video URL required' });

  try {
    const expectedFolder = `Home/${getRootFolderForBranch(branch)}/videos/`;
    const publicId = getCloudinaryVideoPublicId(url);
    if (publicId && !publicId.startsWith(expectedFolder)) {
      return res.status(400).json({ error: `Video must be uploaded to ${expectedFolder}` });
    }

    const catalog = await catalogController.getCatalogForBranch(branch);
    if (!catalog) return res.status(400).json({ error: 'Invalid branch' });

    if (!catalog.branchVideos) catalog.branchVideos = [];
    const videoEntry = {
      id: `video-${uuidv4()}`,
      url,
      title: title || '',
      publicId,
    };
    catalog.branchVideos.push(videoEntry);
    await catalogController.saveCatalogForBranch(branch, catalog);
    res.json(catalog.branchVideos);
  } catch (err) {
    console.error('Branch video save failed:', err);
    res.status(500).json({ error: 'Failed to save branch video' });
  }
});

router.put('/branch-videos/:id', verifyAdmin, async (req, res) => {
  const branch = getAdminBranch(req);
  const { title } = req.body;

  try {
    const catalog = await catalogController.getCatalogForBranch(branch);
    if (!catalog) return res.status(400).json({ error: 'Invalid branch' });

    const videos = normalizeBranchVideos(catalog.branchVideos || []);
    const index = videos.findIndex((v) => v.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Video not found' });

    videos[index] = {
      ...videos[index],
      title: title || '',
    };

    catalog.branchVideos = videos;
    await catalogController.saveCatalogForBranch(branch, catalog);
    res.json(catalog.branchVideos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update branch video' });
  }
});

router.delete('/branch-videos/:id', verifyAdmin, async (req, res) => {
  const branch = getAdminBranch(req);
  try {
    const catalog = await catalogController.getCatalogForBranch(branch);
    if (!catalog) return res.status(400).json({ error: 'Invalid branch' });
    const videos = normalizeBranchVideos(catalog.branchVideos || []);
    const index = videos.findIndex((v) => v.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Video not found' });
    videos.splice(index, 1);
    catalog.branchVideos = videos;
    await catalogController.saveCatalogForBranch(branch, catalog);
    res.json(catalog.branchVideos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete branch video' });
  }
});

// Download Bookings Excel
router.get('/bookings/download', verifyAdmin, async (req, res) => {
  try {
    const branch = req.query.branch || 'all';
    let allBookings = [];
    if (branch === 'all') {
      for (const branchId in mongoConnections) {
        const models = getBranchModels(branchId);
        if (models) {
          const mBookings = await models.Booking.find({ branch: branchId });
          allBookings = allBookings.concat(mBookings);
        }
      }
      for (const branchId in branchDbs) {
        if (!mongoConnections[branchId]) {
          allBookings = allBookings.concat(branchDbs[branchId].bookings);
        }
      }
    } else {
      const models = getBranchModels(branch);
      if (models) {
        allBookings = await models.Booking.find({ branch });
      } else {
        const branchDb = branchDbs[branch];
        if (branchDb) allBookings = branchDb.bookings;
      }
    }
    
    const confirmedBookings = allBookings.filter(booking => ['paid', 'partially-paid'].includes(booking.paymentStatus));
    if (confirmedBookings.length === 0) return res.status(404).json({ error: 'No confirmed bookings found' });
    
    const XLSX = (await import('xlsx')).default;
    const bookingRows = confirmedBookings.map(booking => ({
      'Booking ID': booking.id,
      'Branch': booking.branch,
      'Service': booking.service,
      'Date': booking.date,
      'Time Slot': booking.timeSlot,
      'Duration (hrs)': booking.duration,
      'Customer Name': booking.name,
      'Phone': booking.phone,
      'Occasion': booking.customOccasion || booking.occasion,
      'Decoration Required': booking.decorationRequired ? 'Yes' : 'No',
      'Cake Selected': booking.selectedCake ? `${booking.selectedCake.name} (₹${booking.selectedCake.price})` : 'None',
      'Extra Decorations': booking.extraDecorations?.map((d) => `${d.name} (₹${d.price})`).join('; ') || 'None',
      'Total Price': booking.totalPrice,
      'Payment Status': booking.paymentStatus,
      'Booking Date': new Date(booking.createdAt).toLocaleString(),
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(bookingRows);
    const columnWidths = [
      { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 15 },
      { wch: 14 }, { wch: 18 }, { wch: 15 }, { wch: 20 },
      { wch: 18 }, { wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 20 }
    ];
    worksheet['!cols'] = columnWidths;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Confirmed Bookings');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const fileName = `bookings_${branch}_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error downloading bookings:', error);
    res.status(500).json({ error: 'Failed to download bookings file' });
  }
});

// WhatsApp Campaign (Admin)
router.post('/campaign/whatsapp', verifyAdmin, async (req, res) => {
  try {
    const { message, image } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    // Extract phones
    const allPhones = new Set();
    
    // fetch from mongo
    for (const branchId in mongoConnections) {
      const models = getBranchModels(branchId);
      if (models) {
        const bookings = await models.Booking.find({}, 'phone');
        bookings.forEach(b => { if (b.phone) allPhones.add(b.phone); });
      }
    }
    
    // from branchDbs fallback
    for (const branchId in branchDbs) {
      if (branchDbs[branchId].bookings) {
        branchDbs[branchId].bookings.forEach(b => { if (b.phone) allPhones.add(b.phone); });
      }
    }
    
    const phones = Array.from(allPhones);

    // Ensure whatsapp.js exists or will be created
    const { sendWhatsAppCampaign } = await import('../utils/whatsapp.js');
    const result = await sendWhatsAppCampaign({ message, image, phones });
    res.json(result);
  } catch (err) {
    console.error('WhatsApp campaign error:', err);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
});

// Fetch All Unique Users (Admin)
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const usersMap = new Map();

    // fetch from mongo
    for (const branchId in mongoConnections) {
      const models = getBranchModels(branchId);
      if (models) {
        const bookings = await models.Booking.find({}, 'name phone createdAt');
        bookings.forEach(b => {
          if (b.phone && !usersMap.has(b.phone)) {
            usersMap.set(b.phone, { name: b.name, phone: b.phone, firstBooking: b.createdAt });
          }
        });
      }
    }

    // fetch from file fallbacks
    for (const branchId in branchDbs) {
      if (branchDbs[branchId].bookings) {
        branchDbs[branchId].bookings.forEach(b => {
          if (b.phone && !usersMap.has(b.phone)) {
            usersMap.set(b.phone, { name: b.name, phone: b.phone, firstBooking: b.createdAt || b.date });
          }
        });
      }
    }

    const users = Array.from(usersMap.values());
    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
