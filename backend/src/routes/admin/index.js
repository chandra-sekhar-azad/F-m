// Admin router — composed from focused sub-routers
import express from 'express';
import * as adminController from '../../controllers/adminController.js';
import { verifyAdmin } from '../../middleware/auth.js';
import { getAllBookingsFromFiles } from '../../utils/migration.js';
import { mongoConnections, getBranchModels } from '../../config/mongo.js';
import { branchDbs } from '../../config/constants.js';

import galleryRouter from './gallery.js';
import videosRouter from './videos.js';
import mediaRouter from './media.js';
import { getBranchModels as _getBranchModels } from '../../config/mongo.js';
import { sendBookingWhatsAppNotifications, sendWhatsAppCampaign } from '../../utils/whatsapp.js';

const router = express.Router();

// ── Manual WhatsApp resend for a specific booking ────────────────────────────
router.post('/notify-booking', verifyAdmin, async (req, res) => {
  const { bookingId } = req.body;
  if (!bookingId) return res.status(400).json({ error: 'bookingId is required' });

  try {
    let booking = null;

    // Search MongoDB branches
    for (const branchId of ['branch-1', 'branch-2']) {
      const models = _getBranchModels(branchId);
      if (models) {
        booking = await models.Booking.findOne({ id: bookingId });
        if (booking) { booking = booking.toObject(); break; }
      }
    }

    // Fallback to file-based
    if (!booking) {
      for (const branchId in branchDbs) {
        booking = branchDbs[branchId].bookings.find(b => b.id === bookingId);
        if (booking) break;
      }
    }

    if (!booking) return res.status(404).json({ error: `Booking ${bookingId} not found` });

    await sendBookingWhatsAppNotifications(booking);
    console.log(`📲 Manual WhatsApp resent for booking ${bookingId}`);
    res.json({ success: true, message: `WhatsApp notifications sent for booking ${bookingId}` });
  } catch (err) {
    console.error('notify-booking error:', err);
    res.status(500).json({ error: 'Failed to send WhatsApp notification', details: err.message });
  }
});

// Auth
router.post('/login', adminController.login);
router.post('/logout', (req, res) => res.json({ message: 'Logout successful' }));

// Dashboard
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

    const confirmedBookings = allBookings.filter(b => ['paid', 'partially-paid'].includes(b.paymentStatus));
    if (confirmedBookings.length === 0) return res.status(404).json({ error: 'No confirmed bookings found' });

    const XLSX = (await import('xlsx')).default;
    const bookingRows = confirmedBookings.map(b => ({
      'Booking ID': b.id,
      'Branch': b.branch,
      'Service': b.service,
      'Date': b.date,
      'Time Slot': b.timeSlot,
      'Duration (hrs)': b.duration,
      'Customer Name': b.name,
      'Phone': b.phone,
      'Occasion': b.customOccasion || b.occasion,
      'Decoration Required': b.decorationRequired ? 'Yes' : 'No',
      'Cake Selected': b.selectedCake ? `${b.selectedCake.name} (₹${b.selectedCake.price})` : 'None',
      'Extra Decorations': b.extraDecorations?.map(d => `${d.name} (₹${d.price})`).join('; ') || 'None',
      'Total Price': b.totalPrice,
      'Payment Status': b.paymentStatus,
      'Booking Date': new Date(b.createdAt).toLocaleString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(bookingRows);
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 15 },
      { wch: 14 }, { wch: 18 }, { wch: 15 }, { wch: 20 },
      { wch: 18 }, { wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 20 }
    ];
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

// Mount sub-routers
router.use('/gallery', galleryRouter);
router.use('/branch-videos', videosRouter);
router.use('/hero-images', mediaRouter);

// ── WhatsApp Campaign ─────────────────────────────────────────────────────────
router.post('/campaign/whatsapp', verifyAdmin, async (req, res) => {
  try {
    const { message, image, phones: customPhones } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    let phones = [];

    // Use custom phones if provided by the frontend
    if (Array.isArray(customPhones) && customPhones.length > 0) {
      phones = customPhones;
    } else {
      // Fall back: collect all past customer phones
      const allPhones = new Set();
      for (const branchId in mongoConnections) {
        const models = getBranchModels(branchId);
        if (models) {
          const bookings = await models.Booking.find({}, 'phone');
          bookings.forEach(b => { if (b.phone) allPhones.add(b.phone); });
        }
      }
      for (const branchId in branchDbs) {
        (branchDbs[branchId].bookings || []).forEach(b => { if (b.phone) allPhones.add(b.phone); });
      }
      phones = Array.from(allPhones);
    }

    const result = await sendWhatsAppCampaign({ message, image, phones });
    res.json(result);
  } catch (err) {
    console.error('WhatsApp campaign error:', err);
    res.status(500).json({ error: 'Failed to send campaign', details: err.message });
  }
});

// ── Users list ────────────────────────────────────────────────────────────────
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const usersMap = new Map();
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
    for (const branchId in branchDbs) {
      (branchDbs[branchId].bookings || []).forEach(b => {
        if (b.phone && !usersMap.has(b.phone)) {
          usersMap.set(b.phone, { name: b.name, phone: b.phone, firstBooking: b.createdAt || b.date });
        }
      });
    }
    res.json(Array.from(usersMap.values()));
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
