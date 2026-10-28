// routes/issues.js
// Public issue endpoints: list, nearby duplicates, details, create,
// upvote, comment, support, flag and "still not fixed".

const express = require('express');
const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const { nextComplaintId } = require('../models/Counter');
const { toPublic, daysIgnored, OPEN_STATUSES } = require('../utils/issueRules');
const { findSimilar } = require('../utils/duplicates');
const { validateIssue } = require('../utils/validate');
const { findBlockedWord, escapeRegex } = require('../utils/text');
const { voterHash } = require('../utils/voter');
const { saveImage } = require('../utils/images');
const { reportLimiter, actionLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const FLAGS_TO_HIDE = 3;   // spam flags from different people before an issue hides itself
const VOTES_TO_REOPEN = 3; // "still not fixed" votes before a resolved issue reopens

function httpError(status, message, extra) {
  const err = new Error(message);
  err.status = status;
  if (extra) err.extra = extra;
  return err;
}

// Finds an issue by complaint ID ("CF-2026-00123") or by MongoDB _id.
async function findIssue(id) {
  const query = mongoose.isValidObjectId(id) ? { _id: id } : { complaintId: String(id).toUpperCase() };
  const issue = await Issue.findOne(query);
  if (!issue) throw httpError(404, `No issue found with ID ${id}.`);
  return issue;
}

// Honeypot: the hidden "website" field is empty for people, filled by bots.
function rejectBots(req) {
  if (req.body.website) throw httpError(400, 'Your submission could not be accepted.');
}

const toMatch = (m) => ({ ...toPublic(m.issue), distance: m.distance ?? null });

// ---------- GET /api/issues ----------------------------------------------
// ?state=&district=&category=&status=&severity=&q=&sort=newest|upvotes|unresolved|priority&page=&limit=
router.get('/', async (req, res, next) => {
  try {
    const { state, district, category, status, severity, q, sort = 'newest' } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));

    // Hidden (flagged) and merged issues never appear in the public feed.
    const filter = { isHidden: false, status: { $ne: 'Merged' } };
    if (state) filter['location.state'] = state;
    if (district) filter['location.district'] = district;
    if (category) filter.category = category;
    if (severity) filter.severity = severity;
    if (status && status !== 'Merged') filter.status = status;
    if (q) {
      const rx = new RegExp(escapeRegex(String(q).slice(0, 80)), 'i');
      filter.$or = [{ title: rx }, { description: rx }, { complaintId: rx }, { 'location.city': rx }, { 'location.district': rx }, { 'location.landmark': rx }];
    }

    const docs = await Issue.find(filter).lean();
    const items = docs.map((d) => toPublic(d));

    // Sorting happens here because "days ignored" and the priority score
    // change every day, so they are worked out fresh for each request.
    const sorters = {
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      upvotes: (a, b) => b.upvotes - a.upvotes,
      unresolved: (a, b) => b.daysIgnored - a.daysIgnored,
      priority: (a, b) => b.priorityScore - a.priorityScore
    };
    items.sort(sorters[sort] || sorters.newest);

    const total = items.length;
    res.json({
      items: items.slice((page - 1) * limit, page * limit),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit))
    });
  } catch (err) {
    next(err);
  }
});

// ---------- GET /api/issues/nearby (possible duplicates) ------------------
// Must come before "/:id", otherwise "nearby" would be read as an ID.
router.get('/nearby', async (req, res, next) => {
  try {
    const { category, state, district, city, text } = req.query;
    if (!category) throw httpError(400, 'category is required.');
    const lat = req.query.lat === undefined || req.query.lat === '' ? NaN : Number(req.query.lat);
    const lng = req.query.lng === undefined || req.query.lng === '' ? NaN : Number(req.query.lng);

    const matches = await findSimilar({ lat, lng, category, state, district, city, text });
    res.json({ count: matches.length, matches: matches.map(toMatch) });
  } catch (err) {
    next(err);
  }
});

