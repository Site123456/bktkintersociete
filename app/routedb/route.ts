import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/connectDB";

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    // ✔️ Safe assertion — db is guaranteed after connectDB()
    const db = mongoose.connection.db!;

    await db.collection("deliveries").insertOne(body);

    return NextResponse.json({ ok: true, message: "Saved" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
