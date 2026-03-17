// backend/server.js (PostgreSQL version)

const express = require("express");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const path = require("path");
const os = require("os");
require("dotenv").config();

const db = require("./pgdb"); // { query(...) }

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));
app.set("trust proxy", 1);

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return "localhost";
}
const LOCAL_IP = getLocalIP();

console.log("✅ Backend Starting...\n");

// ==================== HELPER: STREAK CALCULATION ====================
function calculateStreakFromDates(dates) {
  if (!dates || dates.length === 0) return 0;

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const lastDate = dates[0];
  if (lastDate !== today && lastDate !== yesterday) return 0;

  let streak = 1;
  let currentDate = new Date(lastDate);

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i]);
    const diffDays = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
      currentDate = prevDate;
    } else break;
  }

  return streak;
}

function toYMD(d) {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  // if it's already a string like YYYY-MM-DD
  return String(d).slice(0, 10);
}

// ==================== PAGE ROUTES ====================
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../public/index.html")));
app.get("/user-login", (req, res) => res.sendFile(path.join(__dirname, "../public/user-login.html")));
app.get("/admin-login", (req, res) => res.sendFile(path.join(__dirname, "../public/admin-login.html")));

app.get("/dashboard", checkAuth, (req, res) => {
  if (req.user.role !== "user") return res.status(403).send("Forbidden");
  res.sendFile(path.join(__dirname, "../public/dashboard.html"));
});

app.get("/admin-dashboard", checkAuth, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).send("Forbidden");
  res.sendFile(path.join(__dirname, "../public/admin-dashboard.html"));
});

// ==================== AUTH MIDDLEWARE ====================
function checkAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Token invalid" });
  }
}

// ==================== AUTH APIS ====================

// USER SIGNUP
app.post("/api/register", async (req, res) => {
  const { name, email, password, mobile } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, password required" });
  }

  try {
    await db.query(
      `INSERT INTO users (name, email, mobile, password_hash, role)
       VALUES ($1, $2, $3, $4, 'user')`,
      [name, email, mobile || "", password]
    );
    return res.json({ success: true, message: "Signup successful! Login now." });
  } catch (err) {
    console.error("Signup error:", err.message);
    return res.status(500).json({ error: "Signup failed. Try again." });
  }
});

// USER LOGIN
app.post("/api/user/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("\n🔓 USER LOGIN:", email);

  try {
    const userRes = await db.query(
      `SELECT * FROM users WHERE email = $1 AND role = 'user'`,
      [email]
    );
    const user = userRes.rows[0];

    if (!user) {
      console.log("❌ User not found");
      return res.status(401).json({ error: "User not found" });
    }

    console.log("✅ User found:", user.name);
    console.log("   DB Pass:", user.password_hash, "| Input:", password);

    if (user.password_hash !== password) {
      console.log("❌ Password mismatch");
      return res.status(401).json({ error: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: "user", name: user.name },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "7d" }
    );

    res.cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

    await db.query(
      `INSERT INTO user_activity (user_id, action, last_login, is_online, last_activity)
       VALUES ($1, $2, CURRENT_TIMESTAMP, TRUE, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         last_login = CURRENT_TIMESTAMP,
         is_online = TRUE,
         last_activity = CURRENT_TIMESTAMP`,
      [user.id, "login"]
    );

    console.log("✅ LOGIN SUCCESS:", user.name);
    return res.json({ success: true, redirect: "/dashboard" });
  } catch (err) {
    console.error("User login error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

// ADMIN LOGIN
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;
  console.log("\n🔐 ADMIN LOGIN:", email);

  if (email === "admin@dailyword.com" && password === "admin123") {
    const token = jwt.sign(
      { id: 1, email: "admin@dailyword.com", role: "admin", name: "Admin" },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "7d" }
    );
    res.cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    console.log("✅ ADMIN LOGIN SUCCESS");
    return res.json({ success: true, redirect: "/admin-dashboard" });
  }

  console.log("❌ Invalid admin credentials");
  return res.status(401).json({ error: "Invalid credentials" });
});