// ---------- GET /api/issues/:id --------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const issue = await findIssue(req.params.id);
    if (issue.isHidden) throw httpError(404, 'This issue has been hidden while moderators review it.');
    const data = toPublic(issue);
    if (issue.duplicateOf) {
      const master = await Issue.findById(issue.duplicateOf).select('complaintId');
      data.mergedInto = master ? master.complaintId : null;
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ---------- POST /api/issues (new report) ----------------------------------
router.post('/', reportLimiter, async (req, res, next) => {
  try {
    rejectBots(req);
    const { errors, value } = validateIssue(req.body);
    if (Object.keys(errors).length) throw httpError(400, Object.values(errors)[0], { errors });

    // Run the duplicate check again on the server. Unless the person has
    // said "mine is different", a close match means 409 Conflict.
    // An "approximate" point is only the area's centre, so then we use the
    // no-GPS fallback (same area, ranked by shared words) instead of distance.
    if (req.body.confirmedNotDuplicate !== true) {
      const { approximate, lat, lng, ...area } = value.location;
      const point = approximate ? {} : { lat, lng };
      const matches = await findSimilar({ ...area, ...point, category: value.category, text: `${value.title} ${value.location.landmark}` });
      if (matches.length) {
        return res.status(409).json({
          error: true,
          status: 409,
          message: 'Similar issues already exist near this spot. Add your support to one of them, or confirm yours is different.',
          matches: matches.map(toMatch)
        });
      }
    }

    const imageUrls = req.body.image ? [await saveImage(req.body.image)] : [];
    const issue = new Issue({
      ...value,
      complaintId: await nextComplaintId(),
      imageUrls,
      statusHistory: [{ status: 'Reported', note: 'Complaint received and published.' }]
    });
    await issue.save();

    res.status(201).json(toPublic(issue));
  } catch (err) {
    next(err);
  }
});

// ---------- POST /api/issues/:id/upvote ("Me too") ---------------------------
router.post('/:id/upvote', actionLimiter, async (req, res, next) => {
  try {
    const hash = voterHash(req);
    const issue = await findIssue(req.params.id);
    if (issue.upvoters.includes(hash)) throw httpError(409, 'You have already upvoted this issue.');

    issue.upvoters.push(hash);
    issue.upvotes += 1;
    await issue.save();
    res.json({ upvotes: issue.upvotes, priorityScore: issue.priorityScore });
  } catch (err) {
    next(err);
  }
});

// ---------- POST /api/issues/:id/comments ------------------------------------
router.post('/:id/comments', actionLimiter, async (req, res, next) => {
  try {
    rejectBots(req);
    const text = String(req.body.text || '').trim().slice(0, 1000);
    const name = String(req.body.name || '').trim().slice(0, 60) || 'Resident';
    if (text.length < 3) throw httpError(400, 'Write at least 3 characters.');
    if (findBlockedWord(text, name)) throw httpError(400, 'Please remove offensive or spam words and try again.');

    const issue = await findIssue(req.params.id);
    issue.comments.push({ name, text, voterHash: voterHash(req) });
    await issue.save();
    res.status(201).json(toPublic(issue).comments.at(-1));
  } catch (err) {
    next(err);
  }
});

// ---------- POST /api/issues/:id/support ("Add my support") -----------------
// The same problem reported by someone else: it strengthens this issue
// (reportCount + 1) instead of creating a duplicate.
router.post('/:id/support', actionLimiter, async (req, res, next) => {
  try {
    rejectBots(req);
    const hash = voterHash(req);
    const note = String(req.body.note || '').trim().slice(0, 500);
    if (findBlockedWord(note)) throw httpError(400, 'Please remove offensive or spam words and try again.');

    const issue = await findIssue(req.params.id);
    if (!OPEN_STATUSES.includes(issue.status)) throw httpError(400, 'This issue is closed, so it cannot take new support.');
    if (issue.supporters.some((s) => s.voterHash === hash)) throw httpError(409, 'You have already added your support to this issue.');

    const imageUrl = req.body.image ? await saveImage(req.body.image) : undefined;
    issue.supporters.push({ voterHash: hash, note, imageUrl });
    if (imageUrl) issue.imageUrls.push(imageUrl);
    issue.reportCount += 1;
    await issue.save();
    res.json(toPublic(issue));
  } catch (err) {
    next(err);
  }
});

// ---------- POST /api/issues/:id/flag (spam / fake) -------------------------
router.post('/:id/flag', actionLimiter, async (req, res, next) => {
  try {
    const hash = voterHash(req);
    const reason = String(req.body.reason || 'Spam or fake').trim().slice(0, 200);
    const issue = await findIssue(req.params.id);
    if (issue.flags.some((f) => f.voterHash === hash)) throw httpError(409, 'You have already reported this issue.');

    issue.flags.push({ voterHash: hash, reason });
    if (issue.flags.length >= FLAGS_TO_HIDE) issue.isHidden = true; // waits in the admin "Flagged" queue
    await issue.save();
    res.json({ flagsCount: issue.flags.length, hidden: issue.isHidden });
  } catch (err) {
    next(err);
  }
});

// ---------- POST /api/issues/:id/not-fixed ("Still not fixed") --------------
router.post('/:id/not-fixed', actionLimiter, async (req, res, next) => {
  try {
    const hash = voterHash(req);
    const issue = await findIssue(req.params.id);
    if (issue.status !== 'Resolved') throw httpError(400, 'Only resolved issues can be marked as not fixed.');
    if (issue.reopenVotes.includes(hash)) throw httpError(409, 'You have already said this is not fixed.');

    issue.reopenVotes.push(hash);
    let reopened = false;
    if (issue.reopenVotes.length >= VOTES_TO_REOPEN) {
      reopened = true;
      issue.status = 'Reported';
      issue.reopenCount += 1;
      issue.reopenVotes = [];
      issue.resolvedAt = null;
      issue.statusHistory.push({ status: 'Reported', note: `Reopened: ${VOTES_TO_REOPEN} residents said the problem is still not fixed.` });
    }
    await issue.save();
    res.json({ reopened, votes: issue.reopenVotes.length, needed: VOTES_TO_REOPEN, status: issue.status, daysIgnored: daysIgnored(issue) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
