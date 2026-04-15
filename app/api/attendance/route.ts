import { NextResponse } from "next/server";
import connectDB from "@/lib/connectDB";
import { Attendance, User } from "@/lib/models";

export async function GET(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== process.env.API_SECRET) return NextResponse.json({ ok: false }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clerkId = searchParams.get("clerkId");
    const site = searchParams.get("site");
    
    await connectDB();

    // If site is provided, return all users at that site + their attendance
    if (site) {
      const siteUsers = await User.find({ site, verified: true }).select("clerkId name email");
      const clerkIds = siteUsers.map((u: any) => u.clerkId);
      const records = await Attendance.find({ clerkId: { $in: clerkIds } });
      
      return NextResponse.json({ 
        ok: true, 
        users: siteUsers.map((u: any) => ({
          clerkId: u.clerkId,
          name: u.name,
          email: u.email
        })),
        records 
      });
    }
    
    // Otherwise return single user's attendance
    if (!clerkId) return NextResponse.json({ ok: false, error: "clerkId or site required" }, { status: 400 });
    
    const records = await Attendance.find({ clerkId });
    return NextResponse.json({ ok: true, records });
  } catch (err) {
    console.error("GET /api/attendance Error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== process.env.API_SECRET) return NextResponse.json({ ok: false }, { status: 401 });

    const { clerkId, records } = await req.json();
    if (!clerkId || !Array.isArray(records)) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    await connectDB();
    
    for (const record of records) {
      const targetClerkId = record.targetClerkId || clerkId;
      await Attendance.findOneAndUpdate(
        { clerkId: targetClerkId, dateStr: record.dateStr },
        { 
          $set: { 
            status: record.status,
            site: record.site || "" 
          }
        },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/attendance Error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
