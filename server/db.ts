import pg from "pg";

const { Pool } = pg as unknown as {
  Pool: new (config: { connectionString: string; ssl: false | { rejectUnauthorized: boolean } }) => {
    query: <T>(text: string, values?: unknown[]) => Promise<{ rows: T[]; rowCount: number | null }>;
    end: () => Promise<void>;
  };
};

const connectionString = process.env.DATABASE_URL;

export const hasDatabase = Boolean(connectionString);

export const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false }
    })
  : null;

export async function dbQuery<T>(text: string, values: unknown[] = []) {
  if (!pool) {
    throw new Error("DATABASE_URL is required for admin database operations.");
  }
  return pool.query<T>(text, values);
}

export async function closePool() {
  if (pool) await pool.end();
}
