# 📚 VocabHub – Daily Vocabulary Learning Platform

**VocabHub** is a full-stack web application that helps users build vocabulary daily, track learning streaks, and explore words shared by others.
It includes a dedicated **admin panel** for managing users, words, and site analytics.

The project is built with **Node.js + Express** and uses **PostgreSQL (UTF-8)** for reliable, scalable, and Unicode-safe data storage (including Telugu language support).

---

## ✨ Features

### 👤 User Features

* User registration and login using email & password
* Authentication via **JWT stored in HTTP-only cookies**
* User profile management (name, email, mobile)
* Change password (old/new password validation)
* Add daily vocabulary words with:

  * Word
  * Meaning
  * Example sentence
  * Optional **Telugu meaning**
* View, edit, publish/unpublish, and delete **own words only**
* Browse all **published words** from all users
* Daily **streak tracking** based on consecutive days of word additions
* Clean, responsive dashboard UI

---

### 👑 Admin Features

* Admin login (role-based access)
* View all registered users
* Delete users
* View, edit, or delete any word
* Site analytics dashboard:

  * Total visitors
  * Guest sessions
  * User online status
* Visitor logs with:

  * Session ID
  * IP address
  * User agent
  * Page accessed
  * Timestamp

---

### 📊 Tracking & Analytics

* Visitor tracking via `visitor_logs`
* User login/logout & activity tracking via `user_activity`
* Daily aggregated analytics support via `site_analytics`

---

## 🧱 Project Structure

```
Vocab-Hub/
├── backend/
│   ├── server.js        # Express server & APIs
│   ├── pgdb.js          # PostgreSQL connection helper
│   ├── package.json
│   ├── package-lock.json
│   └── .env             # Environment variables (NOT committed)
│
├── db/
│   └── schema.sql       # PostgreSQL schema (recommended)
│
├── public/
│   ├── index.html
│   ├── user-login.html
│   ├── admin-login.html
│   ├── dashboard.html
│   └── admin-dashboard.html
│
├── migrate_unicode.py   # SQLite → PostgreSQL Unicode-safe migration
├── .gitignore
└── README.md
```

---

## 🛠️ Tech Stack

### Backend

* **Node.js**
* **Express.js**
* **PostgreSQL (UTF-8)**
* **pg (node-postgres)**
* **JWT (jsonwebtoken)**
* **cookie-parser**
* **dotenv**

### Frontend

* HTML5
* CSS3 (modern UI, animations, responsive layout)
* Vanilla JavaScript (Fetch API)

### Migration Tools

* Python 3
* sqlite3
* psycopg

---

## 🗄 Database Design (PostgreSQL)

### `users`

| Column        | Type      | Notes                  |
| ------------- | --------- | ---------------------- |
| id            | INTEGER   | PK, auto-increment     |
| name          | TEXT      | NOT NULL               |
| email         | TEXT      | UNIQUE, NOT NULL       |
| mobile        | TEXT      |                        |
| password_hash | TEXT      | (plain text currently) |
| role          | TEXT      | `user` / `admin`       |
| created_at    | TIMESTAMP | default NOW            |

---

### `words`

| Column         | Type                    |
| -------------- | ----------------------- |
| id             | INTEGER (PK)            |
| user_id        | INTEGER (FK → users.id) |
| word           | TEXT                    |
| meaning        | TEXT                    |
| sentence       | TEXT                    |
| telugu_meaning | TEXT                    |
| published      | BOOLEAN                 |
| created_at     | TIMESTAMP               |

---

### `visitor_logs`

| Column           | Type               |
| ---------------- | ------------------ |
| id               | INTEGER (PK)       |
| session_id       | TEXT (UNIQUE)      |
| ip_address       | TEXT               |
| user_agent       | TEXT               |
| page_accessed    | TEXT               |
| visit_date       | TIMESTAMP          |
| duration_seconds | INTEGER            |
| is_guest         | BOOLEAN            |
| user_id          | INTEGER (nullable) |

---

### `user_activity`

| Column        | Type             |
| ------------- | ---------------- |
| id            | INTEGER (PK)     |
| user_id       | INTEGER (UNIQUE) |
| action        | TEXT             |
| last_login    | TIMESTAMP        |
| last_logout   | TIMESTAMP        |
| is_online     | BOOLEAN          |
| last_activity | TIMESTAMP        |

---

### `site_analytics`

| Column                  | Type          |
| ----------------------- | ------------- |
| id                      | INTEGER (PK)  |
| date                    | DATE (UNIQUE) |
| total_visitors          | INTEGER       |
| unique_visitors         | INTEGER       |
| registered_users_online | INTEGER       |
| guest_sessions          | INTEGER       |

---

## 🔐 Authentication & Authorization

* JWT stored in HTTP-only cookies
* `checkAuth` middleware validates the token
* Role-based access control:

  * Users → user routes only
  * Admin → admin routes only
* Ownership enforcement for word updates/deletes

---

## 🔥 Streak Logic (Overview)

* Fetch distinct dates when a user added words
* Sort dates descending
* If the latest date is today or yesterday → start a streak
* Continue counting while dates are consecutive
* Streak shown on dashboard and profile API

---

## ⚙️ Environment Variables (`backend/.env`)

```env
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=dailyword
PG_USER=postgres
PG_PASSWORD=your_password
JWT_SECRET=your_secret_key
```

⚠️ `.env` is **not committed** to GitHub.

---

## 🚀 Running Locally

### 1️⃣ Install dependencies

```bash
cd backend
npm install
```

### 2️⃣ Start PostgreSQL

Ensure PostgreSQL is running and the database exists.

### 3️⃣ Run server

```bash
node server.js
```

### 4️⃣ Access app

* Home: `http://localhost:3000`
* User Login: `/user-login`
* Admin Login: `/admin-login`

---

## 🌍 Deployment (Render.com – High Level)

* Push repo to GitHub
* Create PostgreSQL service on Render
* Create Web Service from repo
* Set **Root Directory** to `backend`
* Add environment variables in the Render dashboard
* Render automatically builds & deploys

---

## 🏆 What This Project Demonstrates

* Full-stack development with Node.js
* Real-world **SQLite → PostgreSQL migration**
* Unicode-safe data handling (Telugu support)
* Authentication & role-based authorization
* Analytics & visitor tracking
* Production-ready backend architecture

---
