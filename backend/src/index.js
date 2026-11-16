import './config/env.js'; // load env vars from root .env
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createPostgresClient } from './db/client.js';
import { bookings } from './db/schema.js';
import { sql } from 'drizzle-orm';

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
const publicDir = path.resolve(__dirname, '../public');
app.use(express.static(publicDir));

// Middleware
app.use(cors(corsOptions));
// Express 5 requires named wildcard parameters. This form also matches `/`.
app.options('/{*splat}', cors(corsOptions)); // Handle preflight requests
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



app.get('/api/debug/bookings-count', async (req, res) => {
  const { db, client } = createPostgresClient();
  try {
    const rows = await db.select({ branch: bookings.branch, count: sql`count(*)::int` }).from(bookings).groupBy(bookings.branch);
    const counts = Object.fromEntries(rows.map((row) => [row.branch, row.count]));
    res.json({ counts, total: Object.values(counts).reduce((total, count) => total + count, 0), timestamp: new Date(), storage: 'Postgres' });
  } finally { await client.end({ timeout: 5 }); }
});

// SPA fallback — all non-API routes serve the React app
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Error Handlers
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large' });
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Startup
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} 🚀`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`PORT env: ${process.env.PORT}`);
});
 
