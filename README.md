# 📚 VocabHub – Daily Word Learning Platform

VocabHub is a full-stack web application where users can register, log in, add vocabulary words daily, track their streak, and browse words from all users. Additionally, an admin can manage users, words, and analytics. [conversation_history:1]

---

## ✨ Features Implemented

### 👤 User Features
- User registration and login using email and password, with JWT stored in HTTP‑only cookies. [conversation_history:1]
- Profile page with the ability to view and update name, email, and mobile number. [conversation_history:1]
- Change password flow with old/new password validation on the backend. [conversation_history:1]
- Add new words with: word, meaning, example sentence, and optional Telugu meaning. [conversation_history:1]
- View personal words list with created date and status (draft/published). [conversation_history:1]
- Edit, publish/unpublish, and delete own words only (ownership enforced in backend). [conversation_history:1]
- View all published words from all users in a card grid with author info and dates. [conversation_history:1]
- Daily streak display showing consecutive days of adding words. [conversation_history:1]
- Beautiful dashboard UI with tabs (Profile / My Words / All Words), animations, and full responsiveness. [conversation_history:1]

### 👑 Admin Features
- Admin login with fixed default credentials (`admin@dailyword.com` / `admin123`). [conversation_history:1]
- View all users with basic details and the creation date. [conversation_history:1]
- Delete users from the admin panel. [conversation_history:1]
- View all words from all users, with the ability to edit or delete them. [conversation_history:1]
- Site analytics endpoint showing total visitors, guest sessions, and user online state summary. [conversation_history:1]
- Visitor logs listing sessions, IP, user‑agent, pages visited, and optional linked user. [conversation_history:1]

### 📊 Tracking & Analytics
- `visitor_logs` table logs session id, IP address, user agent, page accessed, and visit time. [conversation_history:1]
- `user_activity` tracks last login/logout, last activity timestamp, and online status per user. [conversation_history:1]
- `site_analytics` table reserved for per‑day aggregated stats (total/unique visitors, online users, guest sessions). [conversation_history:1]

### 🎨 Frontend UX
- Animated background gradients and floating letters for a vocabulary‑themed ambience. [conversation_history:1]
- Glassmorphism style header and cards, with shadows and transitions. [conversation_history:1]
- Responsive layout using CSS Grid/Flexbox; optimised for desktop and mobile. [conversation_history:1]
- Tabbed dashboard interface with smooth “book opening” animation for tab content. [conversation_history:1]
- Inline validation and feedback messages for profile, password, and word forms. [conversation_history:1]

---

## 🧱 Project Structure

A typical structure (you may adapt to your folder layout): [conversation_history:1]

```text
dailyword/
├── backend/
│   └── server.js          # Express server with all APIs and DB init
├── db/
│   └── dailyword.db       # SQLite database file
└── public/
    ├── index.html         # Landing/home page
    ├── user-login.html    # User login/registration page
    ├── admin-login.html   # Admin login page
    ├── dashboard.html     # User dashboard (profile, streak, words)
    └── admin-dashboard.html (optional) # Admin UI if implemented
```

The backend serves static files from `public/` and exposes a JSON API under `/api/*`. [conversation_history:1]

---

## 🛠 Technologies Used

### Backend
- **Node.js + Express** – HTTP server, routing, middleware, and JSON APIs. [conversation_history:1]
- **SQLite3 (file‑based DB)** – Lightweight relational database for users, words, logs, and analytics. [conversation_history:1]
- **JWT (jsonwebtoken)** – User and admin authentication via signed tokens. [conversation_history:1]
- **cookie-parser** – Read/write JWT tokens via HTTP‑only cookies. [conversation_history:1]
- **dotenv** – Configuration via `.env` (e.g., `PORT`, `JWT_SECRET`). [conversation_history:1]
- **os/path (Node core)** – To resolve DB path and detect local IP for display. [conversation_history:1]

