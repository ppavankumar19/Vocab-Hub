-- PostgreSQL schema for VocabHub
-- Run against your PostgreSQL database: psql -d dailyword -f schema.sql

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  mobile TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS words (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  sentence TEXT NOT NULL,
  telugu_meaning TEXT DEFAULT '',
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visitor_logs (
  id SERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  page_accessed TEXT,
  visit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_seconds INTEGER,
  is_guest BOOLEAN DEFAULT TRUE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT,
  last_login TIMESTAMP,
  last_logout TIMESTAMP,
  is_online BOOLEAN DEFAULT FALSE,
  last_activity TIMESTAMP
);

CREATE TABLE IF NOT EXISTS site_analytics (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  total_visitors INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  registered_users_online INTEGER DEFAULT 0,
  guest_sessions INTEGER DEFAULT 0
);
