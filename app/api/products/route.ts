import { NextResponse } from "next/server";
import connectDB from "@/lib/connectDB";
import { CustomProduct } from "@/lib/models";
import produitsRaw from "@/data/produits.json";

export async function GET() {
  try {
    await connectDB();
    const custom = await CustomProduct.find({});
    
    const combined = [...produitsRaw];
    
    // Add custom products not present in raw
    const existingNames = new Set(combined.map(p => p.uniquename.toLowerCase()));
    
    for (const c of custom) {
      if (!existingNames.has(c.uniquename.toLowerCase())) {
        combined.push({
          uniquename: c.uniquename,
          typedequantite: c.typedequantite || "Pièce"
        });
      }
    }

    return NextResponse.json({ ok: true, products: combined });
  } catch (err) {
    console.error(err);
    // Silent fallback to raw if DB fails
    return NextResponse.json({ ok: true, products: produitsRaw });
  }
}

export async function POST(req: Request) {
  try {
    const { name, unit } = await req.json();
    if (!name) return NextResponse.json({ ok: false, error: "Name required" }, { status: 400 });

    await connectDB();
    
    const existing = await CustomProduct.findOne({ uniquename: { $regex: new RegExp(`^${name}$`, "i") } });
    if (!existing) {
      await CustomProduct.create({ uniquename: name, typedequantite: unit || "Pièce" });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