### Frontend
- **HTML5** – Structured pages for login, dashboard, and admin. [conversation_history:1]
- **CSS3** – Modern styling with gradients, keyframe animations, and responsive layout. [conversation_history:1]
- **Vanilla JavaScript (ES6)** – `fetch` calls to the backend, DOM updates, modals, tab switching, search, and streak display logic. [conversation_history:1]

---

## 🗄 Database Design

Tables created in `initializeTables()` in `server.js`: [conversation_history:1]

### `users`
- `id` (INTEGER, PK, AUTOINCREMENT)  
- `name` (TEXT, NOT NULL)  
- `email` (TEXT, UNIQUE, NOT NULL)  
- `mobile` (TEXT)  
- `password_hash` (TEXT, NOT NULL; currently plain text for simplicity)  
- `role` (TEXT, default `'user'`, can be `'admin'`)  
- `created_at` (DATETIME, default `CURRENT_TIMESTAMP`)  

### `words`
- `id` (INTEGER, PK, AUTOINCREMENT)  
- `user_id` (INTEGER, FK → users.id)  
- `word` (TEXT, NOT NULL)  
- `meaning` (TEXT, NOT NULL)  
- `sentence` (TEXT)  
- `telugu_meaning` (TEXT)  
- `published` (BOOLEAN, default `0`)  
- `created_at` (DATETIME, default `CURRENT_TIMESTAMP`)  

### `visitor_logs`
- `id` (INTEGER, PK, AUTOINCREMENT)  
- `session_id` (TEXT, UNIQUE)  
- `ip_address` (TEXT)  
- `user_agent` (TEXT)  
- `page_accessed` (TEXT)  
- `visit_date` (DATETIME, default `CURRENT_TIMESTAMP`)  
- `duration_seconds` (INTEGER, default `0`)  
- `is_guest` (BOOLEAN, default `1`)  
- `user_id` (INTEGER, FK → users.id, nullable)  

### `user_activity`
- `id` (INTEGER, PK, AUTOINCREMENT)  
- `user_id` (INTEGER, UNIQUE, FK → users.id)  
- `action` (TEXT)  
- `last_login` (DATETIME)  
- `last_logout` (DATETIME)  
- `is_online` (BOOLEAN, default `0`)  
- `last_activity` (DATETIME, default `CURRENT_TIMESTAMP`)  

### `site_analytics`
- `id` (INTEGER, PK, AUTOINCREMENT)  
- `date` (DATE, UNIQUE)  
- `total_visitors` (INTEGER, default `0`)  
- `unique_visitors` (INTEGER, default `0`)  
- `registered_users_online` (INTEGER, default `0`)  
- `guest_sessions` (INTEGER, default `0`)  

All of these are created in the server startup via `CREATE TABLE IF NOT EXISTS ...`. [conversation_history:1]

---

## 🔐 Authentication & Authorization

- User signup: `POST /api/register` – creates a row in `users` with role `'user'`. [conversation_history:1]
- User login: `POST /api/user/login` – validates email/password, returns JWT in a cookie and logs activity. [conversation_history:1]
- Admin login: `POST /api/admin/login` – checks hardcoded admin credentials and issues an admin JWT cookie. [conversation_history:1]
- JWT middleware: `checkAuth` reads `token` cookie, verifies it, and attaches `req.user`. [conversation_history:1]
- Role checks:
  - User routes expect `req.user.role === 'user'`. [conversation_history:1]
  - Admin routes guard with `if (req.user.role !== 'admin') return res.status(403)`. [conversation_history:1]
- Word ownership: update/delete/publish endpoints first check that `words.user_id === req.user.id`. [conversation_history:1]

---

## 🌟 Core API Endpoints

### Auth
- `POST /api/register` – User signup. [conversation_history:1]
- `POST /api/user/login` – User login. [conversation_history:1]
- `POST /api/admin/login` – Admin login. [conversation_history:1]

### Profile
- `GET /api/profile` – Get current user profile plus computed streak and last word date. [conversation_history:1]
- `PUT /api/profile` – Update name, email, mobile. [conversation_history:1]
- `PUT /api/password` – Change password after verifying old password. [conversation_history:1]