// ==================== USER PROFILE APIs ====================

app.get("/api/profile", checkAuth, async (req, res) => {
  try {
    const userRes = await db.query(
      `SELECT id, name, email, mobile, role FROM users WHERE id = $1`,
      [req.user.id]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    const datesRes = await db.query(
      `SELECT DATE(created_at) AS word_date
       FROM words
       WHERE user_id = $1
       GROUP BY DATE(created_at)
       ORDER BY word_date DESC`,
      [req.user.id]
    );

    const dateStrings = (datesRes.rows || [])
      .map((r) => toYMD(r.word_date))
      .filter(Boolean);

    let streak = 0;
    let lastWordDate = dateStrings.length > 0 ? dateStrings[0] : null;

    if (dateStrings.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      console.log("📊 Streak Calc:", today, "Last:", lastWordDate);

      if (lastWordDate === today || lastWordDate === yesterday) {
        streak = 1;
        let currentDate = new Date(lastWordDate);

        for (let i = 1; i < dateStrings.length; i++) {
          const prevDate = new Date(dateStrings[i]);
          const dayDiff = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));
          if (dayDiff === 1) {
            streak++;
            currentDate = prevDate;
          } else break;
        }
      }

      console.log("   Final streak:", streak);
    }

    const wordCountRes = await db.query(
      `SELECT COUNT(*)::int AS total FROM words WHERE user_id = $1`,
      [req.user.id]
    );
    const totalWords = wordCountRes.rows[0]?.total || 0;

    return res.json({
      ...user,
      consecutive_days: streak,
      total_words: totalWords,
      last_word_date: lastWordDate,
      is_frozen: false,
      freeze_until: null,
    });
  } catch (err) {
    console.error("Profile error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/profile", checkAuth, async (req, res) => {
  const { name, email, mobile } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Name and email required" });

  try {
    await db.query(
      `UPDATE users SET name = $1, email = $2, mobile = $3 WHERE id = $4`,
      [name, email, mobile || "", req.user.id]
    );
    return res.json({ success: true, message: "Profile updated!" });
  } catch (err) {
    console.error("Profile update error:", err.message);
    return res.status(500).json({ error: "Update failed" });
  }
});

app.put("/api/password", checkAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "Both passwords required" });
  }

  try {
    const userRes = await db.query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [req.user.id]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.password_hash !== oldPassword) {
      return res.status(401).json({ error: "Old password is wrong" });
    }

    await db.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [newPassword, req.user.id]
    );
    return res.json({ success: true, message: "Password reset successful!" });
  } catch (err) {
    console.error("Password reset error:", err);
    return res.status(500).json({ error: "Failed to reset password" });
  }
});

// ==================== PUBLIC WORDS API ====================
app.get("/api/words", async (req, res) => {
  try {
    const rowsRes = await db.query(
      `SELECT w.id, w.word, w.meaning, w.sentence, w.telugu_meaning, w.created_at, w.user_id,
              COALESCE(w.published, TRUE) AS published,
              u.name AS author
       FROM words w
       JOIN users u ON w.user_id = u.id
       WHERE COALESCE(w.published, TRUE) = TRUE
       ORDER BY w.created_at DESC`
    );
    return res.json(rowsRes.rows || []);
  } catch (err) {
    console.error("Public words error:", err);
    return res.json([]);
  }
});

app.get("/api/all-words", checkAuth, async (req, res) => {
  try {
    const rowsRes = await db.query(
      `SELECT w.id, w.word, w.meaning, w.sentence, w.telugu_meaning, w.created_at, w.user_id,
              COALESCE(w.published, TRUE) AS published,
              u.name AS author
       FROM words w
       JOIN users u ON w.user_id = u.id
       ORDER BY w.created_at DESC`
    );
    return res.json(rowsRes.rows || []);
  } catch (err) {
    console.error("All words error:", err);
    return res.json([]);
  }
});

// ==================== USER WORD CRUD ====================

