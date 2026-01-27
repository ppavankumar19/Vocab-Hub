import sqlite3
import os
import psycopg

SQLITE_PATH = os.path.join("db", "dailyword.db")

PG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "dailyword",
    "user": "postgres",
    "password": None,  # we'll prompt if not set
}

def prompt_password():
    import getpass
    return getpass.getpass("Postgres password for user postgres: ")

def fetch_all(conn, sql):
    cur = conn.cursor()
    cur.execute(sql)
    cols = [d[0] for d in cur.description]
    rows = cur.fetchall()
    return cols, rows

def main():
    if not os.path.exists(SQLITE_PATH):
        raise FileNotFoundError(f"SQLite DB not found at {SQLITE_PATH}")

    # SQLite connection (Unicode safe)
    sconn = sqlite3.connect(SQLITE_PATH)
    sconn.row_factory = sqlite3.Row

    # Ask for postgres password
    pg_pass = os.environ.get("PGPASSWORD")
    if not pg_pass:
        pg_pass = prompt_password()
    PG["password"] = pg_pass

    # Postgres connection (UTF-8)
    with psycopg.connect(**PG) as pconn:
        with pconn.cursor() as cur:
            # Clean tables (order matters)
            cur.execute("TRUNCATE TABLE words RESTART IDENTITY CASCADE;")
            cur.execute("TRUNCATE TABLE visitor_logs RESTART IDENTITY CASCADE;")
            cur.execute("TRUNCATE TABLE user_activity RESTART IDENTITY CASCADE;")
            cur.execute("TRUNCATE TABLE site_analytics RESTART IDENTITY CASCADE;")
            cur.execute("TRUNCATE TABLE users RESTART IDENTITY CASCADE;")

        # users
        _, users = fetch_all(sconn, "SELECT * FROM users ORDER BY id")
        with pconn.cursor() as cur:
            for r in users:
                cur.execute(
                    """
                    INSERT INTO users (id, name, email, mobile, password_hash, role, created_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (r["id"], r["name"], r["email"], r["mobile"], r["password_hash"], r["role"], r["created_at"])
                )

        # words (Telugu correct here)
        _, words = fetch_all(sconn, "SELECT * FROM words ORDER BY id")
        with pconn.cursor() as cur:
            for r in words:
                # published in sqlite is usually 0/1
                published = bool(r["published"]) if "published" in r.keys() and r["published"] is not None else False
                cur.execute(
                    """
                    INSERT INTO words (id, user_id, word, meaning, sentence, telugu_meaning, created_at, published)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (r["id"], r["user_id"], r["word"], r["meaning"], r["sentence"], r["telugu_meaning"], r["created_at"], published)
                )

        # visitor_logs
        _, vlogs = fetch_all(sconn, "SELECT * FROM visitor_logs ORDER BY id")
        with pconn.cursor() as cur:
            for r in vlogs:
                is_guest = bool(r["is_guest"]) if r["is_guest"] is not None else True
                cur.execute(
                    """
                    INSERT INTO visitor_logs
                    (id, session_id, ip_address, user_agent, page_accessed, visit_date, duration_seconds, is_guest, user_id)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (r["id"], r["session_id"], r["ip_address"], r["user_agent"], r["page_accessed"],
                     r["visit_date"], r["duration_seconds"], is_guest, r["user_id"])
                )

        # user_activity
        _, acts = fetch_all(sconn, "SELECT * FROM user_activity ORDER BY id")
        with pconn.cursor() as cur:
            for r in acts:
                is_online = bool(r["is_online"]) if r["is_online"] is not None else False
                cur.execute(
                    """
                    INSERT INTO user_activity
                    (id, user_id, action, last_login, last_logout, is_online, last_activity)
                    VALUES (%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (r["id"], r["user_id"], r["action"], r["last_login"], r["last_logout"], is_online, r["last_activity"])
                )

        # site_analytics
        _, sa = fetch_all(sconn, "SELECT * FROM site_analytics ORDER BY id")
        with pconn.cursor() as cur:
            for r in sa:
                cur.execute(
                    """
                    INSERT INTO site_analytics
                    (id, date, total_visitors, unique_visitors, registered_users_online, guest_sessions)
                    VALUES (%s,%s,%s,%s,%s,%s)
                    """,
                    (r["id"], r["date"], r["total_visitors"], r["unique_visitors"], r["registered_users_online"], r["guest_sessions"])
                )

        pconn.commit()

    sconn.close()
    print("✅ Unicode-safe migration complete (SQLite → Postgres).")

if __name__ == "__main__":
    main()
