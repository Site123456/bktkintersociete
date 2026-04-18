import { NextResponse } from "next/server";
import connectDB from "@/lib/connectDB";
import { Message } from "@/lib/models";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const apiKey = req.headers.get("x-api-key");
    const site = searchParams.get("site") || "global";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const since = searchParams.get("since"); // ISO date string for polling

    if (apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const query: any = { site };
    if (since) {
      query.createdAt = { $gt: new Date(since) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ ok: true, messages: messages.reverse() });
  } catch (error) {
    console.error("Chat GET Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { clerkId, name, content, site } = body;

    if (!clerkId || !name || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    const message = new Message({
      clerkId,
      name,
      content,
      site: site || "global",
    });

    await message.save();

    return NextResponse.json({ ok: true, message });
  } catch (error) {
    console.error("Chat POST Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
