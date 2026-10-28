// routes/admin.js
// Admin endpoints. Everything except /login needs a valid session token.

const express = require('express');
const Issue = require('../models/Issue');
const { toPublic, STATUSES } = require('../utils/issueRules');
const { deleteImage } = require('../utils/images');
const { login, requireAdmin } = require('../middleware/adminAuth');
const { rateLimit } = require('../middleware/rateLimiter');

const router = express.Router();

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function findByComplaintOrId(id) {
  const issue = /^CF-/i.test(id)
    ? await Issue.findOne({ complaintId: id.toUpperCase() })
    : await Issue.findById(id).catch(() => null);
  if (!issue) throw httpError(404, `No issue found with ID ${id}.`);
  return issue;
}

// ---------- POST /api/admin/login (10 tries per 15 minutes per IP) ----------
router.post('/login', rateLimit({ name: 'admin-login', max: 10, windowMs: 15 * 60 * 1000 }), (req, res) => {
  const session = login(req.body.passcode);
  if (!session) return res.status(401).json({ error: true, status: 401, message: 'That passcode is not correct.' });
  res.json(session);
});

// Every route below this line requires the admin token.
router.use(requireAdmin);

// ---------- GET /api/admin/issues (everything, including hidden/merged) -----
router.get('/issues', async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const docs = await Issue.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ items: docs.map((d) => toPublic(d, { admin: true })) });
  } catch (err) {
    next(err);
  }
});

// ---------- PATCH /api/admin/issues/:id/status --------------------------------
router.patch('/issues/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const note = String(req.body.note || '').trim().slice(0, 500);
    if (!STATUSES.includes(status) || status === 'Merged') throw httpError(400, 'Choose Reported, Acknowledged, In Progress or Resolved. Use Merge for duplicates.');

    const issue = await findByComplaintOrId(req.params.id);
    if (issue.status === 'Merged') throw httpError(400, 'This issue was merged; update the main issue instead.');

    issue.status = status;
    issue.resolvedAt = status === 'Resolved' ? new Date() : null;
    if (status === 'Resolved') issue.reopenVotes = [];
    issue.statusHistory.push({ status, note: note || `Status changed to ${status}.` });
    if (note) issue.comments.push({ name: 'Municipal officer', text: note, official: true });
    await issue.save();

    // Merged duplicates show the master's status, so nothing else to update.
    res.json(toPublic(issue, { admin: true }));
  } catch (err) {
    next(err);
  }
});

// ---------- PATCH /api/admin/issues/:id/merge  body: { masterId } -------------
// :id is the duplicate. Its supporters, photos and comments move to the
// master; the duplicate becomes "Merged" and disappears from the feed.
router.patch('/issues/:id/merge', async (req, res, next) => {
  try {
    const dup = await findByComplaintOrId(req.params.id);
    const master = await findByComplaintOrId(String(req.body.masterId || ''));
    if (dup.id === master.id) throw httpError(400, 'An issue cannot be merged into itself.');
    if (dup.status === 'Merged') throw httpError(400, `${dup.complaintId} is already merged.`);
    if (master.status === 'Merged') throw httpError(400, 'The main issue is itself merged; pick its main issue instead.');

    master.supporters.push(...dup.supporters);
    master.imageUrls.push(...dup.imageUrls.filter((url) => !master.imageUrls.includes(url)));
    master.comments.push(...dup.comments.map((c) => ({ name: c.name, text: c.text, official: c.official, date: c.date })));
    master.reportCount += dup.reportCount;
    master.upvotes += dup.upvotes;
    master.mergedIssues.push(dup.complaintId, ...dup.mergedIssues);
    master.statusHistory.push({ status: master.status, note: `${dup.complaintId} was merged into this issue (same problem).` });

    dup.status = 'Merged';
    dup.duplicateOf = master._id;
    dup.supporters = [];
    dup.comments = [];
    dup.statusHistory.push({ status: 'Merged', note: `Merged into ${master.complaintId}.` });

    await master.save();
    await dup.save();
    res.json({ master: toPublic(master, { admin: true }), duplicate: toPublic(dup, { admin: true }) });
  } catch (err) {
    next(err);
  }
});

// ---------- GET /api/admin/flagged --------------------------------------------
router.get('/flagged', async (req, res, next) => {
  try {
    const docs = await Issue.find({ 'flags.0': { $exists: true } }).lean();
    const items = docs.map((d) => toPublic(d, { admin: true })).sort((a, b) => b.flagsCount - a.flagsCount);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

// ---------- PATCH /api/admin/issues/:id/restore -------------------------------
router.patch('/issues/:id/restore', async (req, res, next) => {
  try {
    const issue = await findByComplaintOrId(req.params.id);
    issue.isHidden = false;
    issue.flags = [];
    await issue.save();
    res.json(toPublic(issue, { admin: true }));
  } catch (err) {
    next(err);
  }
});

// ---------- DELETE /api/admin/issues/:id --------------------------------------
router.delete('/issues/:id', async (req, res, next) => {
  try {
    const issue = await findByComplaintOrId(req.params.id);
    await issue.deleteOne();
    issue.imageUrls.forEach(deleteImage); // remove its uploaded photos from disk
    res.json({ deleted: issue.complaintId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
