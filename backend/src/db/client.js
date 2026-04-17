import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool, types } = pg;

// PostgreSQL TIMESTAMP (without timezone) should be treated as UTC in this app.
// This avoids local-environment re-interpretation that can shift order times.
types.setTypeParser(1114, (value) => new Date(`${value}Z`));

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function query(text, params = []) {
  return pool.query(text, params);
}
