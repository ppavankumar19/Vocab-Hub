# 📚 VocabHub — Daily Vocabulary Learning Platform

**VocabHub** is a full-stack web application where users build vocabulary daily, track learning streaks, and share words with the community. It includes Telugu transliteration support, a leaderboard, and a full admin panel.

Live stack: **Node.js + Express + PostgreSQL** | Frontend: **Vanilla JS / HTML5 / CSS3**

---

## ✨ Features

### 👤 User Features
- Register & login with email + password (JWT, HTTP-only cookies)
- Add vocabulary words: English word, meaning, example sentence, optional **Telugu meaning**
- **Telugu Transliteration** — type English phonetics, press `Space` to auto-convert to Telugu script (e.g. `naaku` → నాకు)
- Publish / unpublish words to the community dictionary
- Edit & delete your own words
- Daily **streak tracking** — add at least 1 word per day to keep it alive
- Leaderboard ranked by streak + total words
- Browse all published words with search

### 👑 Admin Features
- Role-based admin login
- View, edit, delete any word or user
- Analytics: visitor counts, guest sessions, online users
- Visitor logs with session ID, IP, user agent, timestamp

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                                                             │
│  index.html          user-login.html    admin-login.html    │
│  (Guest view)        (Auth page)        (Admin auth)        │
│                                                             │
│  dashboard.html                   admin-dashboard.html      │
│  (User workspace)                 (Admin control panel)     │
│                                                             │
│  All pages use Fetch API → HTTP cookies (JWT, httpOnly)     │
└───────────────────┬─────────────────────────────────────────┘
                    │ HTTP / REST
┌───────────────────▼─────────────────────────────────────────┐
│               EXPRESS SERVER  (server.js)                   │
│                                                             │
│  Middleware: cookie-parser · express.json · static files   │
│  Auth:       checkAuth() — JWT verify from cookie          │
│  Routes:     (see API reference below)                     │
└───────────────────┬─────────────────────────────────────────┘
                    │ pg Pool (node-postgres)
┌───────────────────▼─────────────────────────────────────────┐
│               POSTGRESQL DATABASE                           │
│                                                             │
│  users · words · visitor_logs · user_activity              │
│  site_analytics                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Frontend → Backend Flow

### Guest visits home page (`/`)
```
Browser → GET /
       ← index.html (static)

Browser → GET /api/words             (fetch published words)
       ← JSON array of words

Browser → POST /api/track-visitor    (analytics ping)
       ← { success: true }
```
Guest has a 10-minute timer. After expiry, a signup prompt appears.

---

### User registers & logs in
```
POST /api/register   { name, email, password, mobile? }
  ← { success: true, message }

POST /api/user/login  { email, password }
  ← Set-Cookie: token=<JWT>; HttpOnly
  ← { success: true, redirect: "/dashboard" }
```

---

### User dashboard load sequence
```
GET /dashboard        → checkAuth middleware → dashboard.html

(on DOMContentLoaded)
GET /api/profile      → streak, total words, user info
GET /api/mywords      → user's own word list
```

---

### Adding a word
```
POST /api/words   { word, meaning, sentence, telugu_meaning? }
  ← { success, id, streak, message }
```
Server recalculates streak after every word addition.

---

### Streak logic (server-side)
```
1. Fetch all distinct dates user added words (GROUP BY DATE)
2. Sort descending
3. If latest date is today OR yesterday → streak starts at 1
4. Walk backward: each consecutive day increments streak
5. Break on any gap > 1 day
```

---

### Admin flow
```
POST /api/admin/login   { email, password }
  ← Set-Cookie: token=<JWT role=admin>

GET  /api/admin/analytics  → visitor stats + user activity
GET  /api/admin/users      → all users
GET  /api/admin/words      → all words
PUT  /api/admin/words/:id  → edit any word
DELETE /api/admin/users/:id → remove user
```

---

### Logout (all roles)
```
POST /api/logout
  ← Clears token cookie (server-side, works for httpOnly cookies)
  ← { success: true }
```

---

## 🔤 Telugu Transliteration

VocabHub includes a **client-side** Telugu transliteration engine — no external API needed.

### How to use
1. In the "Add Word" or "Edit Word" form, click the **🔤 Enable Transliteration** button next to the Telugu Meaning field.
2. Type English phonetics (ITRANS-like scheme).
3. Press **Space** — the last typed word auto-converts to Telugu script.
4. Press Space again to continue typing the next word.

