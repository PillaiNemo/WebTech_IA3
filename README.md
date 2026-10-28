# CivicFix

A civic issue reporting and tracking platform for India. Citizens report local problems (potholes, garbage, broken streetlights, water leaks, sewage overflow, open manholes, stray animals and more) and track them publicly until they are fixed. Many reports of the same problem become **one strong issue** instead of a pile of duplicates.

College Web Technology project, built strictly with the syllabus stack: HTML5, CSS3, Bootstrap 5, vanilla JavaScript, JSON, jQuery, React (Vite as the build tool only), MongoDB with Mongoose, Node.js and Express. No other libraries.

For the viva, read [`docs/viva-cheatsheet.md`](docs/viva-cheatsheet.md).

---

## 1. Requirements

- **Node.js 20.12 or newer** (the server uses the built-in `process.loadEnvFile`, so no `dotenv` package is needed)
- **MongoDB Community Server** running locally on port 27017 (on Windows it runs as the "MongoDB" service)
- An internet connection for Google Fonts, the Bootstrap/jQuery CDN on the static pages, and the OpenStreetMap embeds

## 2. Setup (first time)

```
cd civicfix/server
npm install
npm run seed
```

`npm run seed` empties the database and adds 52 realistic sample issues across 10 states, including:
- 6 duplicate clusters (for example 5 reports of the same pothole near Green Park Bus Stop, RS Puram, Coimbatore), one of them already merged
- 2 spam reports hidden by flags, and 1 with a single flag
- escalated issues (open more than 30 days), resolved issues, one reopened issue and one resolved issue with 2 of the 3 "Still not fixed" votes

```
cd ../client
npm install
```

## 3. Run it

Open **two terminals**.

| Terminal | Commands | Then open |
| --- | --- | --- |
| 1: API | `cd civicfix/server` then `npm start` | http://localhost:5000 (status page), http://localhost:5000/api-playground.html |
| 2: Website | `cd civicfix/client` then `npm run dev` | http://localhost:5173 |

The static pages open by double-clicking `static/about.html`, `static/how-it-works.html`, `static/contact.html` or `static/style-guide.html`. They are also served at http://localhost:5173/static/about.html while both servers run.

## 4. Configuration

`server/.env` (copy from `server/.env.example`):

