# SRHP Backend

Express + PostgreSQL API for the Students Renewed Hope Project platform.
Built to match the frontend's `MOCK_*` data shapes and `NOTE:` comments
directly — wiring the frontend up to this is a `fetch()` swap, not a rewrite.

**Not yet tested against a live Postgres instance** — this environment has
no network access, so `npm install` and a real DB connection weren't
possible here. Every file passed `node -c` syntax checking and was reviewed
carefully, but run it against a real (even local) Postgres before deploying,
per the steps below.

## Local setup

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL (a local Postgres works fine) and JWT_SECRET
npm run migrate   # creates all tables
npm run seed      # real states, Akwa Ibom's 2 links, 6 real news items — no fake people
npm run create-super-admin -- "Your Name" "you@email.com" "a-real-password"
npm start
```

Then `curl http://localhost:8080/health` should return `{"status":"ok"}`.

## Deploying to Railway

1. Create a new Railway project, connect this repo (or `railway up` from this folder).
2. Add a **Postgres** plugin to the project — Railway auto-injects
   `DATABASE_URL` into your service's environment. You don't set it by hand.
3. In your service's Variables tab, set: `JWT_SECRET`, `CORS_ORIGIN` (your
   deployed frontend's real origin, not `*`), `FRONTEND_URL`,
   `RESEND_API_KEY`, `EMAIL_FROM`. Leave `DB_SSL` unset/false — Railway's
   internal Postgres connection doesn't need it.
4. Railway detects the `Dockerfile` automatically and builds from it — no
   extra config needed.
5. Once deployed, run the one-off setup commands against the live database
   using `railway run` (this runs the command locally but with your
   Railway service's environment variables injected, so it talks to the
   real database):
   ```bash
   railway run npm run migrate
   railway run npm run seed
   railway run npm run create-super-admin -- "Your Name" "you@email.com" "a-real-password"
   ```
6. Copy the public URL Railway gives your service, and paste it into the
   frontend's `js/api-config.js` as `API_BASE_URL`.

## Endpoint map — which frontend file each route replaces

| Endpoint | Frontend file(s) with the matching `NOTE:` |
|---|---|
| `POST /api/auth/register` | `register.js` |
| `POST /api/auth/login` | `login.js` (student portal) |
| `POST /api/admin/auth/login` | `admin/js/admin-login.js` |
| `GET /api/students/me` | `admin/js/dashboard.js` → `dashboard.js` (student portal) |
| `PATCH /api/students/me` | `profile.js` |
| `GET /api/states` | `mock-data.js`'s `MOCK_STATES` everywhere it's used |
| `GET /api/news` | `mock-data.js`'s `MOCK_NEWS`, `news.js`, homepage |
| `GET/POST/PATCH/DELETE /api/admin/news` | `admin/js/news-admin.js` |
| `POST /api/cards`, `POST /api/cards/:id/share` | `card.js` |
| `GET /api/admin/dashboard` | `admin/js/dashboard.js` |
| `GET /api/admin/students` | `admin/js/students.js` |
| `GET /api/admin/activity` | `admin/js/activity.js` |
| `GET /api/admin/cards/stats` | `admin/js/cards.js` |
| `GET /api/admin/admins` | `admin/js/admins.js` |
| `POST /api/contact` | `contact.js` |

For each, the frontend swap is the same shape: replace the `MOCK_*` /
`ADMIN_*` array reference with a `fetch()` call to the matching endpoint
above, and store the JWT from login responses (e.g. in a cookie, matching
how the mock `srhp_session`/`srhp_admin_session` cookies work today) so
`requireAuth()`/`requireAdminAuth()` can check it.

## Email

Welcome emails are real and wired in — `POST /api/auth/register` sends one
automatically after a successful registration, via
[Resend](https://resend.com) (free tier: 3,000 emails/month). No extra npm
dependency — `src/utils/email.js` calls Resend's HTTP API directly with
Node's built-in `fetch`.

**Setup:**
1. Sign up at resend.com, create an API key.
2. Set `RESEND_API_KEY` in your environment.
3. For immediate testing, leave `EMAIL_FROM` as the default
   `onboarding@resend.dev` — works with zero setup. Once you've verified
   `studentsrenewedhope.com.ng` in Resend's dashboard (a DNS record change),
   switch `EMAIL_FROM` to `hello@studentsrenewedhope.com.ng`.
4. Set `FRONTEND_URL` to your real deployed frontend URL — the welcome
   email's dashboard/card links are built from this.

**If `RESEND_API_KEY` isn't set**, registration still works completely
normally — `sendEmail()` logs a warning and skips sending rather than
failing the request. You'll see this in the logs until you add the key.

The actual copy lives in `src/utils/emailTemplates.js`, kept separate from
the route so editing the wording later doesn't mean touching registration
logic. It adapts based on whether the student's state has an active
community yet.

## What's deliberately not included yet
- **Forwarding the contact form to an inbox** — `POST /api/contact` stores
  submissions in the `contact_messages` table so they show up in the CRM,
  but doesn't yet also send a copy to hello@studentsrenewedhope.com.ng.
  Same `sendEmail()` utility used for welcome emails — a small addition
  whenever you want it.
- **Photo/card image upload to Cloud Storage** — `students.profile_photo_url`
  and `cards.image_url` are plain text columns ready to hold a Cloud Storage
  URL, but the actual upload flow (signed URLs or a proxy upload endpoint)
  isn't built yet.
- **Rate limiting / brute-force protection** on the login endpoints — worth
  adding (e.g. `express-rate-limit`) before this is public.
- **Refresh tokens** — JWTs are long-lived (30d students / 7d admins) with no
  refresh/rotation. Fine for now, worth revisiting for security hardening.

## Known frontend/backend gaps to close before wiring this up
The frontend was built before this backend existed, so a few things won't
line up on the first `fetch()` swap without small frontend changes too:

- **`register.html` has no password field.** `POST /api/auth/register`
  requires one to create real login credentials. Add a password field to
  the registration form (and a matching one to `login.html`) before wiring
  registration to this API — right now the student portal's login is a
  no-password demo, decoupled from registration.
- **`register.js`'s institution dropdown sends an array index** (from
  `MOCK_INSTITUTIONS`), not a real `institution_id`. The backend's
  `institutions` table needs to be seeded with real institution names per
  state (currently only 8 states have any in `mock-data.js`, and none are
  seeded here yet), and the frontend dropdown switched to use real IDs from
  `GET /api/states` or a new `GET /api/institutions?state_id=`.
- **`card.js`'s Ward/LGA fields** aren't yet on `register.html`/`profile.html`
  — only on the card generator. `cards.ward`/`cards.lga` exist as their own
  columns for that reason (so a card doesn't force a profile change), but if
  you want ward/LGA to persist to the student's profile too, add those
  fields to registration/profile and use `students.ward`/`students.lga`
  (already in the schema) instead.

None of these block getting the backend itself running — they're specifically
about the moment you connect this to the existing frontend forms.

## Data honesty note
`seed.js` intentionally seeds zero students and zero admin accounts —
only the real, known facts (37 states, Akwa Ibom's two real WhatsApp links,
6 real paraphrased news posts). Your own Super Admin account is the only
account that should exist until real people actually register or get
added — see `create-super-admin.js`.
