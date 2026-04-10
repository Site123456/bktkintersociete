import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    
    // In-memory or ENV check
    const validUsername = process.env.ADMIN_USERNAME || "admin";
    const validPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (username === validUsername && password === validPassword) {
      // Set simple cookie
      const cookieStore = await cookies();
      cookieStore.set("admin_session", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 // 1 day
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
