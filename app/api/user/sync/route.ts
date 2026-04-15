import { NextResponse } from "next/server";
import connectDB from "@/lib/connectDB";
import { User } from "@/lib/models";

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const { clerkId, email, name, site } = await req.json();
    if (!clerkId) return NextResponse.json({ ok: false }, { status: 400 });

    await connectDB();
    
    // Find or create
    let user = await User.findOne({ clerkId });
    if (!user) {
      user = await User.create({ clerkId, email, name, verified: false, site: site || "" });
    } else {
      // Update name/email if changed
      if (name && name !== user.name) user.name = name;
      if (email && email !== user.email) user.email = email;
      // Update site if provided
      if (site !== undefined && site !== null) user.site = site;
      await user.save();
    }

    return NextResponse.json({ 
      ok: true, 
      verified: user.verified,
      site: user.site || "",
      role: user.role || "employee",
      userId: user._id.toString()
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
