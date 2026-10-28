// routes/stats.js
// GET /api/stats: the numbers behind the Impact dashboard, worked out with
// MongoDB aggregation pipelines ($match -> $group -> $sort).

const express = require('express');
const Issue = require('../models/Issue');
const { OPEN_STATUSES, daysBetween } = require('../utils/issueRules');

const router = express.Router();
const DAY_MS = 24 * 60 * 60 * 1000;
const notMerged = { status: { $ne: 'Merged' } };

router.get('/', async (req, res, next) => {
  try {
    const [byStatus, byCategory, resolution, ignored, districts, localities, oldest] = await Promise.all([
      Issue.aggregate([{ $match: notMerged }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Issue.aggregate([{ $match: notMerged }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Issue.aggregate([
        { $match: { status: 'Resolved', resolvedAt: { $ne: null } } },
        { $group: { _id: null, avgMs: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } } } }
      ]),
      // Most-ignored districts: open issues, average age in days.
      Issue.aggregate([
        { $match: { status: { $in: OPEN_STATUSES }, isHidden: false } },
        { $group: { _id: { district: '$location.district', state: '$location.state' }, open: { $sum: 1 }, avgMs: { $avg: { $subtract: ['$$NOW', '$createdAt'] } } } },
        { $sort: { avgMs: -1 } },
        { $limit: 5 }
      ]),
      // Leaderboard: share of each district's issues that are resolved.
      Issue.aggregate([
        { $match: notMerged },
        { $group: { _id: { district: '$location.district', state: '$location.state' }, total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } } } }
      ]),
      Issue.distinct('location.city', notMerged),
      Issue.findOne({ status: { $in: OPEN_STATUSES }, isHidden: false }).sort({ createdAt: 1 })
    ]);

    const statusCounts = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
    const totalReported = byStatus.reduce((sum, s) => sum + s.count, 0);
    const resolved = statusCounts.Resolved || 0;

    res.json({
      totalReported,
      resolved,
      open: totalReported - resolved,
      activeLocalities: localities.length,
      avgResolutionDays: resolution[0] ? Math.round((resolution[0].avgMs / DAY_MS) * 10) / 10 : 0,
      resolutionRate: totalReported ? Math.round((resolved / totalReported) * 100) : 0,
      byStatus: statusCounts,
      topCategories: byCategory.map((c) => ({ category: c._id, count: c.count })),
      mostIgnoredDistricts: ignored.map((d) => ({
        district: d._id.district,
        state: d._id.state,
        open: d.open,
        avgDaysIgnored: Math.round(d.avgMs / DAY_MS)
      })),
      leaderboard: districts
        .map((d) => ({ district: d._id.district, state: d._id.state, total: d.total, resolved: d.resolved, rate: Math.round((d.resolved / d.total) * 100) }))
        .sort((a, b) => b.rate - a.rate || b.total - a.total)
        .slice(0, 8),
      longestIgnored: oldest
        ? { complaintId: oldest.complaintId, title: oldest.title, city: oldest.location.city, district: oldest.location.district, days: daysBetween(oldest.createdAt) }
        : null
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
