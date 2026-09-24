import { z } from "zod";
import connectDB from "@/lib/connectDB";
import { getCaller } from "@/lib/auth";
import { json, rateLimit, readBody } from "@/lib/http";
import { User, type UserDoc } from "@/lib/models";
import { ensureUser } from "@/lib/users";
import { getSitesMap } from "@/lib/deliveries";
import { PUSH_TOKEN_RE } from "@/lib/push";
import { SITE_SLUG_RE } from "@/lib/sites";

/*
 * Account status for the mobile app (x-api-key) and the website (Clerk session).
 * - Key: the app sends the Clerk id and profile (legacy behaviour).
 * - Session: identity, name and e-mail come from Clerk only; the site can be chosen.
 * `verified` and `role` can never be changed here (admins do it in the admin page).
 */

const CLERK_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const unauthorized = () => json({ ok: false, message: "Unauthorized" }, 401);
const invalid = (message: string) => json({ ok: false, message }, 400);

type Row = Pick<UserDoc, "_id" | "name" | "site" | "verified" | "role">;
const FIELDS = { name: 1, site: 1, verified: 1, role: 1 } as const;

const status = (u: Row) => ({
  ok: true,
  verified: u.verified === true,
  site: u.site || "",
  role: u.role || "employee",
  name: u.name,
  userId: String(u._id),
});

export async function GET(req: Request) {
  try {
    const caller = await getCaller(req);
    if (!caller) return unauthorized();

    let user: Row | null;
    if (caller.kind === "session") {
      user = await ensureUser(caller.clerkId);
    } else {
      const limited = rateLimit(req, "user-sync:get", 120);
      if (limited) return limited;
      const clerkId = new URL(req.url).searchParams.get("clerkId");
      if (!clerkId) return invalid("clerkId is required");
      if (!CLERK_ID_RE.test(clerkId)) return invalid("Invalid clerkId");
      await connectDB();
      user = await User.findOne({ clerkId }, FIELDS).lean<Row>();
    }
    if (!user) return json({ ok: false, message: "User not found" }, 404);

    return json({ ok: true, name: user.name, site: user.site || "", verified: user.verified === true, role: user.role || "employee" });
  } catch (err) {
    console.error("GET /api/user/sync:", err instanceof Error ? err.message : "unknown error");
    return json({ ok: false, error: "Internal Server Error" }, 500);
  }
}

const cleanText = (s: string, max: number) =>
  s
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const emailSchema = z.email().max(254);

// Lenient on purpose: the mobile app cannot be updated, so a bad optional field is ignored for it
// (never stored) instead of failing the whole sync. Website sessions get a 400.
const postSchema = z.object({
  clerkId: z.string().regex(CLERK_ID_RE, "Invalid clerkId").optional(),
  email: z.string().max(320).nullish(),
  name: z.string().max(500).nullish(),
  site: z.string().max(40).nullish(),
  pushToken: z.string().max(500).nullish(),
});

export async function POST(req: Request) {
  try {
    const caller = await getCaller(req);
    if (!caller) return unauthorized();
    const limited = rateLimit(req, "user-sync:post", 30);
    if (limited) return limited;

    const body = await readBody(req, postSchema);
    if ("error" in body) return body.error;
    const { site, pushToken } = body.data;
    const isSession = caller.kind === "session";

    let clerkId: string;
    const set: Record<string, string> = {};
    const unset: Record<string, 1> = {};

    await connectDB();
    if (isSession) {
      // Name and e-mail are refreshed from Clerk; anything in the body about identity is ignored.
      clerkId = caller.clerkId;
      const existing = await ensureUser(clerkId);
      if (!existing) return unauthorized();
    } else {
      if (!body.data.clerkId) return invalid("clerkId is required");
      clerkId = body.data.clerkId;
      const name = cleanText(body.data.name || "", 80);
      if (name) set.name = name;
      const email = (body.data.email || "").trim().toLowerCase();
      if (email && emailSchema.safeParse(email).success) set.email = email;
    }

    if (site !== undefined && site !== null) {
      const code = site.trim();
      if (code === "") unset.site = 1;
      else if (SITE_SLUG_RE.test(code) && (await getSitesMap()).has(code)) set.site = code;
      else if (isSession) return invalid("Unknown site");
    }
    if (pushToken !== undefined && pushToken !== null) {
      const token = pushToken.trim();
      if (token === "") unset.pushToken = 1;
      else if (token.length <= 200 && PUSH_TOKEN_RE.test(token)) set.pushToken = token;
      else if (isSession) return invalid("Invalid pushToken");
    }

    const update: Record<string, unknown> = { $setOnInsert: { verified: false, role: "employee" } };
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;

    const user = await User.findOneAndUpdate({ clerkId }, update, {
      upsert: true,
      returnDocument: "after",
      projection: FIELDS,
    }).lean<Row>();
    if (!user) return json({ ok: false, error: "Internal Server Error" }, 500);

    // A phone signs in with another account: stop sending the previous account's notifications to it.
    if (set.pushToken) {
      await User.updateMany({ pushToken: set.pushToken, clerkId: { $ne: clerkId } }, { $unset: { pushToken: 1 } });
    }

    return json(status(user));
  } catch (err) {
    console.error("POST /api/user/sync:", err instanceof Error ? err.message : "unknown error");
    return json({ ok: false, error: "Internal Server Error" }, 500);
  }
}
