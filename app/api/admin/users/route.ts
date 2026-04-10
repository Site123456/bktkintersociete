import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/connectDB";
import { User } from "@/lib/models";

async function isAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get("admin_session")?.value === "true";
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  
  await connectDB();
  const users = await User.find({}).sort({ createdAt: -1 });
  return NextResponse.json({ ok: true, users });
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  
  try {
    const { id, verified } = await req.json();
    await connectDB();
    await User.findByIdAndUpdate(id, { verified });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
