import pg from 'pg';

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  pool ??= new pg.Pool({ connectionString });
  return pool;
}

/** Test helper to reset the singleton pool between test runs. */
export function resetPool(): void {
  pool = null;
}
