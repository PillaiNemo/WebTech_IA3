// routes/health.js
// GET /api/health: tells you whether the API and the database are alive.

const express = require('express');
const { getDbStatus, pingDB } = require('../config/db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const database = getDbStatus();
    database.pingMs = await pingDB();

    res.json({
      status: 'ok',
      service: 'CivicFix API',
      time: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      database
    });
  } catch (err) {
    next(err); // handled by middleware/errorHandler.js
  }
});

module.exports = router;
