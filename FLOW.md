# VocabHub — Process Flow & Data Flow

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Process Flows](#process-flows)
   - [Guest User Flow](#guest-user-flow)
   - [User Registration Flow](#user-registration-flow)
   - [User Login Flow](#user-login-flow)
   - [Add Word Flow](#add-word-flow)
   - [Admin Login Flow](#admin-login-flow)
   - [Leaderboard Flow](#leaderboard-flow)
3. [Data Flow Diagrams](#data-flow-diagrams)
   - [Request/Response Cycle](#requestresponse-cycle)
   - [Authentication Data Flow](#authentication-data-flow)
   - [Word Management Data Flow](#word-management-data-flow)
   - [Analytics Data Flow](#analytics-data-flow)
4. [Database Entity Relationships](#database-entity-relationships)
5. [API Reference](#api-reference)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                     │
│  index.html  │  user-login.html  │  dashboard.html          │
│  admin-login.html  │  admin-dashboard.html                  │
│                  (Vanilla JS + HTML5 + CSS3)                │
└────────────────────────┬────────────────────────────────────┘
                         │  HTTP / Fetch API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXPRESS SERVER (Node.js)                  │
│  backend/server.js — Port 3000                               │
│  Middleware: express.json, cookie-parser, helmet, dotenv    │
│  Auth: JWT in HTTP-only cookies                             │
│  Static: serves /public directory                           │
└────────────────────────┬────────────────────────────────────┘
                         │  node-postgres (pg)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   POSTGRESQL DATABASE                        │
│  Tables: users, words, visitor_logs, user_activity,         │
│          site_analytics                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Process Flows

### Guest User Flow

```
User visits "/"
      │
      ▼
index.html loads
      │
      ├─► initSession() — saves visit start time in localStorage
      ├─► trackVisitor() — POST /api/track-visitor (logs IP, user-agent)
      ├─► loadWords() — GET /api/words (public, no auth)
      │         │
      │         └─► Renders published word cards in grid
      │
      ▼
10-minute countdown timer starts
      │
      ├─► Timer still running: user browses freely
      │
      └─► Timer expires (10 min)
                │
                ▼
          Blur overlay appears with signup prompt
                │
                ├─► User clicks "Sign Up" → /user-login
                └─► User clicks "Reset Timer" → resets 10 min, continues browsing
```

---

### User Registration Flow

```
User fills signup form (name, email, password, optional mobile)
      │
      ▼
POST /api/register
      │
      ├─► Validate: name, email, password required
      ├─► bcrypt.hash(password, 10) — hash password
      ├─► INSERT INTO users (name, email, mobile, password_hash, role='user')
      │
      ├─► Success → { success: true, message: "Signup successful! Login now." }
      │         └─► Frontend shows success, toggles to login form
      │
      └─► Error (duplicate email) → { error: "Signup failed. Try again." }
                └─► Frontend shows error message
```

---

### User Login Flow

```
User submits email + password
      │
      ▼
POST /api/user/login
      │
      ├─► SELECT * FROM users WHERE email = $1 AND role = 'user'
      │
      ├─► User not found → 401 "User not found"
      │
      ├─► User found:
      │       │
      │       ├─► password_hash starts with "$2" (bcrypt)?
      │       │       └─► bcrypt.compare(password, hash)
      │       │
      │       └─► Legacy plain-text password?
      │               ├─► Compare directly
      │               └─► On match: auto-upgrade to bcrypt hash in DB
      │
      ├─► Password wrong → 401 "Wrong password"
      │
      └─► Password correct:
              │
              ├─► jwt.sign({ id, email, role:'user', name }, JWT_SECRET, { expiresIn:'7d' })
              ├─► res.cookie("token", token, { httpOnly: true, maxAge: 7d })
              ├─► UPSERT INTO user_activity (last_login, is_online=TRUE)
              └─► { success: true, redirect: "/dashboard" }
                        └─► Browser navigates to /dashboard
```

---

### Add Word Flow

```
User fills word form (word, meaning, sentence, optional Telugu meaning)
      │
      ├─► Client-side Telugu transliteration engine (if phonetic input)
      │       └─► Converts ITRANS-like phonetic → Telugu Unicode script
      │
      ▼
POST /api/words  (requires JWT cookie)
      │
      ├─► checkAuth middleware:
      │       ├─► Read token from cookie
      │       ├─► jwt.verify(token, JWT_SECRET)
      │       └─► Attach decoded user to req.user
      │
      ├─► Validate: word, meaning, sentence required
      │
      ├─► INSERT INTO words (user_id, word, meaning, sentence, telugu_meaning, published=FALSE)
      │
      ├─► Recalculate streak:
      │       ├─► SELECT DATE(created_at) FROM words WHERE user_id GROUP BY date ORDER BY date DESC
      │       ├─► Check if latest date is today or yesterday
      │       └─► Walk backward counting consecutive days
      │
      └─► { success: true, id, streak, message: "Word added! 🔥 Streak: N day(s)" }
                └─► Dashboard updates streak display + word list
```

---

### Admin Login Flow

```
Admin submits email + password
      │
      ▼
POST /api/admin/login
      │
      ├─► Compare email to process.env.ADMIN_EMAIL (default: admin@dailyword.com)
      ├─► Compare password to process.env.ADMIN_PASSWORD (default: admin123)
      │
      ├─► Mismatch → 401 "Invalid credentials"
      │
      └─► Match:
              ├─► jwt.sign({ id:1, email, role:'admin', name:'Admin' }, JWT_SECRET)
              ├─► res.cookie("token", token, { httpOnly: true })
              └─► { success: true, redirect: "/admin-dashboard" }
                        └─► Browser navigates to /admin-dashboard
```

---

### Leaderboard Flow

```
GET /api/leaderboard  (public, no auth)
      │
      ├─► SELECT id, name FROM users WHERE role='user'
      │
      ├─► For each user (serial):
      │       ├─► SELECT DATE(created_at) GROUP BY date ORDER BY date DESC
      │       ├─► calculateStreakFromDates(dates)
      │       └─► SELECT COUNT(*) AS total_words FROM words WHERE user_id
      │
      ├─► Sort results: streak DESC → total_words DESC → name ASC
      ├─► Assign rank numbers
      └─► Return ranked array
```

---

## Data Flow Diagrams

### Request/Response Cycle

```
Browser                    Express Server                  PostgreSQL
   │                             │                              │
   │── GET /dashboard ──────────►│                              │
   │                             │── checkAuth (read cookie) ──►│
   │                             │◄─ JWT decoded (user context) │
   │◄─ 200 dashboard.html ───────│                              │
   │                             │                              │
   │── GET /api/profile ────────►│                              │
   │   (cookie: token=JWT)       │── SELECT users + words ─────►│
   │                             │◄─ user + streak data ────────│
   │◄─ { name, streak, ... } ───│                              │
```

---

### Authentication Data Flow

```
┌──────────────┐     POST /api/user/login      ┌──────────────┐
│   Browser    │ ─────────────────────────────► │    Server    │
│              │   { email, password }           │              │
│              │                                 │  1. Query DB │
│              │                                 │  2. bcrypt   │
│              │                                 │     compare  │
│              │                                 │  3. Sign JWT │
│              │ ◄───────────────────────────── │              │
│  Stores JWT  │   Set-Cookie: token=<JWT>       │              │
│  in HTTP-only│   { success, redirect }         │              │
│  cookie      │                                 │              │
└──────────────┘                                 └──────────────┘

Subsequent Authenticated Requests:
┌──────────────┐     GET /api/profile           ┌──────────────┐
│   Browser    │ ─────────────────────────────► │    Server    │
│              │   Cookie: token=<JWT>           │              │
│              │                                 │  checkAuth:  │
│              │                                 │  jwt.verify  │
│              │                                 │  → req.user  │
│              │ ◄───────────────────────────── │              │
│              │   { id, name, streak, ... }     │              │
└──────────────┘                                 └──────────────┘
```

---

### Word Management Data Flow

```
                         ┌─────────────┐
                         │  User Form  │
                         └──────┬──────┘
                                │ POST /api/words
                                ▼
                    ┌───────────────────────┐
                    │  checkAuth middleware  │
                    │  (verify JWT cookie)  │
                    └───────────┬───────────┘
                                │ req.user attached
                                ▼
                    ┌───────────────────────┐
                    │   INSERT INTO words   │
                    │   (user_id from JWT)  │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Streak Recalculation │
                    │  SELECT DATE(created) │
                    │  GROUP BY date        │
                    │  Walk consecutive days│
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Response to client   │
                    │  { streak, message }  │
                    └───────────────────────┘

Publish Toggle:
PUT /api/words/:id/publish
   │
   ├─► Verify word belongs to req.user.id
   └─► UPDATE words SET published = $1 WHERE id = $2
```

---

### Analytics Data Flow

```
┌───────────────────────────────────────────────────────────┐
│                      Data Collection                       │
│                                                           │
│  Any page load ──► POST /api/track-visitor                │
│                         └─► INSERT INTO visitor_logs      │
│                              (session_id, ip, user_agent) │
│                                                           │
│  User login ────► UPSERT INTO user_activity               │
│                         (last_login, is_online=TRUE)       │
│                                                           │
│  Dashboard open ► POST /api/user/activity { action }      │
│  (heartbeat)    ► PUT  /api/user/update-status             │
│                         (last_activity = NOW())            │
│  User logout ───► POST /api/user/activity { logout }      │
│                         (is_online=FALSE, last_logout)     │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│                      Admin Reads                           │
│                                                           │
│  GET /api/admin/analytics                                 │
│     ├─► COUNT DISTINCT session_id FROM visitor_logs       │
│     │     WHERE visit_date >= NOW() - 1 day               │
│     └─► JOIN users + user_activity WHERE role='user'      │
│                                                           │
│  GET /api/admin/visitors?date=YYYY-MM-DD                  │
│     └─► SELECT * FROM visitor_logs                        │
│           LEFT JOIN users ON user_id                      │
│           WHERE DATE(visit_date) = filter                 │
│           ORDER BY visit_date DESC LIMIT 200              │
└───────────────────────────────────────────────────────────┘
```

---

## Database Entity Relationships

```
┌──────────────────┐          ┌──────────────────┐
│      users       │          │      words        │
│──────────────────│          │──────────────────│
│ id (PK)         │◄─────────│ user_id (FK)      │
│ name            │   1 : N  │ id (PK)           │
│ email (UNIQUE)  │          │ word              │
│ mobile          │          │ meaning           │
│ password_hash   │          │ sentence          │
│ role            │          │ telugu_meaning    │
│ created_at      │          │ published         │
└──────────────────┘          │ created_at        │
        │                     └──────────────────┘
        │ 1:1
        ▼
┌──────────────────┐          ┌──────────────────┐
│  user_activity   │          │  visitor_logs     │
│──────────────────│          │──────────────────│
│ id (PK)         │          │ id (PK)           │
│ user_id (UNIQUE)│          │ session_id (UNIQ) │
│ action          │          │ ip_address        │
│ last_login      │          │ user_agent        │
│ last_logout     │          │ page_accessed     │
│ is_online       │          │ visit_date        │
│ last_activity   │          │ duration_seconds  │
└──────────────────┘          │ is_guest          │
                              │ user_id (FK,null) │
                              └──────────────────┘

┌──────────────────┐
│  site_analytics  │
│──────────────────│
│ id (PK)         │
│ date (UNIQUE)   │
│ total_visitors  │
│ unique_visitors │
│ reg_users_online│
│ guest_sessions  │
└──────────────────┘
```

---

## API Reference

### Public Endpoints (No Auth)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Guest landing page |
| GET | `/user-login` | User auth page |
| GET | `/admin-login` | Admin auth page |
| POST | `/api/register` | Register new user |
| POST | `/api/user/login` | User login → sets JWT cookie |
| POST | `/api/admin/login` | Admin login → sets JWT cookie |
| POST | `/api/logout` | Clear JWT cookie |
| GET | `/api/words` | Get all published words |
| GET | `/api/leaderboard` | Ranked users by streak + word count |
| POST | `/api/track-visitor` | Log visitor session |

### Authenticated User Endpoints (JWT required, role: user)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/dashboard` | User workspace page |
| GET | `/api/profile` | Get profile + streak + word count |
| PUT | `/api/profile` | Update name, email, mobile |
| PUT | `/api/password` | Change password |
| GET | `/api/mywords` | Get user's own words |
| GET | `/api/all-words` | Get all words (auth required) |
| POST | `/api/words` | Add new word |
| PUT | `/api/words/:id` | Edit own word |
| PUT | `/api/words/:id/publish` | Toggle publish/unpublish |
| DELETE | `/api/words/:id` | Delete own word |
| POST | `/api/user/activity` | Log login/logout event |
| PUT | `/api/user/update-status` | Heartbeat — update last_activity |

### Admin Endpoints (JWT required, role: admin)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin-dashboard` | Admin panel page |
| GET | `/api/admin/users` | List all users |
| DELETE | `/api/admin/users/:id` | Delete a user |
| GET | `/api/admin/words` | List all words |
| PUT | `/api/admin/words/:id` | Edit any word |
| DELETE | `/api/admin/words/:id` | Delete any word |
| GET | `/api/admin/analytics` | Visitor stats + online users |
| GET | `/api/admin/visitors` | Visitor logs (optional ?date=YYYY-MM-DD) |

---

## Streak Calculation Logic

```
function calculateStreakFromDates(dates):
  dates = unique word-entry dates, sorted DESC (most recent first)

  if dates is empty → return 0

  today = YYYY-MM-DD
  yesterday = YYYY-MM-DD

  if dates[0] != today AND dates[0] != yesterday → return 0  (streak broken)

  streak = 1
  currentDate = dates[0]

  for i = 1 to dates.length - 1:
    prevDate = dates[i]
    dayDiff = (currentDate - prevDate) in days

    if dayDiff == 1:
      streak++
      currentDate = prevDate
    else:
      break  (gap in consecutive days)

  return streak
```

## Environment Variables

Create `backend/.env` with the following:

```env
# PostgreSQL Connection
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=dailyword
PG_USER=postgres
PG_PASSWORD=your_pg_password

# JWT
JWT_SECRET=your_long_random_secret_key_here

# Admin Credentials
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_secure_admin_password

# Server
PORT=3000
```
