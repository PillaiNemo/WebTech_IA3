# CivicFix viva cheat-sheet

Short answers you can say aloud, with the exact files to open if the examiner asks "show me".

---

## Where each syllabus module is used

### Module 1: HTML, CSS and Bootstrap
**Say:** "The static pages are plain HTML5 with semantic tags: header, nav built from a `<ul>`, main, section, aside, footer, tables with captions, forms, `<video>` with captions, `<audio>` and an `<iframe>` map. One shared CSS file uses variables, gradients, the box model and position: sticky / absolute / fixed, on top of a heavily restyled Bootstrap 5."

**Show:**
- `static/about.html`: table, video with `<track>`, sticky table of contents
- `static/how-it-works.html`: audio
- `static/contact.html`: form, iframe
- `static/css/civicfix.css`: tokens, Bootstrap overrides
- `static/css/pages.css`: gradients, box model, position

### Module 2: JavaScript and JSON
**Say:** "Vanilla JavaScript handles events and the DOM: form validation, the typewriter effect, the preloader, scroll reveals with IntersectionObserver, the theme toggle and the scroll progress bar. JSON files hold the categories, the states/districts/areas, the sample data and the English and Hindi strings."

**Show:**
- `static/js/civicfix-ui.js`: typewriter, reveal, theme
- `static/js/contact.js`: validation rules
- `client/src/utils/reportValidation.js`
- `client/src/data/*.json`, `client/src/data/i18n/hi.json`

### Module 3: jQuery
**Say:** "On the static pages jQuery reads form fields with `.val()` and `.prop()`, finds things with `.closest()`, `.find()` and `.filter()`, changes the page with `.text()`, `.prepend()`, `.addClass()` and `.remove()`, and animates with `fadeIn`, `slideToggle`, `slideDown` and `.animate()`. Inside React, jQuery runs through `useRef` and `useEffect` for the FAQ accordion, the counters and the toasts."

**Show:**
- `static/js/civicfix-jquery.js`: `$.cfToast`, `.cfCountUp`, `.cfAccordion`
- `static/how-it-works.html`: `.animate` merge demo
- `client/src/components/Counter.jsx`

### Module 4: React
**Say:** "The whole main site is React with React Router. It uses components and props, `React.memo` on IssueCard, conditional rendering (loading, empty and error states), list rendering with keys, and controlled forms in the report flow. The hooks are `useState`, `useEffect`, `useRef`, `useContext` (language, theme), `useMemo` and `useCallback`, plus my own: useTypewriter, useInView, useReveal and useLandingData."

**Show:**
- `client/src/App.jsx`: routes
- `client/src/components/IssueCard.jsx`: memo
- `client/src/pages/Report.jsx`: step machine
- `client/src/components/Layout.jsx`: context

### Module 5: MongoDB
**Say:** "Issues are documents in an `issues` collection. Location, supporters, flags, comments and status history are embedded. Mongoose schemas validate them, and indexes on category+status, lat+lng and createdAt make queries fast. The dashboard uses aggregation pipelines."

**Show:**
- `database/queries.md`: create, insert, find, update, delete, `$gt`, `$in`, `$regex`, `$and`, projections
- `server/models/Issue.js`
- `server/routes/stats.js`

### Module 6: Node.js and Express
**Say:** "Express serves a REST API with routers, middleware and one central error handler. The code uses async/await with try/catch, and also callbacks: `fs.mkdir`, `fs.readFile` and `fs.unlink`. Photos are written to disk with `fs.promises.writeFile`. My own modules handle rate limiting, admin sessions with the crypto module, duplicate detection and validation."

**Show:**
- `server/server.js`
- `server/routes/issues.js`
- `server/middleware/errorHandler.js`
- `server/utils/images.js`
- `server/middleware/rateLimiter.js`

---

## The key ideas in plain English

