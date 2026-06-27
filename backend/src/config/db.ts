import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err, client) => {
  console.error("Unexpected error on idle pg client", err);
  process.exit(-1);
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};
