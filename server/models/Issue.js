// models/Issue.js
// The Mongoose schema for one civic issue.

const mongoose = require('mongoose');
const { CATEGORIES, SEVERITIES, STATUSES, priorityScore } = require('../utils/issueRules');

const { Schema } = mongoose;

// Someone who pressed "Add my support" (same problem, reported again).
const supporterSchema = new Schema({
  voterHash: String,
  note: { type: String, maxlength: 500 },
  imageUrl: String,
  date: { type: Date, default: Date.now }
}, { _id: false });

// A "report as spam / fake" flag.
const flagSchema = new Schema({
  voterHash: String,
  reason: { type: String, maxlength: 200 },
  date: { type: Date, default: Date.now }
}, { _id: false });

const commentSchema = new Schema({
  name: { type: String, default: 'Resident', maxlength: 60 },
  text: { type: String, required: true, maxlength: 1000 },
  official: { type: Boolean, default: false }, // notes written by the admin
  voterHash: String,
  date: { type: Date, default: Date.now }
});

const historySchema = new Schema({
  status: String,
  note: String,
  date: { type: Date, default: Date.now }
}, { _id: false });

const issueSchema = new Schema({
  complaintId: { type: String, required: true, unique: true },   // e.g. CF-2026-00123
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  category: { type: String, enum: CATEGORIES, required: true },
  severity: { type: String, enum: SEVERITIES, default: 'Medium' },
  status: { type: String, enum: STATUSES, default: 'Reported' },
  location: {
    state: { type: String, required: true },
    district: String,
    city: String,       // city or area, e.g. "RS Puram"
    landmark: String,
    lat: Number,
    lng: Number,
    approximate: { type: Boolean, default: false } // true = area centre, not a GPS fix
  },
  imageUrls: [String],
  reporter: {
    name: String,
    phone: String,
    anonymous: { type: Boolean, default: true }
  },
  upvotes: { type: Number, default: 0 },
  upvoters: [String],          // voter hashes, so one person counts once
  reportCount: { type: Number, default: 1 },
  supporters: [supporterSchema],
  duplicateOf: { type: Schema.Types.ObjectId, ref: 'Issue', default: null },
  mergedIssues: [String],      // complaint IDs merged into this one
  flags: [flagSchema],
  isHidden: { type: Boolean, default: false },
  reopenVotes: [String],       // voter hashes of "Still not fixed"
  reopenCount: { type: Number, default: 0 },
  priorityScore: { type: Number, default: 0 },
  comments: [commentSchema],
  statusHistory: [historySchema],
  resolvedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes: without them MongoDB reads every document to answer a query.
// With them it jumps straight to the matching ones, like a book's index.
// - {category, status}: the feed and the duplicate check filter by both.
// - {lat, lng}: the "nearby" search asks for a lat/lng range (a box on the
//   map); the index finds the issues inside that box without scanning all.
// - {createdAt}: "newest first" sorting.
issueSchema.index({ category: 1, status: 1 });
issueSchema.index({ 'location.lat': 1, 'location.lng': 1 });
issueSchema.index({ createdAt: -1 });

// Keep the stored score and the "updated" time fresh on every save.
issueSchema.pre('save', function () {
  this.priorityScore = priorityScore(this);
  this.updatedAt = new Date();
});

module.exports = mongoose.model('Issue', issueSchema);
