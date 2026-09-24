import type mongoose from "mongoose";
import { z } from "zod";
import connectDB from "@/lib/connectDB";
import { getCaller, getSessionUser } from "@/lib/auth";
import { badRequest, forbidden, json, rateLimit, readBody, serverError, unauthorized } from "@/lib/http";
import { Message, User, syncChatRetention, type UserDoc } from "@/lib/models";

/*
 * Team chat (per site, or "global"). Mobile app (x-api-key) or validated website users.
 * The author must be a validated user; the stored name comes from the database.
 */

type MessageRow = {
  _id: mongoose.Types.ObjectId;
  clerkId: string;
  name: string;
  content: string;
  site: string;
  createdAt: Date;
};
const MessageModel = Message as mongoose.Model<MessageRow>;

const FIELDS = { clerkId: 1, name: 1, content: 1, site: 1, createdAt: 1 } as const;
const ROOM_RE = /^[A-Za-z0-9_-]{1,16}$/;
const CLERK_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

const view = (m: MessageRow) => ({
  _id: String(m._id),
  clerkId: m.clerkId,
  name: m.name,
  content: m.content,
  site: m.site,
  createdAt: m.createdAt,
});

export async function GET(req: Request) {
  try {
    const caller = await getCaller(req);
    if (!caller) return unauthorized();
    if (caller.kind === "app") {
      // The app polls this route; several phones can share one restaurant connection.
      const limited = rateLimit(req, "chat:get", 300);
      if (limited) return limited;
    } else {
      const user = await getSessionUser(caller.clerkId);
      if (!user?.verified) return forbidden("Compte non validé");
    }

    const params = new URL(req.url).searchParams;
    const site = params.get("site") || "global";
    if (!ROOM_RE.test(site)) return badRequest("Invalid site");
    const n = Number.parseInt(params.get("limit") || "", 10);
    const limit = Number.isFinite(n) ? Math.min(Math.max(n, 1), 200) : 50;

    const filter: { site: string; createdAt?: { $gt: Date } } = { site };
    const sinceRaw = params.get("since");
    if (sinceRaw && sinceRaw.length <= 40) {
      const since = new Date(sinceRaw);
      if (!Number.isNaN(since.getTime())) filter.createdAt = { $gt: since };
    }

    await connectDB();
    void syncChatRetention();
    const rows = await MessageModel.find(filter, FIELDS).sort({ createdAt: -1 }).limit(limit).lean();
    return json({ ok: true, messages: rows.reverse().map(view) });
  } catch (err) {
    console.error("GET /api/chat:", err instanceof Error ? err.message : "unknown error");
    return serverError();
  }
}

const postSchema = z.object({
  clerkId: z.string().regex(CLERK_ID_RE).optional(),
  name: z.string().max(200).nullish(),
  content: z
    .string()
    // Keep line breaks, remove other control characters.
    .transform((s) => s.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, " ").trim())
    .pipe(z.string().min(1, "Message vide").max(2000, "Message trop long")),
  // "" (sent by the app for the general room) falls back to "global" below, as before.
  site: z.union([z.literal(""), z.string().regex(ROOM_RE)]).nullish(),
});

const cleanName = (s: string | null | undefined) =>
  (s || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

export async function POST(req: Request) {
  try {
    const caller = await getCaller(req);
    if (!caller) return unauthorized();
    const limited = rateLimit(req, "chat:post", 60);
    if (limited) return limited;

    const body = await readBody(req, postSchema);
    if ("error" in body) return body.error;

    // Session: identity from Clerk. Key: the named person must exist and be validated.
    const authorId = caller.kind === "session" ? caller.clerkId : body.data.clerkId;
    if (!authorId) return badRequest("Missing required fields");

    await connectDB();
    void syncChatRetention();
    const author = await User.findOne({ clerkId: authorId }, { clerkId: 1, name: 1, verified: 1, _id: 0 }).lean<
      Pick<UserDoc, "clerkId" | "name" | "verified">
    >();
    if (!author?.verified) return forbidden("Compte non validé");

    const name = cleanName(author.name) || (caller.kind === "app" ? cleanName(body.data.name) : "") || "Utilisateur";
    const created = await MessageModel.create({
      clerkId: authorId,
      name,
      content: body.data.content,
      site: body.data.site || "global",
    });
    return json({ ok: true, message: view(created.toObject()) });
  } catch (err) {
    console.error("POST /api/chat:", err instanceof Error ? err.message : "unknown error");
    return serverError();
  }
}
