// utils/issueMath.js
// Small, pure functions that turn an issue's raw data into what we show on
// cards. The server uses the same rules (Phase 4).

import categories from '../data/categories.json';

const DAY_MS = 24 * 60 * 60 * 1000;

// An unresolved issue older than this many days gets the "Escalated" badge.
export const ESCALATION_DAYS = 30;

// Points that each severity adds to the priority score.
export const SEVERITY_WEIGHT = { Low: 2, Medium: 5, High: 10, Critical: 20 };

// Status name -> chip class from the design system.
export const STATUS_CLASS = {
  Reported: 'cf-status--reported',
  Acknowledged: 'cf-status--acknowledged',
  'In Progress': 'cf-status--progress',
  Resolved: 'cf-status--resolved',
  Merged: 'cf-status--merged'
};

// Category id -> { label, hint, chip, tone } from data/categories.json
const CATEGORY = Object.fromEntries(categories.map((c) => [c.id, c]));

export function categoryInfo(id) {
  return CATEGORY[id] || CATEGORY.other;
}

// Whole days between two dates (never negative).
export function daysBetween(from, to = new Date()) {
  return Math.max(0, Math.floor((new Date(to) - new Date(from)) / DAY_MS));
}

// "Just now", "5 hours ago", "1 day ago", "3 days ago"
export function timeAgo(date) {
  const hours = Math.floor((Date.now() - new Date(date)) / (60 * 60 * 1000));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// Days since the report while the issue is still open; 0 once it is closed.
export function daysIgnored(issue) {
  if (issue.status === 'Resolved' || issue.status === 'Merged') return 0;
  return daysBetween(issue.createdAt);
}

export function isEscalated(issue) {
  return daysIgnored(issue) > ESCALATION_DAYS;
}

// How long a resolved issue took to fix, or null if it is still open.
export function daysToFix(issue) {
  return issue.resolvedAt ? daysBetween(issue.createdAt, issue.resolvedAt) : null;
}

// Priority score: how urgently an issue deserves attention.
//   reportCount x 3   every person who reported the same problem counts most
// + upvotes           each "Me too" adds one point
// + daysIgnored       the longer it waits, the higher it climbs
// + severity weight   Low 2, Medium 5, High 10, Critical 20
// Example: 5 reports, 41 upvotes, 23 days, High -> 15 + 41 + 23 + 10 = 89
export function priorityScore(issue) {
  const weight = SEVERITY_WEIGHT[issue.severity] || 0;
  return (issue.reportCount || 1) * 3 + (issue.upvotes || 0) + daysIgnored(issue) + weight;
}
