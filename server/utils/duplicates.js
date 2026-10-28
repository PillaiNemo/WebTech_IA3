// utils/duplicates.js
// Finds open issues that are probably the same problem as a new report.

// How close two reports of the same category must be to count as "the same".
const NEARBY_RADIUS_M = 150;

const Issue = require('../models/Issue');
const { OPEN_STATUSES } = require('./issueRules');
const { wordOverlap } = require('./text');

const EARTH_RADIUS_M = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;

// Haversine formula: the distance in metres between two points on a sphere.
// It uses the angle between the points (from their latitude and longitude)
// and multiplies it by the Earth's radius.
function haversine(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

// Returns up to `limit` matches: [{ issue, distance? , score? }]
async function findSimilar({ lat, lng, category, state, district, city, text = '' }, limit = 6) {
  const base = { category, status: { $in: OPEN_STATUSES }, isHidden: false };

  // 1. With a GPS point: a quick box search in MongoDB, then exact distances.
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const dLat = NEARBY_RADIUS_M / 111320;                               // metres per degree of latitude
    const dLng = NEARBY_RADIUS_M / (111320 * Math.cos(toRad(lat)));      // shrinks towards the poles
    const candidates = await Issue.find({
      ...base,
      'location.lat': { $gte: lat - dLat, $lte: lat + dLat },
      'location.lng': { $gte: lng - dLng, $lte: lng + dLng }
    });

    return candidates
      .map((issue) => ({ issue, distance: Math.round(haversine(lat, lng, issue.location.lat, issue.location.lng)) }))
      .filter((m) => m.distance <= NEARBY_RADIUS_M)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  // 2. No GPS: same state, district and city, ranked by shared words.
  if (!state || !district || !city) return [];
  const candidates = await Issue.find({ ...base, 'location.state': state, 'location.district': district, 'location.city': city });
  return candidates
    .map((issue) => ({ issue, score: wordOverlap(text, `${issue.title} ${issue.location.landmark || ''}`) }))
    .filter((m) => m.score > 0 || !text.trim())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = { NEARBY_RADIUS_M, haversine, findSimilar };
