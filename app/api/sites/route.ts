import { NextResponse } from "next/server";
import connectDB from "@/lib/connectDB";
import { Site } from "@/lib/models";

const DEFAULT_SITES = [
  { slug: "BKTK01", name: "INS Paris 15" },
  { slug: "BKTK02", name: "INS Bordeaux" },
  { slug: "BKTK03", name: "INS Courbevoie" },
  { slug: "BKTK04", name: "INS Saint-Ouen" },
  { slug: "BKTK05", name: "INS Bagneux" },
  { slug: "BKTK06", name: "INS Ivry" },
  { slug: "BKTK07", name: "INS Aubervilliers" },
  { slug: "BKTK08", name: "Koseli Buffet" },
];

export async function GET(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== process.env.API_SECRET) return NextResponse.json({ ok: false }, { status: 401 });

    await connectDB();
    
    // Seed sites if empty
    const count = await Site.countDocuments();
    if (count === 0) {
      await Site.insertMany(DEFAULT_SITES);
    }

    const sites = await Site.find({ active: true }).sort({ slug: 1 });
    return NextResponse.json({ ok: true, sites });
  } catch (err) {
    console.error("GET /api/sites:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== process.env.API_SECRET) return NextResponse.json({ ok: false }, { status: 401 });

    const { slug, name, line1, line2 } = await req.json();
    if (!slug || !name) return NextResponse.json({ ok: false, error: "slug and name required" }, { status: 400 });

    await connectDB();
    
    const site = await Site.findOneAndUpdate(
      { slug },
      { $set: { name, line1: line1 || "", line2: line2 || "", active: true } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true, site });
  } catch (err) {
    console.error("POST /api/sites:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
