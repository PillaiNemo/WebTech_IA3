# CivicFix: MongoDB shell queries (Module 5)

Open the MongoDB shell in a terminal:

```
mongosh
```

Every command below works on the real CivicFix data after `npm run seed` (in `server/`).

## 1. Create / switch database and collection

```js
// Switches to the database (MongoDB creates it on the first insert).
use civicfix

// Creates a collection explicitly (Mongoose also creates "issues" for us).
db.createCollection("issues")

show dbs
show collections
```

## 2. Insert

```js
// One document
db.issues.insertOne({
  complaintId: "CF-2026-09001",
  title: "Broken streetlight near the school",
  description: "The streetlight outside the school gate has been off for a week.",
  category: "streetlight",
  severity: "Medium",
  status: "Reported",
  location: { state: "Kerala", district: "Ernakulam", city: "Kakkanad", landmark: "School gate", lat: 10.0159, lng: 76.3419 },
  upvotes: 0,
  reportCount: 1,
  isHidden: false,
  createdAt: new Date()
})

// Several documents at once
db.issues.insertMany([
  { complaintId: "CF-2026-09002", title: "Garbage near the bus stand", category: "garbage", status: "Reported", severity: "Low", upvotes: 2, location: { state: "Kerala", city: "Kakkanad" }, createdAt: new Date() },
  { complaintId: "CF-2026-09003", title: "Pothole on Infopark road", category: "pothole", status: "Reported", severity: "High", upvotes: 5, location: { state: "Kerala", city: "Kakkanad" }, createdAt: new Date() }
])
```

## 3. Find

```js
db.issues.find()                                  // everything
db.issues.find().limit(5).pretty()                // first five, formatted
db.issues.findOne({ complaintId: "CF-2026-00001" })
db.issues.find({ category: "pothole" })           // equality
db.issues.find({ "location.city": "RS Puram" })   // a field inside an embedded object
db.issues.countDocuments({ status: "Resolved" })
db.issues.find().sort({ upvotes: -1 }).limit(3)   // most upvoted
```

## 4. Query operators

```js
// $gt / $gte / $lt / $lte: comparisons
db.issues.find({ upvotes: { $gt: 30 } })

// $in: any of a list
db.issues.find({ status: { $in: ["Reported", "Acknowledged", "In Progress"] } })

// $regex: pattern matching ("i" = ignore case), the feed's search box
db.issues.find({ title: { $regex: "pothole", $options: "i" } })

// $and: every condition must hold
db.issues.find({ $and: [ { category: "garbage" }, { severity: "High" }, { upvotes: { $gte: 10 } } ] })

// $or: any condition may hold
db.issues.find({ $or: [ { severity: "Critical" }, { upvotes: { $gt: 50 } } ] })

// $ne and $exists
db.issues.find({ status: { $ne: "Merged" } })
db.issues.find({ "flags.0": { $exists: true } })    // issues with at least one spam flag

// The nearby (duplicate) box search: lat/lng between two values
db.issues.find({
  category: "pothole",
  "location.lat": { $gte: 11.0075, $lte: 11.0103 },
  "location.lng": { $gte: 76.9504, $lte: 76.9532 }
})
```

## 5. Projections (choose which fields come back)

```js
// 1 = include, 0 = exclude. _id is included unless excluded.
db.issues.find({ category: "pothole" }, { complaintId: 1, title: 1, status: 1, _id: 0 })

// Everything except the long and private fields
db.issues.find({}, { description: 0, upvoters: 0, supporters: 0, flags: 0 }).limit(3)
```

## 6. Update

```js
// Change one field
db.issues.updateOne({ complaintId: "CF-2026-09001" }, { $set: { status: "Acknowledged" } })

// Add to a number and push into an array at the same time
db.issues.updateOne(
  { complaintId: "CF-2026-09001" },
  { $inc: { upvotes: 1 }, $push: { statusHistory: { status: "Acknowledged", note: "Forwarded to ward office", date: new Date() } } }
)

// Update many: escalate every open issue older than 30 days
db.issues.updateMany(
  { status: { $in: ["Reported", "Acknowledged"] }, createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
  { $set: { severity: "High" } }
)
```

## 7. Delete

```js
db.issues.deleteOne({ complaintId: "CF-2026-09001" })
db.issues.deleteMany({ complaintId: { $in: ["CF-2026-09002", "CF-2026-09003"] } })
```

## 8. Aggregation (what GET /api/stats does)

```js
// Count issues per category, biggest first
db.issues.aggregate([
  { $match: { status: { $ne: "Merged" } } },
  { $group: { _id: "$category", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])

// Average days to resolve
db.issues.aggregate([
  { $match: { status: "Resolved" } },
  { $group: { _id: null, avgDays: { $avg: { $divide: [ { $subtract: ["$resolvedAt", "$createdAt"] }, 86400000 ] } } } }
])
```

## 9. Indexes

```js
db.issues.getIndexes()
db.issues.createIndex({ category: 1, status: 1 })
db.issues.createIndex({ "location.lat": 1, "location.lng": 1 })
// See that MongoDB uses the index instead of scanning every document:
db.issues.find({ category: "pothole", status: "Reported" }).explain("executionStats")
```