app.get("/api/mywords", checkAuth, async (req, res) => {
  try {
    const rowsRes = await db.query(
      `SELECT w.*, COALESCE(w.published, FALSE) AS published, u.name AS author
       FROM words w
       LEFT JOIN users u ON w.user_id = u.id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    return res.json(rowsRes.rows || []);
  } catch (err) {
    console.error("My words error:", err);
    return res.status(500).json({ error: "Failed to load words" });
  }
});

app.post("/api/words", checkAuth, async (req, res) => {
  const { word, meaning, sentence, telugu_meaning } = req.body;
  if (!word || !meaning || !sentence) {
    return res.status(400).json({ error: "Word, meaning, sentence required" });
  }

  try {
    const insRes = await db.query(
      `INSERT INTO words (user_id, word, meaning, sentence, telugu_meaning, published)
       VALUES ($1, $2, $3, $4, $5, FALSE)
       RETURNING id`,
      [req.user.id, word, meaning, sentence, telugu_meaning || ""]
    );

    const newId = insRes.rows?.[0]?.id;

    const datesRes = await db.query(
      `SELECT DATE(created_at) as word_date
       FROM words
       WHERE user_id = $1
       GROUP BY DATE(created_at)
       ORDER BY word_date DESC`,
      [req.user.id]
    );

    const dateStrings = (datesRes.rows || []).map((r) => toYMD(r.word_date)).filter(Boolean);

    let streak = 0;
    if (dateStrings.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      if (dateStrings[0] === today || dateStrings[0] === yesterday) {
        streak = 1;
        let currentDate = new Date(dateStrings[0]);

        for (let i = 1; i < dateStrings.length; i++) {
          const prevDate = new Date(dateStrings[i]);
          const dayDiff = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));
          if (dayDiff === 1) {
            streak++;
            currentDate = prevDate;
          } else break;
        }
      }
    }

    console.log("✅ Word added with streak:", streak);
    return res.json({
      success: true,
      id: newId,
      streak,
      message: `Word added! 🔥 Streak: ${streak} day(s)`,
    });
  } catch (err) {
    console.error("Add word error:", err);
    return res.status(500).json({ error: "Failed to add word" });
  }
});

app.put("/api/words/:id", checkAuth, async (req, res) => {
  const { word, meaning, sentence, telugu_meaning } = req.body;

  try {
    const rowRes = await db.query(`SELECT user_id FROM words WHERE id = $1`, [req.params.id]);
    const row = rowRes.rows[0];
    if (!row) return res.status(404).json({ error: "Word not found" });
    if (Number(row.user_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: "Can only edit your own words" });
    }

    await db.query(
      `UPDATE words SET word = $1, meaning = $2, sentence = $3, telugu_meaning = $4 WHERE id = $5`,
      [word, meaning, sentence, telugu_meaning || "", req.params.id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("Update word error:", err);
    return res.status(500).json({ error: "Update failed" });
  }
});

app.put("/api/words/:id/publish", checkAuth, async (req, res) => {
  const { published } = req.body;

  try {
    const rowRes = await db.query(`SELECT user_id FROM words WHERE id = $1`, [req.params.id]);
    const row = rowRes.rows[0];
    if (!row) return res.status(404).json({ error: "Word not found" });
    if (Number(row.user_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: "Can only publish your own words" });
    }

    await db.query(`UPDATE words SET published = $1 WHERE id = $2`, [!!published, req.params.id]);
    return res.json({ success: true, message: published ? "Published!" : "Unpublished!" });
  } catch (err) {
    console.error("Publish toggle error:", err);
    return res.status(500).json({ error: "Update failed" });
  }
});

app.delete("/api/words/:id", checkAuth, async (req, res) => {
  try {
    const rowRes = await db.query(`SELECT user_id FROM words WHERE id = $1`, [req.params.id]);
    const row = rowRes.rows[0];
    if (!row) return res.status(404).json({ error: "Word not found" });
    if (Number(row.user_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: "Can only delete your own words" });
    }

    await db.query(`DELETE FROM words WHERE id = $1`, [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete word error:", err);
    return res.status(500).json({ error: "Delete failed" });
  }
});

// ==================== LEADERBOARD API ====================
app.get("/api/leaderboard", async (req, res) => {
  try {
    const usersRes = await db.query(
      `SELECT id, name
       FROM users
       WHERE role = 'user'
       ORDER BY id ASC`
    );

    const users = usersRes.rows || [];
    if (users.length === 0) return res.json([]);

    // For each user: fetch dates + total words
    const results = [];
    for (const u of users) {
      const datesRes = await db.query(
        `SELECT DATE(created_at) AS word_date
         FROM words
         WHERE user_id = $1
         GROUP BY DATE(created_at)
         ORDER BY word_date DESC`,
        [u.id]
      );

      const dates = (datesRes.rows || [])
        .map((r) => toYMD(r.word_date))
        .filter(Boolean);

      const streak = calculateStreakFromDates(dates);
      const lastWordDate = dates.length > 0 ? dates[0] : null;

      const countRes = await db.query(
        `SELECT COUNT(*)::int AS total_words FROM words WHERE user_id = $1`,
        [u.id]
      );
      const totalWords = countRes.rows?.[0]?.total_words ?? 0;

      results.push({
        id: u.id,
        name: u.name,
        streak,
        total_words: totalWords,
        last_word_date: lastWordDate,
      });
    }

    results.sort((a, b) => {
      if (b.streak !== a.streak) return b.streak - a.streak;
      if (b.total_words !== a.total_words) return b.total_words - a.total_words;
      return a.name.localeCompare(b.name);
    });

    const leaderboard = results.map((r, i) => ({ rank: i + 1, ...r }));
    return res.json(leaderboard);
  } catch (err) {
    console.error("Leaderboard error:", err);
    return res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

// ==================== ADMIN APIS ====================

app.get("/api/admin/users", checkAuth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  try {
    const rowsRes = await db.query(
      `SELECT id, name, email, mobile, role, created_at FROM users ORDER BY id DESC`
    );
    return res.json(rowsRes.rows || []);
  } catch (err) {
    console.error("Admin users error:", err);
    return res.status(500).json({ error: "Failed to load users" });
  }
});

app.delete("/api/admin/users/:id", checkAuth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  try {
    await db.query(`DELETE FROM users WHERE id = $1`, [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error("Admin delete user error:", err);
    return res.status(500).json({ error: "Delete failed" });
  }
});

app.get("/api/admin/words", checkAuth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  try {
    const rowsRes = await db.query(
      `SELECT w.*, u.name AS author
       FROM words w
       JOIN users u ON w.user_id = u.id
       ORDER BY w.created_at DESC`
    );
    return res.json(rowsRes.rows || []);
  } catch (err) {
    console.error("Admin words error:", err);
    return res.status(500).json({ error: "Failed to load words" });
  }
});

app.put("/api/admin/words/:id", checkAuth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  const { word, meaning, sentence, telugu_meaning, published } = req.body;

  try {
    await db.query(
      `UPDATE words
       SET word = $1, meaning = $2, sentence = $3, telugu_meaning = $4, published = $5
       WHERE id = $6`,
      [word, meaning, sentence, telugu_meaning || "", !!published, req.params.id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("Admin update word error:", err);
    return res.status(500).json({ error: "Update failed" });
  }
});

app.delete("/api/admin/words/:id", checkAuth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  try {
    await db.query(`DELETE FROM words WHERE id = $1`, [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error("Admin delete word error:", err);
    return res.status(500).json({ error: "Delete failed" });
  }
});

// ==================== LOGOUT ====================
app.post("/api/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, path: "/" });
  return res.json({ success: true });
});

// ==================== ANALYTICS & VISITOR TRACKING ====================

app.post("/api/track-visitor", async (req, res) => {
  const { sessionId, pageAccessed, isGuest } = req.body;
  const ip = req.ip || req.connection?.remoteAddress;
  const userAgent = req.headers["user-agent"] || "Unknown";

  try {
    await db.query(
      `INSERT INTO visitor_logs (session_id, ip_address, user_agent, page_accessed, is_guest)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, ip, userAgent, pageAccessed, !!isGuest]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("Track visitor error:", err);
    return res.json({ success: true }); // keep old behavior
  }
});