### Phonetic reference

| English | Telugu | English | Telugu |
|---------|--------|---------|--------|
| a       | అ      | aa / A  | ఆ      |
| i       | ఇ      | ii / ee | ఈ      |
| u       | ఉ      | uu / oo | ఊ      |
| e       | ఎ      | E / ae  | ఏ      |
| o       | ఒ      | O / oe  | ఓ      |
| ai      | ఐ      | au / ou | ఔ      |
| k       | క      | kh      | ఖ      |
| g       | గ      | gh      | ఘ      |
| ch      | చ      | jh      | ఝ      |
| t       | త      | th      | థ      |
| T       | ట      | Th      | ఠ      |
| d       | ద      | dh      | ధ      |
| D       | డ      | Dh      | ఢ      |
| p       | ప      | ph      | ఫ      |
| b       | బ      | bh      | భ      |
| n       | న      | N       | ణ      |
| sh      | శ      | Sh      | ష      |
| m       | మ      | y       | య      |
| r       | ర      | l       | ల      |
| L       | ళ      | v / w   | వ      |
| s       | స      | h       | హ      |
| M       | ం      | H       | ః      |
| ksh     | క్ష    |         |        |

### Examples
```
telugu   → తెలుగు
naaku    → నాకు
namasthe → నమస్థే
amma     → అమ్మ
paata    → పాత
illu     → ఇల్లు
```

> **Tip:** Consonant doubling automatically creates geminate (conjunct) forms: `ll` → ల్ల, `mm` → మ్మ

---

## 🛠️ Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Runtime    | Node.js ≥ 18                            |
| Framework  | Express 4.x                             |
| Database   | PostgreSQL (UTF-8, Unicode-safe)        |
| DB Client  | pg (node-postgres)                      |
| Auth       | jsonwebtoken + cookie-parser (httpOnly) |
| Security   | helmet, dotenv                          |
| Frontend   | Vanilla JS, HTML5, CSS3                 |
| Dev Tool   | nodemon                                 |

---

## 🗄️ Database Schema

### `users`
| Column        | Type      | Notes                    |
|---------------|-----------|--------------------------|
| id            | SERIAL PK |                          |
| name          | TEXT      | NOT NULL                 |
| email         | TEXT      | UNIQUE, NOT NULL         |
| mobile        | TEXT      |                          |
| password_hash | TEXT      | bcrypt hashed            |
| role          | TEXT      | `user` / `admin`         |
| created_at    | TIMESTAMP | default NOW()            |

### `words`
| Column         | Type         | Notes                    |
|----------------|--------------|--------------------------|
| id             | SERIAL PK    |                          |
| user_id        | INTEGER FK   | → users.id               |
| word           | TEXT         |                          |
| meaning        | TEXT         |                          |
| sentence       | TEXT         |                          |
| telugu_meaning | TEXT         | Unicode / Telugu script  |
| published      | BOOLEAN      | default FALSE            |
| created_at     | TIMESTAMP    | default NOW()            |

### `visitor_logs`
| Column           | Type      |
|------------------|-----------|
| id               | SERIAL PK |
| session_id       | TEXT UNIQUE |
| ip_address       | TEXT      |
| user_agent       | TEXT      |
| page_accessed    | TEXT      |
| visit_date       | TIMESTAMP |
| duration_seconds | INTEGER   |
| is_guest         | BOOLEAN   |
| user_id          | INTEGER (nullable) |

### `user_activity`
| Column        | Type             |
|---------------|------------------|
| id            | SERIAL PK        |
| user_id       | INTEGER UNIQUE FK |
| action        | TEXT             |
| last_login    | TIMESTAMP        |
| last_logout   | TIMESTAMP        |
| is_online     | BOOLEAN          |
| last_activity | TIMESTAMP        |

### `site_analytics`
| Column                  | Type          |
|-------------------------|---------------|
| id                      | SERIAL PK     |
| date                    | DATE UNIQUE   |
| total_visitors          | INTEGER       |
| unique_visitors         | INTEGER       |
| registered_users_online | INTEGER       |
| guest_sessions          | INTEGER       |

---

## 🔌 API Reference

