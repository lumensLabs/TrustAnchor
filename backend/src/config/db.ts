import pg from "pg";

const { Pool } = pg;

class DummyPool {
  on() {}
  async query(text: string, params?: any[]) {
    // Return dummy data for tests
    if (text.includes("SELECT current_score FROM scores")) {
      return { rows: [] };
    }
    if (text.includes("SELECT amount, month, status FROM remittance_history")) {
      return { rows: [] };
    }
    return { rows: [] };
  }
}

export const pool = process.env.NODE_ENV === "test"
  ? (new DummyPool() as unknown as pg.Pool)
  : new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "test") {
  pool.on("error", (err, client) => {
    console.error("Unexpected error on idle pg client", err);
    process.exit(-1);
  });
}

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};
