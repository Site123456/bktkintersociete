import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/connectDB";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const siteSlug = searchParams.get("site");

    if (!siteSlug) return NextResponse.json({ ok: false, error: "Missing site slug" }, { status: 400 });

    await connectDB();
    const db = mongoose.connection.db!;
    
    // Get current month prefix, e.g., "2026-04"
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Find deliveries for this site in the current month where docType is supply (or missing)
    const deliveries = await db.collection("deliveries").find({
      "site.slug": siteSlug,
      date: { $regex: `^${currentMonth}` },
      $or: [
        { docType: "supply" },
        { docType: { $exists: false } }
      ]
    }).toArray();

    // Aggregate items
    const aggregated: Record<string, { unit: string, qty: number }> = {};
    for (const d of deliveries) {
      if (Array.isArray(d.items)) {
        for (const item of d.items) {
          if (!aggregated[item.name]) {
            aggregated[item.name] = { unit: item.unit, qty: 0 };
          }
          aggregated[item.name].qty += Number(item.qty) || 0;
        }
      }
    }

    const items = Object.entries(aggregated).map(([name, data]) => ({
      name,
      unit: data.unit,
      qty: data.qty
    }));

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
