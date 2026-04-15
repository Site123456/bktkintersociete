import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/connectDB";
import { User } from "@/lib/models";
import { sendPushNotifications } from "@/lib/push";

export async function GET(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== process.env.API_SECRET) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

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

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== process.env.API_SECRET) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await connectDB();
    const db = mongoose.connection.db!;
    
    let body;
    try {
      body = await req.json();
    } catch {
      return new NextResponse("Invalid JSON", { status: 400 });
    }

    const { site, date, user, type, items } = body;
    
    if (!site || !items || !Array.isArray(items)) {
      return new NextResponse("Missing data", { status: 400 });
    }

    const payload = {
      site: site,
      date: new Date(date || Date.now()),
      user: user || "Unknown",
      type: type || "command",
      items: items,
      createdAt: new Date(),
    };

    const result = await db.collection("deliveries").insertOne(payload);

    // Broadcast Notifications to all users on this site
    try {
      const siteSlug = site?.slug;
      if (siteSlug) {
        const usersOnSite = await User.find({ 
          site: siteSlug, 
          pushToken: { $exists: true, $ne: "" } 
        }).select('pushToken');
        
        const tokens = usersOnSite.map(u => u.pushToken);
        if (tokens.length > 0) {
          const title = type === 'stock' ? '📦 Inventaire Mis à Jour' : '🚚 Nouvelle Commande';
          const senderName = user || "Un utilisateur";
          const bodyMsg = `Une nouvelle commande pour ${site?.name || 'votre site'} a été envoyée par ${senderName}. Les confirmations de commande sont envoyées à tous les utilisateurs du site.`;
          
          await sendPushNotifications(tokens, title, bodyMsg, { type, siteSlug });
        }
      }
    } catch (notifErr) {
      console.error("Failed to broadcast notifications:", notifErr);
    }

    return NextResponse.json({ ok: true, id: result.insertedId });
  } catch (error) {
    console.error("Erreur POST Deliveries:", error);
    return new NextResponse("Erreur Serveur", { status: 500 });
  }
}
