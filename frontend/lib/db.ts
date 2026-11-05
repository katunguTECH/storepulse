import { neon } from "@neondatabase/serverless";

export async function addEmail(email: string, source = "landing"): Promise<boolean> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = neon(url);
  await sql`CREATE TABLE IF NOT EXISTS waitlist (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL, source TEXT)`;
  const rows = await sql`INSERT INTO waitlist (email, created_at, source) VALUES (${email}, ${new Date().toISOString()}, ${source}) ON CONFLICT (email) DO NOTHING RETURNING id`;
  return rows.length === 1;
}
