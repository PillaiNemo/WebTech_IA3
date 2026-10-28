// seed.js  (run with: npm run seed)
// Empties the issues collection and fills it with realistic sample data from
// database/seed-issues.json, so the demo looks alive straight away.

const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const mongoose = require('mongoose');

process.loadEnvFile(path.join(__dirname, '.env'));

const Issue = require('./models/Issue');
const { Counter } = require('./models/Counter');
const { priorityScore } = require('./utils/issueRules');

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const PHOTOS = {
  pothole: '/images/04-pothole-road-photo.png',
  road: '/images/04-pothole-road-photo.png',
  garbage: '/images/05-overflowing-waste-bins.png',
  streetlight: '/images/06-streetlight-photo.png'
};

// Small offsets (in degrees, about 10-30 m) that keep a cluster's reports
// close together, so they fall inside the 150 m duplicate radius.
const CLUSTER_OFFSETS = [[0, 0], [0.0002, 0.0001], [-0.00015, 0.0002], [0.0001, -0.0002], [-0.0002, -0.0001]];

const fakeHash = () => crypto.randomBytes(32).toString('hex');
const at = (ms) => new Date(Math.min(ms, NOW - 60 * 60 * 1000)); // never in the future

// "RS Puram" -> { state, district, city, lat, lng }
function buildPlaceIndex(locations) {
  const index = {};
  locations.states.forEach((state) => state.districts.forEach((district) => district.cities.forEach((city) => {
    index[city.name] = { state: state.name, district: district.name, city: city.name, lat: city.lat, lng: city.lng };
  })));
  return index;
}

// The status timeline an issue would have gathered on its way to `status`.
function buildHistory(item, created) {
  const history = [{ status: 'Reported', note: 'Complaint received and published.', date: created }];
  const steps = ['Acknowledged', 'In Progress', 'Resolved'];
  const reached = item.status === 'Merged' ? 0 : steps.indexOf(item.status) + 1;

  if (item.reopenCount) {
    history.push({ status: 'Resolved', note: 'Patchwork completed.', date: at(created.getTime() + 4 * DAY) });
    history.push({ status: 'Reported', note: 'Reopened: 3 residents said the problem is still not fixed.', date: at(created.getTime() + 11 * DAY) });
  }
  if (reached >= 1) history.push({ status: 'Acknowledged', note: 'Forwarded to the ward office.', date: at(created.getTime() + (item.reopenCount ? 12 : 1) * DAY) });
  if (reached >= 2) history.push({ status: 'In Progress', note: 'A work crew has been assigned.', date: at(created.getTime() + (item.reopenCount ? 13 : 2) * DAY) });
  if (reached >= 3) history.push({ status: 'Resolved', note: 'Work completed and checked by the ward engineer.', date: at(created.getTime() + item.resolvedAfter * DAY) });
  return history;
}

