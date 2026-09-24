import type mongoose from "mongoose";
import { z } from "zod";
import connectDB from "@/lib/connectDB";
import { getCaller } from "@/lib/auth";
import { badRequest, forbidden, json, rateLimit, readBody, serverError, unauthorized } from "@/lib/http";
import { Attendance, User, type Role, type UserDoc } from "@/lib/models";
import { SITE_SLUG_RE } from "@/lib/sites";
import { ymd } from "@/lib/validation";

/*
 * Attendance (présences) used by the mobile app (x-api-key) and validated website users.
 * With the key, the person named in the request is re-checked in the database.
 * Writing for someone else requires a manager or an admin.
 */

type AttendanceRow = {
  _id: mongoose.Types.ObjectId;
  clerkId: string;
  dateStr: string;
  status?: "FULL" | "HALF" | "ABSENT" | "";
  site?: string;
};
const AttendanceModel = Attendance as mongoose.Model<AttendanceRow>;

const RECORD_FIELDS = { clerkId: 1, dateStr: 1, status: 1, site: 1 } as const;
const CLERK_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const clerkId = z.string().regex(CLERK_ID_RE, "clerkId invalide");
const MANAGERS: Role[] = ["manager", "admin"];

const isRealYmd = (s: string) => {
  const t = new Date(`${s}T00:00:00Z`).getTime();
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
};

type Requester = Pick<UserDoc, "clerkId" | "role" | "verified">;

async function findUser(id: string): Promise<Requester | null> {
  return User.findOne({ clerkId: id }, { clerkId: 1, role: 1, verified: 1, _id: 0 }).lean<Requester>();
}

export async function GET(req: Request) {
  try {
    const caller = await getCaller(req);
    if (!caller) return unauthorized();
    await connectDB();

    let me: Requester | null = null;
    if (caller.kind === "app") {
      const limited = rateLimit(req, "attendance:get", 120);
      if (limited) return limited;
    } else {
      me = await findUser(caller.clerkId);
      if (!me?.verified) return forbidden("Compte non validé");
    }

    const params = new URL(req.url).searchParams;
    const site = params.get("site");
    const wanted = params.get("clerkId");

    // Everyone at a site with their attendance.
    if (site) {
      if (!SITE_SLUG_RE.test(site)) return badRequest("Invalid site");
      if (me && !MANAGERS.includes(me.role)) return forbidden("Accès refusé");
      const withEmail = caller.kind === "app" || me?.role === "admin";
      const siteUsers = await User.find({ site, verified: true }, { clerkId: 1, name: 1, email: 1, _id: 0 }).lean<
        Pick<UserDoc, "clerkId" | "name" | "email">[]
      >();
      const records = await AttendanceModel.find({ clerkId: { $in: siteUsers.map((u) => u.clerkId) } }, RECORD_FIELDS).lean();
      return json({
        ok: true,
        users: siteUsers.map((u) => (withEmail ? { clerkId: u.clerkId, name: u.name, email: u.email } : { clerkId: u.clerkId, name: u.name })),
        records,
      });
    }

    // One person's attendance.
    const target = wanted || me?.clerkId;
    if (!target) return badRequest("clerkId or site required");
    if (!CLERK_ID_RE.test(target)) return badRequest("Invalid clerkId");
    if (me && target !== me.clerkId && !MANAGERS.includes(me.role)) return forbidden("Accès refusé");

    const person = target === me?.clerkId ? me : await findUser(target);
    if (!person?.verified) return json({ ok: true, records: [] });
    const records = await AttendanceModel.find({ clerkId: target }, RECORD_FIELDS).lean();
    return json({ ok: true, records });
  } catch (err) {
    console.error("GET /api/attendance:", err instanceof Error ? err.message : "unknown error");
    return serverError();
  }
}

const recordSchema = z.object({
  dateStr: ymd.refine(isRealYmd, "Date invalide"),
  status: z.enum(["FULL", "HALF", "ABSENT", ""]),
  site: z
    .string()
    .max(16)
    .regex(/^[A-Za-z0-9_-]*$/, "Site invalide")
    .nullish(),
  targetClerkId: z.union([clerkId, z.literal("")]).nullish(),
});

const postSchema = z.object({
  clerkId: clerkId.optional(),
  records: z.array(recordSchema).max(400),
});

export async function POST(req: Request) {
  try {
    const caller = await getCaller(req);
    if (!caller) return unauthorized();
    const limited = rateLimit(req, "attendance:post", 30);
    if (limited) return limited;

    const body = await readBody(req, postSchema);
    if ("error" in body) return body.error;

    // Session: identity from Clerk only. Key: the named person must exist.
    const requesterId = caller.kind === "session" ? caller.clerkId : body.data.clerkId;
    if (!requesterId) return badRequest("Invalid payload");

    await connectDB();
    const me = await findUser(requesterId);
    if (!me?.verified) return forbidden("Compte non validé");

    // One write per person and day (the last value wins).
    const byKey = new Map<string, { target: string; dateStr: string; status: AttendanceRow["status"]; site: string }>();
    for (const r of body.data.records) {
      const target = r.targetClerkId || requesterId;
      byKey.set(`${target}|${r.dateStr}`, { target, dateStr: r.dateStr, status: r.status, site: r.site || "" });
    }

    const others = [...new Set([...byKey.values()].map((r) => r.target).filter((t) => t !== requesterId))];
    if (others.length > 0) {
      if (!MANAGERS.includes(me.role)) return forbidden("Accès refusé");
      const known = await User.countDocuments({ clerkId: { $in: others } });
      if (known !== others.length) return badRequest("Unknown user");
    }

    if (byKey.size > 0) {
      await AttendanceModel.bulkWrite(
        [...byKey.values()].map((r) => ({
          updateOne: {
            filter: { clerkId: r.target, dateStr: r.dateStr },
            update: r.site ? { $set: { status: r.status, site: r.site } } : { $set: { status: r.status }, $unset: { site: 1 as const } },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }

    return json({ ok: true });
  } catch (err) {
    console.error("POST /api/attendance:", err instanceof Error ? err.message : "unknown error");
    return serverError();
  }
}
