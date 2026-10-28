// server.js
// Entry point of the CivicFix API (Node.js + Express + MongoDB).

const path = require('path');
const fs = require('fs');
const express = require('express');

// 1. Load settings from server/.env using Node's built-in loader.
try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch {
  console.warn('server/.env not found. Copy .env.example to .env and edit it.');
}

const { connectDB } = require('./config/db');
const { UPLOAD_DIR } = require('./utils/images');
const healthRoutes = require('./routes/health');
const issueRoutes = require('./routes/issues');
const trackRoutes = require('./routes/track');
const statsRoutes = require('./routes/stats');
const adminRoutes = require('./routes/admin');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// The Vite dev server forwards requests to us, so trust its X-Forwarded-For
// header for the visitor's IP (used by the rate limiter and voter hash).
app.set('trust proxy', 'loopback');

// 2. Make sure the uploads folder exists (fs with a callback).
fs.mkdir(UPLOAD_DIR, { recursive: true }, (err) => {
  if (err) console.error('Could not create uploads folder:', err.message);
});

// 3. Middleware.
// Photos arrive as base64 inside JSON; a 3 MB image is about 4 MB as base64.
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));                            // status page + API playground
app.use('/uploads', express.static(UPLOAD_DIR));                                    // uploaded photos
app.use('/images', express.static(path.join(__dirname, '..', 'client', 'public', 'images'))); // seed photos
app.use('/static', express.static(path.join(__dirname, '..', 'static')));          // About, How it works, Contact

// 4. Routes.
app.use('/api/health', healthRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);

// 5. Errors (must come after all routes).
app.use(notFound);
app.use(errorHandler);

// 6. Start.
connectDB();
app.listen(PORT, () => {
  console.log(`CivicFix server is running at http://localhost:${PORT}`);
});