### How the home page animates
"The home page is ordinary scrolling, kept calm on purpose. When a section comes into view, an IntersectionObserver adds a class and CSS fades it up; items in a row get a small delay each, so they appear one after another. The numbers count up with jQuery's `.animate()` the first time the stats bar is seen."

### IntersectionObserver
"Instead of checking the scroll position on every scroll event, I ask the browser to tell me when an element enters the screen. That is cheaper and smoother. useInView and useReveal are React hooks around it."

### The typewriter effect
"A `setTimeout` loop adds one character every 45 milliseconds to an empty span. An invisible copy of the full sentence sits in the same spot, so the layout never jumps. Screen readers get the full sentence once from a visually hidden copy, never letter by letter, and with reduced motion the text just appears."

### Haversine distance
"The Earth is a sphere, so the straight-line formula is wrong for map points. Haversine turns the difference in latitude and longitude into the angle between the two points, then multiplies by the Earth's radius (6,371 km) to get metres. I first ask MongoDB for a small lat/lng box around the point, which the index makes fast, then use Haversine to keep only reports within 150 m."
File: `server/utils/duplicates.js` (`NEARBY_RADIUS_M = 150`)

### The priority score
"Priority = reports × 3 + upvotes + days ignored + severity weight (Low 2, Medium 5, High 10, Critical 20). Many reporters weigh most, every 'Me too' counts, waiting raises it every day, and dangerous problems start higher. For example, 5 reports, 41 upvotes, 23 days and High gives 15 + 41 + 23 + 10 = 89."
File: `server/utils/issueRules.js` (same rule in `client/src/utils/issueMath.js`)

### The voter hash (one vote per person, no accounts)
"The browser creates a random ID once with `crypto.randomUUID()` and keeps it in localStorage. With each vote the server joins it to the IP address and stores only the SHA-256 hash. The same person always gives the same hash, so a second vote is refused, and nobody can turn the hash back into the token or the IP."
Files: `client/src/utils/voter.js`, `server/utils/voter.js`

### Duplicates and merging
"Before you submit, the app looks for open issues of the same category within 150 m; without GPS it uses the same area and shared words. You can add your support (the report count goes up, no new issue) or say yours is different. The server checks again and answers 409 if you skipped it. Admins can merge two reports: the duplicate becomes 'Merged', its supporters, photos and comments move to the main issue, and tracking the old ID points to the new one."

### Spam and abuse control
"I use four layers:
- **Honeypot:** a hidden field that only bots fill in.
- **Rate limiter:** written by hand in memory; 5 reports and 30 actions per hour per IP, otherwise a 429.
- **Blocked words:** a JSON list, matched on whole words only.
- **Flags:** three flags from different people hide an issue until an admin restores or deletes it."

### Admin login
"The passcode lives only in `server/.env`. The server compares it with `crypto.timingSafeEqual`, then creates a random 32-byte token with `crypto.randomBytes`. The browser sends it back in the Authorization header, and middleware checks it and its 8-hour expiry before any admin route runs."

---

## Likely questions

| Question | Short answer |
| --- | --- |
| Why Vite? | It is only the build tool that compiles JSX and runs the dev server. It proxies `/api` to Express so there is no CORS. |
| Why is the photo base64? | It keeps one simple JSON request without extra libraries (no multer). The server decodes it, checks the size (3 MB) and the real file signature, and writes it with fs. |
| What happens if MongoDB is down? | The server keeps running, retries every 5 seconds and shows the state on its status page. The home page falls back to the sample data in `landing.json`. |
| How is the site accessible? | Semantic HTML, labels on every field, visible focus rings, a skip link, aria-live messages, a focus-trapped mobile menu and modals, alt text, enough contrast in both themes, and reduced-motion support. |
| How does Hindi work? | Every interface string has a key in `en.json` and `hi.json`; `t('nav.home')` picks the current language from AppContext, and the choice is saved in localStorage. |
| Why embed comments instead of a separate collection? | They are always read with their issue and never on their own, so one document is simpler and faster. |
