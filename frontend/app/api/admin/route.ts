import { getDashboardData } from "@/lib/db";

const ADMIN_PASSWORD = "Letmeinplease01!";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    
    if (password !== ADMIN_PASSWORD) {
      return Response.json({ error: "Incorrect password" }, { status: 401 });
    }

    const data = await getDashboardData();
    return Response.json(data);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to load data" }, { status: 500 });
  }
}