app.post("/api/user/activity", checkAuth, async (req, res) => {
  const { action } = req.body;

  try {
    if (action === "login") {
      await db.query(
        `INSERT INTO user_activity (user_id, action, last_login, is_online, last_activity)
         VALUES ($1, $2, CURRENT_TIMESTAMP, TRUE, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET
           last_login = CURRENT_TIMESTAMP,
           is_online = TRUE,
           last_activity = CURRENT_TIMESTAMP`,
        [req.user.id, "login"]
      );
      return res.json({ success: true });
    }

    if (action === "logout") {
      await db.query(
        `UPDATE user_activity SET is_online = FALSE, last_logout = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [req.user.id]
      );
      return res.json({ success: true });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("User activity error:", err);
    return res.json({ success: true });
  }
});

app.put("/api/user/update-status", checkAuth, async (req, res) => {
  try {
    await db.query(
      `UPDATE user_activity SET last_activity = CURRENT_TIMESTAMP WHERE user_id = $1`,
      [req.user.id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("Status update error:", err);
    return res.json({ success: true });
  }
});

app.get("/api/admin/analytics", checkAuth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });

  try {
    const statsRes = await db.query(
      `SELECT
         COUNT(DISTINCT session_id) AS total_visitors,
         COUNT(DISTINCT CASE WHEN is_guest = TRUE THEN session_id END) AS guest_sessions
       FROM visitor_logs
       WHERE visit_date >= (NOW() - INTERVAL '1 day')`
    );
    const stats = statsRes.rows?.[0] || { total_visitors: 0, guest_sessions: 0 };

    const usersRes = await db.query(
      `SELECT u.id, u.name, u.email, ua.last_login, ua.is_online, ua.last_activity
       FROM users u
       LEFT JOIN user_activity ua ON u.id = ua.user_id
       WHERE u.role = 'user'
       ORDER BY ua.last_activity DESC NULLS LAST`
    );

    return res.json({
      stats,
      users: usersRes.rows || [],
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return res.status(500).json({ error: "Stats error" });
  }
});

app.get("/api/admin/visitors", checkAuth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });

  const dateFilter = req.query.date;

  try {
    let query = `
      SELECT vl.*, u.name AS user_name
      FROM visitor_logs vl
      LEFT JOIN users u ON vl.user_id = u.id
    `;
    const params = [];

    if (dateFilter) {
      query += ` WHERE DATE(vl.visit_date) = $1`;
      params.push(dateFilter);
    }

    query += ` ORDER BY vl.visit_date DESC LIMIT 200`;

    const rowsRes = await db.query(query, params);
    return res.json(rowsRes.rows || []);
  } catch (err) {
    console.error("Visitor logs error:", err);
    return res.status(500).json({ error: "Visitor error" });
  }
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ==================== 404 HANDLER ====================
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ==================== START SERVER ====================
app.listen(PORT, "0.0.0.0", () => {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 DailyWord Backend Ready!");
  console.log("=".repeat(70));
  console.log(`\n🌐 Server is accessible on ALL interfaces (0.0.0.0:${PORT})`);
  console.log(`\n📱 Access from phone on same WiFi:`);
  console.log(`   http://${LOCAL_IP}:${PORT}`);
  console.log(`\n💻 Access from this computer:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`\n📌 Quick Links:`);
  console.log(`   📱 Home:        http://${LOCAL_IP}:${PORT}`);
  console.log(`   👤 User Login:  http://${LOCAL_IP}:${PORT}/user-login`);
  console.log(`   👑 Admin Login: http://${LOCAL_IP}:${PORT}/admin-login`);
  console.log(`\n🔐 Default Admin Credentials:`);
  console.log(`   Email: admin@dailyword.com`);
  console.log(`   Password: admin123`);
  console.log("\n" + "=".repeat(70));
  console.log("✅ Waiting for requests...\n");
});