| Method | Path                     | Auth       | Description                         |
|--------|--------------------------|------------|-------------------------------------|
| POST   | /api/register            | None       | Create new user account             |
| POST   | /api/user/login          | None       | Login → sets JWT cookie             |
| POST   | /api/admin/login         | None       | Admin login → sets JWT cookie       |
| POST   | /api/logout              | None       | Clears JWT cookie (server-side)     |
| GET    | /api/profile             | User/Admin | Get profile + streak + total words  |
| PUT    | /api/profile             | User/Admin | Update name, email, mobile          |
| PUT    | /api/password            | User/Admin | Change password                     |
| GET    | /api/words               | None       | All published words (public)        |
| GET    | /api/all-words           | User       | All words (auth required)           |
| GET    | /api/mywords             | User       | Current user's words                |
| POST   | /api/words               | User       | Add new word                        |
| PUT    | /api/words/:id           | User       | Edit own word                       |
| PUT    | /api/words/:id/publish   | User       | Toggle publish/unpublish            |
| DELETE | /api/words/:id           | User       | Delete own word                     |
| GET    | /api/leaderboard         | None       | Streak + word count rankings        |
| POST   | /api/track-visitor       | None       | Log visitor session                 |
| POST   | /api/user/activity       | User       | Log login/logout activity           |
| PUT    | /api/user/update-status  | User       | Heartbeat — update last_activity    |
| GET    | /api/admin/users         | Admin      | List all users                      |
| DELETE | /api/admin/users/:id     | Admin      | Delete user                         |
| GET    | /api/admin/words         | Admin      | List all words                      |
| PUT    | /api/admin/words/:id     | Admin      | Edit any word                       |
| DELETE | /api/admin/words/:id     | Admin      | Delete any word                     |
| GET    | /api/admin/analytics     | Admin      | Visitor stats + user activity       |
| GET    | /api/admin/visitors      | Admin      | Visitor log (optionally by date)    |

---

## 🔐 Authentication & Authorization

- JWT stored in **HTTP-only cookies** (7-day expiry)
- `checkAuth` middleware verifies token on every protected route
- Role-based access: `user` routes reject `admin` token and vice versa
- Ownership check on word update/delete: `user_id` must match JWT `id`

---

## ⚙️ Environment Variables (`backend/.env`)

```env
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=dailyword
PG_USER=postgres
PG_PASSWORD=your_password
JWT_SECRET=your_long_random_secret
PORT=3000
```

> `.env` is not committed — create it manually before running.

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Create .env with your PostgreSQL credentials (see above)

# 3. Create the PostgreSQL database and run the schema
createdb dailyword
psql dailyword < ../db/schema.sql

# 4. Start the server
node server.js
# or with hot-reload:
npx nodemon server.js
```

Access:
- Home: `http://localhost:3000`
- User Login: `http://localhost:3000/user-login`
- Admin Login: `http://localhost:3000/admin-login`

Default admin credentials are configured via environment variables (`ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env`).
> ⚠️ Set strong credentials before deploying.

---

## 🌍 Deployment (Render.com)

1. Push repo to GitHub
2. Create a **PostgreSQL** service on Render; copy the internal connection string
3. Create a **Web Service** pointing to the repo
4. Set **Root Directory** to `backend`
5. Set **Start Command** to `node server.js`
6. Add environment variables in the Render dashboard
7. Render builds & deploys automatically on push

---

## ⚠️ Known Issues & Security Notes

| Issue | Severity | Notes |
|-------|----------|-------|
| Legacy plain-text passwords | Low | Auto-upgraded to bcrypt on next login. New signups use bcrypt. |
| No rate limiting on auth routes | Medium | Add `express-rate-limit` to `/api/register` and `/api/user/login` |
| No HTTPS enforcement | Low | Render provides TLS; ensure HTTP→HTTPS redirect is on |

---

## 📁 Project Structure

```
Vocab-Hub/
├── backend/
│   ├── server.js          Express app + all API routes
│   ├── pgdb.js            PostgreSQL connection pool
│   ├── package.json
│   └── .env               (NOT committed)
├── db/
│   └── schema.sql         PostgreSQL table definitions
├── public/
│   ├── index.html         Landing page (guest, 10-min session)
│   ├── user-login.html    Register / Login page
│   ├── admin-login.html   Admin-only login
│   ├── dashboard.html     User workspace (words, streaks, leaderboard)
│   └── admin-dashboard.html  Admin panel
├── migrate_unicode.py     SQLite → PostgreSQL migration helper
├── .gitignore
└── README.md
```