### Words
- `GET /api/mywords` – List words belonging to the authenticated user. [conversation_history:1]
- `POST /api/words` – Add a new word; responds with success and new word id (and streak in the enhanced version). [conversation_history:1]
- `PUT /api/words/:id` – Edit word (only if it belongs to current user). [conversation_history:1]
- `PUT /api/words/:id/publish` – Toggle publish status (only owner). [conversation_history:1]
- `DELETE /api/words/:id` – Delete word (only owner). [conversation_history:1]
- `GET /api/words` – List all published words with author info. [conversation_history:1]
- `GET /api/all-words` – List all words (auth required). [conversation_history:1]

### Admin
- `GET /api/admin/users` – List all users. [conversation_history:1]
- `DELETE /api/admin/users/:id` – Delete user. [conversation_history:1]
- `GET /api/admin/words` – List all words with author details. [conversation_history:1]
- `PUT /api/admin/words/:id` – Admin edit of a word (including published flag). [conversation_history:1]
- `DELETE /api/admin/words/:id` – Admin delete word. [conversation_history:1]

### Analytics & Activity
- `POST /api/track-visitor` – Log a visitor with session id, IP, UA, page, and guest flag. [conversation_history:1]
- `POST /api/user/activity` – Log login/logout to `user_activity`. [conversation_history:1]
- `PUT /api/user/update-status` – Update `last_activity` timestamp for the current user. [conversation_history:1]
- `GET /api/admin/analytics` – Summary of visitors (last 24h) plus user online info. [conversation_history:1]
- `GET /api/admin/visitors` – List recent visitor logs, with optional date filter. [conversation_history:1]

---

## 🔥 Streak Logic (High Level)

- For a user, all distinct days on which they added words are queried (grouped by `DATE(created_at)` and sorted descending). [conversation_history:1]
- The latest word date is compared to **today** and **yesterday**; if it matches either, streak counting starts at 1. [conversation_history:1]
- Then, the code walks backwards through the dates, increasing streak as long as each previous date is exactly 1 day before the current one. [conversation_history:1]
- The result is returned as `consecutive_days` in `/api/profile`, and shown in the dashboard. [conversation_history:1]

---

## 🧪 Important Commands

### Install Dependencies

From the `backend` directory: [conversation_history:1]

```bash
npm init -y
npm install express sqlite3 jsonwebtoken cookie-parser dotenv
```

(You may also install `cors` or `nodemon` if you choose.) [conversation_history:1]

### Run the Server

```bash
node server.js
```

Or with live reload (if `nodemon` installed): [conversation_history:1]

```bash
npx nodemon server.js
```

### Basic Local Testing (Ubuntu)

```bash
# Check server is listening
sudo netstat -tlnp | grep 3000

# Test from machine itself
curl http://localhost:3000
curl http://localhost:3000/user-login
```

### Find Local IP (for mobile on same Wi‑Fi)

```bash
hostname -I | awk '{print $1}'
```

The backend also logs something like: [conversation_history:1]

```text
📱 Access from phone on the same WiFi:
   http://YOUR_LOCAL_IP:3000
```

You can use that URL in your mobile browser when the phone and machine are on the same network. [conversation_history:1]

---

## 🚀 How to Run the Full App

1. Ensure `dailyword.db` is in `db/` (or let the app create it). [conversation_history:1]  
2. Start the backend:

   ```bash
   cd backend
   node server.js
   ```

3. Open in browser on the same machine:

   - `http://localhost:3000` – home page. [conversation_history:1]
   - `http://localhost:3000/user-login` – user login/register. [conversation_history:1]
   - `http://localhost:3000/admin-login` – admin login. [conversation_history:1]
   - After login, you are redirected to `/dashboard` (user) or `/admin-dashboard` (admin). [conversation_history:1]

4. To access from mobile on the same Wi‑Fi, open:

   ```text
   http://<your-local-ip>:3000
   ```

   where `<your-local-ip>` is from `hostname -I`. [conversation_history:1]

---
