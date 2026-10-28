// routes/track.js
// GET /api/track/:complaintId: the status timeline of one complaint.
// A merged complaint points to the issue it was merged into.

const express = require('express');
const Issue = require('../models/Issue');
const { toPublic } = require('../utils/issueRules');

const router = express.Router();

router.get('/:complaintId', async (req, res, next) => {
  try {
    const id = String(req.params.complaintId).trim().toUpperCase();
    if (!/^CF-\d{4}-\d{5}$/.test(id)) {
      return res.status(400).json({ error: true, status: 400, message: 'Complaint IDs look like CF-2026-00123.' });
    }

    const issue = await Issue.findOne({ complaintId: id }).populate('duplicateOf', 'complaintId status');
    if (!issue) return res.status(404).json({ error: true, status: 404, message: `We couldn't find complaint ${id}. Check the ID and try again.` });

    const data = toPublic(issue);
    if (issue.duplicateOf) {
      data.mergedInto = issue.duplicateOf.complaintId;
      data.masterStatus = issue.duplicateOf.status;
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
