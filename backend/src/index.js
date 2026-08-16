import './config/env.js'; // load env vars from root .env
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectToMongo, getBranchModels } from './config/mongo.js';
import { branchDbs, globalDb } from './config/constants.js';
import { loadBookings, loadTimeSlots } from './utils/persistence.js';
import { loadBranchPricingData } from './controllers/catalogController.js';

// Route Imports
import adminRoutes from './routes/admin/index.js';
import bookingRoutes from './routes/bookings.js';
import catalogRoutes from './routes/catalog.js';
import branchRoutes from './routes/branch.js';
import paymentRoutes from './routes/payment.js';

import { corsOptions } from './middleware/cors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Static frontend — served from backend/public/ (built from frontend/dist/)
const publicDir = path.resolve(__dirname, '../../public');
app.use(express.static(publicDir));

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests
app.use(express.json({ limit: '20mb' }));

app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Routes
app.use('/api/branches', branchRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/catalog', catalogRoutes); // consolidated catalog operations

// Unified access to catalog components (pricing, cakes, etc.) under /api/
app.use('/api', catalogRoutes); 

// Legacy compatibility (if needed)
app.use('/api/booking', bookingRoutes);



// Health & Debug
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));
app.get('/api/debug/bookings-count', async (req, res) => {
  const counts = {};
  let total = 0;
  
  for (const branchId in branchDbs) {
    let branchTotal = 0;
    const models = getBranchModels(branchId);
    
    if (models) {
      try {
        branchTotal = await models.Booking.countDocuments();
      } catch (e) {
        console.error(`Error counting Mongo bookings for ${branchId}:`, e.message);
      }
    } else {
      branchTotal = branchDbs[branchId].bookings.length;
    }
    
    counts[branchId] = branchTotal;
    total += branchTotal;
  }
  
  res.json({ counts, total, timestamp: new Date(), storage: Object.keys(counts).map(id => ({ id, type: getBranchModels(id) ? 'MongoDB' : 'File' })) });
});

// SPA fallback — all non-API routes serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Error Handlers
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large' });
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Startup
(async () => {
  try {
    // Mongo Connections
    await connectToMongo('branch-1', process.env.MONGODB_URI_BRANCH1);
    await connectToMongo('branch-2', process.env.MONGODB_URI_BRANCH2);
    await connectToMongo('reviews', process.env.MONGODB_URI_REVIEWS);

    // Persistence
    await loadBookings(branchDbs);
    await loadTimeSlots(branchDbs);
    await loadBranchPricingData();

    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} 🚀`));
  } catch (error) {
    console.error('Startup Error:', error);
  }
})();
 
