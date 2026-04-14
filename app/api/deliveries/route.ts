import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/connectDB";

export async function GET(req: Request) {
  try {
    await connectDB();
    const db = mongoose.connection.db!;

    const { searchParams } = new URL(req.url);
    const siteSlug = searchParams.get("site");

    let query: any = {};
    if (siteSlug) query["site.slug"] = siteSlug;

    const deliveries = await db
      .collection("deliveries")
      .find(query)
      .sort({ date: -1 })
      .limit(50)
      .toArray();

    const formattedDeliveries = deliveries.map((d) => ({
      _id: d._id.toString(),
      site: d.site?.name || "BKTK International",
      date: d.date,
      pdf: `https://bktk.indian-nepaliswad.fr/api/pdf?id=${d._id}`,
    }));

    return NextResponse.json(formattedDeliveries);

  } catch (error) {
    console.error("Erreur API Deliveries:", error);
    return new NextResponse("Erreur Serveur", { status: 500 });
  }
}
