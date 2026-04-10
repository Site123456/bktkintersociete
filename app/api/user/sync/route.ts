import { NextResponse } from "next/server";
import connectDB from "@/lib/connectDB";
import { User } from "@/lib/models";

export async function POST(req: Request) {
  try {
    const { clerkId, email, name } = await req.json();
    if (!clerkId) return NextResponse.json({ ok: false }, { status: 400 });

    await connectDB();
    
    // Find or create
    let user = await User.findOne({ clerkId });
    if (!user) {
      user = await User.create({ clerkId, email, name, verified: false });
    }

    return NextResponse.json({ ok: true, verified: user.verified });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
