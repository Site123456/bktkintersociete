import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/connectDB";
import { User } from "@/lib/models";

async function isAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get("admin_session")?.value === "true";
}

export async function GET(req: Request) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.API_SECRET) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  
  await connectDB();
  const users = await User.find({}).sort({ createdAt: -1 });
  return NextResponse.json({ ok: true, users });
}

export async function PATCH(req: Request) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.API_SECRET) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  
  try {
    const { id, verified, site, role } = await req.json();
    await connectDB();
    
    const updateData: any = {};
    if (verified !== undefined) updateData.verified = verified;
    if (site !== undefined) updateData.site = site;
    if (role !== undefined) updateData.role = role;
    
    await User.findByIdAndUpdate(id, updateData);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
