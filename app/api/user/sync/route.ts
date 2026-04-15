import { NextResponse } from "next/server";
import connectDB from "@/lib/connectDB";
import { User } from "@/lib/models";

export async function GET(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clerkId = searchParams.get("clerkId");
    
    if (!clerkId) {
      return NextResponse.json({ ok: false, message: "clerkId is required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ clerkId });
    
    if (!user) {
      return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      ok: true, 
      name: user.name,
      site: user.site || "",
      verified: user.verified,
      role: user.role || "employee"
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { clerkId, email, name, site } = body;
    
    if (!clerkId) {
      return NextResponse.json({ ok: false, message: "clerkId is required" }, { status: 400 });
    }

    await connectDB();
    
    // Use findOneAndUpdate with upsert for atomicity and efficiency
    const update: any = {};
    if (name) update.name = name.trim();
    if (email) update.email = email.trim().toLowerCase();
    if (site !== undefined && site !== null) update.site = site;

    const user = await User.findOneAndUpdate(
      { clerkId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ 
      ok: true, 
      verified: user.verified,
      site: user.site || "",
      role: user.role || "employee",
      name: user.name,
      userId: user._id.toString()
    });
  } catch (err) {
    console.error("Backend sync error:", err);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
