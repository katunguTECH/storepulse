import { neon } from "@neondatabase/serverless";

const getDb = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
};

export async function addEmail(email: string, source = "landing"): Promise<boolean> {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS waitlist (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL, source TEXT)`;
  const rows = await sql`INSERT INTO waitlist (email, created_at, source) VALUES (${email}, ${new Date().toISOString()}, ${source}) ON CONFLICT (email) DO NOTHING RETURNING id`;
  return rows.length === 1;
}

export async function recordVisit(ip: string, country: string, city: string, path: string) {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS visits (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ip TEXT,
      country TEXT,
      city TEXT,
      path TEXT
    )
  `;
  // If the table already exists from before, add the new column safely
  await sql`ALTER TABLE visits ADD COLUMN IF NOT EXISTS ip TEXT`;
  
  await sql`INSERT INTO visits (ip, country, city, path) VALUES (${ip}, ${country}, ${city}, ${path})`;
}

export async function getDashboardData() {
  const sql = getDb();
  const visits = await sql`SELECT COUNT(*) as count FROM visits`;
  const visits24h = await sql`SELECT COUNT(*) as count FROM visits WHERE created_at > NOW() - INTERVAL '24 hours'`;
  const waitlist = await sql`SELECT COUNT(*) as count FROM waitlist`;
  const recentWaitlist = await sql`SELECT email, created_at FROM waitlist ORDER BY id DESC LIMIT 20`;
  const locations = await sql`SELECT country, COUNT(*) as count FROM visits GROUP BY country ORDER BY count DESC LIMIT 10`;
  const recentVisits = await sql`SELECT ip, country, city, path, created_at FROM visits ORDER BY id DESC LIMIT 10`;

  return {
    stats: {
      totalVisits: Number(visits[0]?.count || 0),
      visits24h: Number(visits24h[0]?.count || 0),
      totalWaitlist: Number(waitlist[0]?.count || 0),
    },
    recentWaitlist,
    locations,
    recentVisits,
  };
}