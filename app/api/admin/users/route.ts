import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/connectDB";
import { User } from "@/lib/models";

async function isClerkAdmin() {
  const { userId } = await auth();
  if (!userId) return false;
  
  await connectDB();
  const dbUser = await User.findOne({ clerkId: userId });
  return dbUser && dbUser.role === "admin";
}

export async function GET(req: Request) {
  if (!(await isClerkAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 401 });
  
  await connectDB();
  const users = await User.find({}).sort({ createdAt: -1 });
  return NextResponse.json({ ok: true, users });
}

export async function PATCH(req: Request) {
  if (!(await isClerkAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 401 });
  
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
