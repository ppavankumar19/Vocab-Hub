-- Run these in sqlite3 dailyword.db
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  mobile TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  sentence TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Admin user (password: admin123)
INSERT INTO users (name, email, password_hash, role) VALUES 
('Admin', 'admin@dailyword.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

CREATE TABLE guest_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT,
  user_agent TEXT,
  visited_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_logins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  logged_in_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