| Key | Purpose |
| --- | --- |
| `PORT` | API port (default 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `ADMIN_PASSCODE` | Passcode for `/admin`. The demo value is `CivicFix@2026`. **Change it before any real deployment.** It is only ever checked on the server and never appears in client code. |
| `NODE_ENV` | `development` or `production` (production hides internal error details) |

## 5. Folder structure

```
civicfix/
  client/                React app (Vite)
    public/images/       illustrations and photos used across the site
    src/
      App.jsx            routes
      components/        Layout, UtilityBar (accessibility bar), SiteNav (header), SideNav, MenuOverlay,
                         Logo, Preloader, SiteFooter, IssueCard (React.memo), Counter (jQuery), StatusTimeline,
                         Modal, PhotoPicker, LocationPicker, MapEmbed, States, Icon
      pages/             Landing (+ home/: hero, service tiles, numbers, recent issues, how it works, banner),
                         Explore, IssueDetail, Track, Impact, Report (+ report/), Admin, NotFound
      hooks/             useTypewriter, useInView, useReveal, useLandingData, useClock, useT
      context/           AppContext (preloader, language, theme)
      data/              categories.json, locations.json, landing.json, i18n/en.json, i18n/hi.json, navLinks.js
      utils/             issueMath, reportValidation, geo, voter, files, toast
      services/api.js    fetch helpers
      lib/               bridges to the shared jQuery plugins and CivicUI helpers
  server/
    server.js            Express app
    seed.js              npm run seed
    config/db.js         MongoDB connection with retry
    models/              Issue, Counter
    routes/              health, issues, track, stats, admin
    middleware/          errorHandler, rateLimiter, adminAuth
    utils/               duplicates (150 m + Haversine), issueRules (priority), validate, text (spam words),
                         voter (SHA-256 hash), images (fs)
    data/blocked-words.json
    public/              status page + API playground
    uploads/             photos people upload
  static/                Module 1-3 pages: about, how-it-works, contact, style-guide (+ css/, js/, images/, media/)
  database/              queries.md (mongosh commands), seed-issues.json
  docs/viva-cheatsheet.md
```

## 6. REST API

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/api/health` | Server and database status |
| GET | `/api/issues` | Feed. Query: `state, district, category, status, severity, q, sort (newest, upvotes, unresolved, priority), page, limit` |
| GET | `/api/issues/nearby` | Possible duplicates. Query: `lat, lng, category` or `state, district, city, category, text` |
| GET | `/api/issues/:id` | One issue (complaint ID or database ID) |
| POST | `/api/issues` | New report. Returns **409 with matches** when a close duplicate exists, unless `confirmedNotDuplicate: true` |
| POST | `/api/issues/:id/upvote` | "Me too" (one per person) |
| POST | `/api/issues/:id/comments` | Add a comment |
| POST | `/api/issues/:id/support` | "Add my support": reportCount + 1, optional note and photo |
| POST | `/api/issues/:id/flag` | Spam / fake flag; 3 flags hide the issue |
| POST | `/api/issues/:id/not-fixed` | "Still not fixed"; 3 votes reopen a resolved issue |
| GET | `/api/track/:complaintId` | Timeline; merged complaints include `mergedInto` |
| GET | `/api/stats` | Dashboard numbers (aggregation pipelines) |
| POST | `/api/admin/login` | Body `{ passcode }`, returns a session token |
| GET | `/api/admin/issues` | All issues incl. hidden and merged (admin) |
| PATCH | `/api/admin/issues/:id/status` | Body `{ status, note }` (admin) |
| PATCH | `/api/admin/issues/:id/merge` | Body `{ masterId }` (admin) |
| GET | `/api/admin/flagged` | The flagged queue (admin) |
| PATCH | `/api/admin/issues/:id/restore` | Unhide and clear flags (admin) |
| DELETE | `/api/admin/issues/:id` | Delete an issue and its uploaded photos (admin) |

Errors always look like `{ "error": true, "status": 400, "message": "..." }`. Limits: 5 new reports and 30 upvotes/comments/support/flags per hour per IP (429 with a friendly message).

## 7. Test script (try these in order)

1. **Home** (http://localhost:5173): the preloader counts to 100%, the headline types itself, the numbers count up, and the three recent issues show real photos.
2. **Accessibility bar** (the dark strip at the top): press **हिन्दी** and the interface switches to Hindi, **English** to switch back. **A− / A / A+** change the text size (remembered after a reload). The sun switches to dark mode. The search box in the header opens Explore with that search.
3. **Explore**: choose *Sort: Highest priority*. The Gurugram drain cover (58 days, Escalated) is near the top. Search "garbage". Click a heart to upvote; clicking it again says you are already counted.
4. **Duplicate check**: **Report an Issue** → *Pothole* → title "Pothole near the bus stop", any 20-character description → Location *Tamil Nadu / Coimbatore / RS Puram*, landmark "Green Park bus stop" → **Next**. *Similar issues near you* appears with **5 matches**.
5. Either press **This is the same issue, add my support** (the success screen says the issue is now reported by more people), or **Mine is different, continue** → Review → **Submit Complaint** → the success screen with a CF-2026-000xx ID and a **Copy** button.
6. **Track**: press *Track Complaint* on the success screen. Then track a merged complaint: open **Admin → Merged**, copy an ID, and track it. It says "This was merged into CF-2026-000xx".
7. **Issue page**: "Me too", "Add my support" (with an optional photo), a comment, and "Report as spam" (three different browsers or the API playground's *New voter* button hide it).
8. **Still not fixed**: open the resolved issue "Streetlight repaired but off again" (Gachibowli). It already has 2 of 3 votes; one more reopens it with a *Reopened* badge.
9. **Impact**: totals, the resolution ring, top categories, most-ignored districts and the leaderboard.
10. **Admin** (http://localhost:5173/admin, passcode `CivicFix@2026`):
    - **Dashboard:** the summary line and five overview numbers (open, awaiting first response, escalated, flagged, resolved in 30 days). Click one to open that list. *Needs attention* lists the highest-priority open issues with the reasons (escalated, critical, no response for N days, many reports). *Status pipeline* and *Possible duplicates* sit on the right.
    - **Update:** press *Update* (in *Needs attention* or on a table row). The panel shows the issue's facts and last note. Pick a *Quick note* or write one, then press *Save Update*. The note appears on the issue page as an official comment.
    - **Find:** search by ID, title or area, show only escalated issues or those with no update in 7+ days, and sort by priority, oldest or newest.
    - **Flagged:** restore or delete the spam reports.
    - **Merge duplicates:** press *Compare* on "5 roads reports, RS Puram" (or pick two reports yourself), compare them side by side, then *Confirm merge*.
11. **API playground** (http://localhost:5000/api-playground.html): a button for every endpoint, including the photo upload test and *Try to report a duplicate* (409 with matches).
12. **Static pages**:
    - **About:** play the video.
    - **How it works:** press *Merge them* (jQuery animate), play the chime, and open the FAQ.
    - **Contact:** submit the form empty to see the validation, then send a valid message.
13. **Accessibility**:
    - **Keyboard:** Tab through any page; every control shows a maroon focus ring. "Skip to content" appears first.
    - **Mobile menu:** at phone width the side navigation slides in from the left, Tab stays inside it, and Escape closes it. On the static pages the same menu is a Bootstrap offcanvas.
    - **Reduced motion:** turn on "reduce motion" in your OS (Windows: Settings → Accessibility → Visual effects → Animation effects off) and reload. There is no typing, fading or counting.

## 8. Screenshot checklist (for the report)

- Home page (top, How It Works, Recent Issues, green banner)
- Home page in Hindi and in dark mode
- Explore with filters, and the mobile layout
- Report flow: Category, Details (with photo preview), Location (map), Similar issues (5 matches), Review, Success
- Track: a normal timeline and a merged complaint
- Issue details with comments and the map
- Impact dashboard
- Admin: login, status table with the Update panel, Flagged queue, Merge duplicates
- API playground showing the 409 duplicate response
- Static pages: About (video), How it works (merge demo, audio, FAQ), Contact (validation errors), Style guide
- MongoDB shell running a query from `database/queries.md`

## 9. Known limits (honest notes)

- The illustrations in `client/public/images` are 442–602 px wide, so the hero map looks slightly soft on very large screens.
- Admin sessions and rate-limit counters live in memory, so restarting the server logs the admin out and resets the counters (fine for a demo; a real deployment would store them).
- One vote per person relies on a browser token plus the IP address. Clearing browser storage and changing network would allow a second vote; this is a reasonable deterrent without accounts, not a guarantee.
- The video and the chime in `static/media` were generated for this project (a canvas animation and a synthesised tone), so there are no copyright issues.
