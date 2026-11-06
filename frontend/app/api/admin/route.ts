import { getDashboardData } from "@/lib/db";
import { NextResponse } from "next/server";

const ADMIN_PASSWORD = "Letmeinplease01!";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}
