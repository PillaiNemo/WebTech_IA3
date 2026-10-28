// utils/issueRules.js
// The rules that turn an issue's raw data into the numbers people see.
// The React app uses the same rules (client/src/utils/issueMath.js).

const DAY_MS = 24 * 60 * 60 * 1000;

const CATEGORIES = ['pothole', 'garbage', 'streetlight', 'water', 'sewage', 'road', 'animals', 'other'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Reported', 'Acknowledged', 'In Progress', 'Resolved', 'Merged'];
const OPEN_STATUSES = ['Reported', 'Acknowledged', 'In Progress'];

// An open issue older than this gets the "Escalated" badge.
const ESCALATION_DAYS = 30;
// Points each severity adds to the priority score.
const SEVERITY_WEIGHT = { Low: 2, Medium: 5, High: 10, Critical: 20 };

function daysBetween(from, to = new Date()) {
  return Math.max(0, Math.floor((new Date(to) - new Date(from)) / DAY_MS));
}

// Days since the report while the issue is still open; 0 once it is closed.
function daysIgnored(issue) {
  if (!OPEN_STATUSES.includes(issue.status)) return 0;
  return daysBetween(issue.createdAt);
}

// Priority score = reportCount x 3 + upvotes + daysIgnored + severity weight.
// Many reporters count most, every "Me too" adds a point, waiting raises it
// every day, and a Critical problem starts 20 points ahead of a Low one.
function priorityScore(issue) {
  return (issue.reportCount || 1) * 3 + (issue.upvotes || 0) + daysIgnored(issue) + (SEVERITY_WEIGHT[issue.severity] || 0);
}

// The shape every API response uses for an issue. Voter hashes and phone
// numbers never leave the server unless an admin asks.
function toPublic(doc, { admin = false } = {}) {
  const o = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const reporter = o.reporter || {};
  const days = daysIgnored(o);

  return {
    id: String(o._id),
    complaintId: o.complaintId,
    title: o.title,
    description: o.description,
    category: o.category,
    severity: o.severity,
    status: o.status,
    location: o.location,
    imageUrls: o.imageUrls || [],
    reporter: reporter.anonymous ? { anonymous: true } : { anonymous: false, name: reporter.name || 'Resident' },
    upvotes: o.upvotes || 0,
    reportCount: o.reportCount || 1,
    supportersCount: (o.supporters || []).length,
    supporters: (o.supporters || []).map((s) => ({ note: s.note, imageUrl: s.imageUrl, date: s.date })),
    duplicateOf: o.duplicateOf ? String(o.duplicateOf._id || o.duplicateOf) : null,
    mergedIssues: o.mergedIssues || [],
    flagsCount: (o.flags || []).length,
    isHidden: !!o.isHidden,
    reopenVotes: (o.reopenVotes || []).length,
    reopenCount: o.reopenCount || 0,
    comments: (o.comments || []).map((c) => ({ id: String(c._id), name: c.name, text: c.text, official: !!c.official, date: c.date })),
    statusHistory: o.statusHistory || [],
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    resolvedAt: o.resolvedAt || null,
    daysIgnored: days,
    priorityScore: priorityScore(o),
    escalated: days > ESCALATION_DAYS,
    ...(admin ? { flags: (o.flags || []).map((f) => ({ reason: f.reason, date: f.date })), reporterPhone: reporter.phone || '' } : {})
  };
}

module.exports = {
  CATEGORIES, SEVERITIES, STATUSES, OPEN_STATUSES, ESCALATION_DAYS, SEVERITY_WEIGHT,
  daysBetween, daysIgnored, priorityScore, toPublic
};