async function seed() {
  const [rawSeed, rawLocations] = await Promise.all([
    fs.readFile(path.join(__dirname, '..', 'database', 'seed-issues.json'), 'utf8'),
    fs.readFile(path.join(__dirname, '..', 'client', 'src', 'data', 'locations.json'), 'utf8')
  ]);
  const { clusters, issues } = JSON.parse(rawSeed);
  const places = buildPlaceIndex(JSON.parse(rawLocations));

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected. Clearing old data...');
  await Promise.all([Issue.deleteMany({}), Counter.deleteMany({})]);

  const clusterCount = {};
  const docs = issues.map((item, i) => {
    const cluster = item.cluster ? clusters[item.cluster] : null;
    const category = cluster ? cluster.category : item.category;
    const place = places[cluster ? cluster.city : item.city];
    if (!place) throw new Error(`Unknown city in seed data: ${cluster ? cluster.city : item.city}`);

    let lat;
    let lng;
    if (cluster) {
      // Members of a cluster sit within a few metres of each other.
      const n = (clusterCount[item.cluster] = (clusterCount[item.cluster] || 0) + 1) - 1;
      [lat, lng] = [place.lat + CLUSTER_OFFSETS[n][0], place.lng + CLUSTER_OFFSETS[n][1]];
    } else {
      // Single issues are spread 300-700 m around the area centre, so they
      // never look like duplicates of each other by accident.
      const angle = i * 2.4;
      const dist = 0.003 + (i % 5) * 0.001;
      [lat, lng] = [place.lat + Math.sin(angle) * dist, place.lng + Math.cos(angle) * dist];
    }

    const created = new Date(NOW - item.daysAgo * DAY - (i % 7) * 3600 * 1000);
    const reportCount = item.reportCount || 1;
    const doc = {
      _id: new mongoose.Types.ObjectId(),
      title: item.title,
      description: item.description,
      category,
      severity: item.severity,
      status: item.merged ? 'Merged' : item.status,
      location: { state: place.state, district: place.district, city: place.city, landmark: cluster ? cluster.landmark : item.landmark, lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) },
      imageUrls: item.image && PHOTOS[category] ? [PHOTOS[category]] : [],
      reporter: i % 3 === 0 ? { anonymous: false, name: ['Priya S.', 'Arjun K.', 'Fatima R.', 'Rahul M.', 'Lakshmi N.'][i % 5] } : { anonymous: true },
      upvotes: item.upvotes,
      reportCount,
      supporters: Array.from({ length: reportCount - 1 }, (_, k) => ({ voterHash: fakeHash(), note: k === 0 ? 'Same problem here, it is getting worse.' : '', date: at(created.getTime() + (k + 1) * DAY) })),
      flags: Array.from({ length: item.flags || 0 }, () => ({ voterHash: fakeHash(), reason: item.flagReason, date: at(created.getTime() + DAY) })),
      isHidden: (item.flags || 0) >= 3,
      reopenVotes: Array.from({ length: item.reopenVotes || 0 }, fakeHash),
      reopenCount: item.reopenCount || 0,
      comments: (item.comments || []).map((c) => ({ ...c, date: at(created.getTime() + DAY) })),
      statusHistory: buildHistory({ ...item, status: item.merged ? 'Merged' : item.status }, created),
      resolvedAt: item.status === 'Resolved' ? at(created.getTime() + item.resolvedAfter * DAY) : null,
      createdAt: created,
      updatedAt: created,
      _cluster: item.cluster,
      _master: item.master,
      _merged: item.merged
    };
    if (doc.status === 'In Progress') {
      doc.comments.push({ name: 'Municipal officer', text: 'The repair has been scheduled for this week.', official: true, date: at(created.getTime() + 2 * DAY) });
    }
    return doc;
  });

  // Complaint IDs follow the order the reports came in (oldest first).
  docs.sort((a, b) => a.createdAt - b.createdAt);
  docs.forEach((doc, i) => { doc.complaintId = `CF-2026-${String(i + 1).padStart(5, '0')}`; });

  // The already-merged cluster: duplicates point at the master issue.
  docs.filter((d) => d._master).forEach((master) => {
    docs.filter((d) => d._merged && d._cluster === master._cluster).forEach((dup) => {
      dup.duplicateOf = master._id;
      dup.statusHistory.push({ status: 'Merged', note: `Merged into ${master.complaintId}.`, date: at(dup.createdAt.getTime() + 2 * DAY) });
      master.mergedIssues = [...(master.mergedIssues || []), dup.complaintId];
      master.reportCount += dup.reportCount;
      master.upvotes += dup.upvotes;
      master.statusHistory.push({ status: master.status, note: `${dup.complaintId} was merged into this issue (same problem).`, date: at(dup.createdAt.getTime() + 2 * DAY) });
    });
  });

  docs.forEach((d) => {
    delete d._cluster;
    delete d._master;
    delete d._merged;
    d.priorityScore = priorityScore(d);
  });

  await Issue.insertMany(docs);
  await Counter.create({ _id: 'complaint-2026', seq: docs.length });

  const hidden = docs.filter((d) => d.isHidden).length;
  console.log(`Inserted ${docs.length} issues (${hidden} hidden by spam flags, ${docs.filter((d) => d.status === 'Merged').length} merged).`);
  console.log('Try: the 5 pothole reports near Green Park Bus Stop, RS Puram, Coimbatore.');
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
