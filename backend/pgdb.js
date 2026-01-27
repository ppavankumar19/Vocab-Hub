// backend/pgdb.js
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const pool = new Pool({
  host: process.env.PG_HOST || "localhost",
  port: Number(process.env.PG_PORT || 5432),
  database: process.env.PG_DATABASE || "dailyword",
  user: process.env.PG_USER || "postgres",
  password: String(process.env.PG_PASSWORD ?? ""), // must be string
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
