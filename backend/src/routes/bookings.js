import express from 'express';
import * as bookingController from '../controllers/bookingController.js';
import { verifyAdmin } from '../middleware/auth.js';
import { getCatalogForBranch } from '../controllers/catalogController.js';
import { globalDb } from '../config/constants.js';

const router = express.Router();

// Availability
router.get('/availability/:branchId/:date/:service', bookingController.getAvailability);

// ── Chunked step data endpoints (each returns only what that step needs) ─────

// Step 0: branches + pricing only (fast, no cakes/decorations)
router.get('/step/branch-service/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    const catalog = await getCatalogForBranch(branchId);
    if (!catalog) return res.status(404).json({ error: 'Branch not found' });

    // All branches with bookingsEnabled flag
    const { branchDbs } = await import('../config/constants.js');
    const branches = [];
    for (const bId of Object.keys(branchDbs)) {
      const bCatalog = await getCatalogForBranch(bId);
      if (bCatalog) {
        branches.push({
          id: bId,
          name: bCatalog.name || bId,
          address: bCatalog.address || '',
          phone: bCatalog.phone || '',
          mapLink: bCatalog.mapLink || '',
          bookingsEnabled: bCatalog.bookingsEnabled !== false,
          halls: bCatalog.halls || [],
        });
      }
    }

    res.set('Cache-Control', 'no-store');
    res.json({ branches, pricing: catalog.pricing, decorationPrice: catalog.decorationPrice ?? 1500, halls: catalog.halls || [] });
  } catch (err) {
    console.error('[step/branch-service]', err);
    res.status(500).json({ error: 'Failed to load step data' });
  }
});

// Step 2: occasions only
router.get('/step/occasions', (req, res) => {
  res.json({ occasions: globalDb.occasions });
});

// Step 3: cakes for a branch
router.get('/step/cakes/:branchId', async (req, res) => {
  try {
    const catalog = await getCatalogForBranch(req.params.branchId);
    if (!catalog) return res.status(404).json({ error: 'Branch not found' });
    res.set('Cache-Control', 'no-store');
    res.json({ cakes: catalog.cakes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load cakes' });
  }
});

// Step 4: decorations for a branch
router.get('/step/decorations/:branchId', async (req, res) => {
  try {
    const catalog = await getCatalogForBranch(req.params.branchId);
    if (!catalog) return res.status(404).json({ error: 'Branch not found' });
    res.set('Cache-Control', 'no-store');
    res.json({ decorations: catalog.decorations, decorationPrice: catalog.decorationPrice ?? 1500 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load decorations' });
  }
});

// ── Full init (kept for backward compat) ─────────────────────────────────────
router.get('/init/:branchId', bookingController.getBookingInit);

router.post('/', bookingController.createBooking);
router.get('/', verifyAdmin, bookingController.getAllBookings);
router.get('/:id', bookingController.getBookingById);
router.put('/:id', verifyAdmin, bookingController.updateBooking);
router.delete('/:id', verifyAdmin, bookingController.deleteBooking);
router.post('/delete-multiple', verifyAdmin, bookingController.deleteMultipleBookings);

export default router;
