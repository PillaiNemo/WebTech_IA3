// models/Counter.js
// A tiny collection that hands out the next complaint number safely:
// $inc is atomic, so two reports at the same moment never get the same ID.

const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: String,                    // e.g. "complaint-2026"
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

// Returns "CF-2026-00123" style IDs.
async function nextComplaintId(date = new Date()) {
  const year = date.getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { _id: `complaint-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `CF-${year}-${String(counter.seq).padStart(5, '0')}`;
}

module.exports = { Counter, nextComplaintId };
