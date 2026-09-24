import "server-only";
import mongoose from "mongoose";
import { env } from "@/lib/env";

/*
 * Compact schemas: no `__v` version key, no `updatedAt` where it is never read, and empty values
 * are not stored. Field names are unchanged so the mobile app and existing documents keep working.
 * Delivery notes live in the `deliveries` collection and are handled in lib/deliveries.ts.
 */

export const ROLES = ["employee", "manager", "admin"] as const;
export type Role = (typeof ROLES)[number];

const UserSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, unique: true, maxlength: 64 },
    email: { type: String, required: true, maxlength: 254 },
    name: { type: String, maxlength: 80 },
    verified: { type: Boolean, default: false },
    site: { type: String, maxlength: 16 },
    role: { type: String, enum: ROLES, default: "employee" },
    pushToken: { type: String, maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false, minimize: true },
);
UserSchema.index({ site: 1 });

export type UserDoc = {
  _id: mongoose.Types.ObjectId;
  clerkId: string;
  email: string;
  name?: string;
  verified: boolean;
  site?: string;
  role: Role;
  pushToken?: string;
  createdAt?: Date;
};

export const User: mongoose.Model<UserDoc> =
  (mongoose.models.User as mongoose.Model<UserDoc>) || mongoose.model<UserDoc>("User", UserSchema);

const CustomProductSchema = new mongoose.Schema(
  {
    uniquename: { type: String, required: true, unique: true, maxlength: 80 },
    typedequantite: { type: String, maxlength: 40 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

export type CustomProductDoc = {
  _id: mongoose.Types.ObjectId;
  uniquename: string;
  typedequantite?: string;
  createdAt?: Date;
};

export const CustomProduct: mongoose.Model<CustomProductDoc> =
  (mongoose.models.CustomProduct as mongoose.Model<CustomProductDoc>) ||
  mongoose.model<CustomProductDoc>("CustomProduct", CustomProductSchema);

// Attendance: one small record per person and day. Timestamps are not needed (dateStr is the key).
const AttendanceSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, maxlength: 64 },
    dateStr: { type: String, required: true, maxlength: 10 },
    status: { type: String, enum: ["FULL", "HALF", "ABSENT", ""] },
    site: { type: String, maxlength: 16 },
  },
  { timestamps: false, versionKey: false },
);
AttendanceSchema.index({ clerkId: 1, dateStr: 1 }, { unique: true });

export const Attendance =
  mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);

const SiteSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, maxlength: 16 },
    name: { type: String, required: true, maxlength: 80 },
    line1: { type: String, maxlength: 120 },
    line2: { type: String, maxlength: 120 },
    active: { type: Boolean, default: true },
  },
  { timestamps: false, versionKey: false },
);

export type SiteDoc = {
  _id: mongoose.Types.ObjectId;
  slug: string;
  name: string;
  line1?: string;
  line2?: string;
  active: boolean;
};

export const Site: mongoose.Model<SiteDoc> =
  (mongoose.models.Site as mongoose.Model<SiteDoc>) || mongoose.model<SiteDoc>("Site", SiteSchema);

// Chat messages: createdAt is used by the app to poll for new messages.
const MessageSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, maxlength: 64 },
    name: { type: String, required: true, maxlength: 80 },
    content: { type: String, required: true, maxlength: 2000 },
    site: { type: String, default: "global", maxlength: 16 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);
MessageSchema.index({ site: 1, createdAt: -1 });

export const Message = mongoose.models.Message || mongoose.model("Message", MessageSchema);

let retentionSync: Promise<void> | null = null;
/**
 * Optional automatic clean-up of old chat messages (CHAT_RETENTION_DAYS, off by default). Checked once
 * per server start: the TTL index is created, updated or removed to follow the setting, so turning it
 * off or changing it takes effect without touching the database by hand.
 */
export function syncChatRetention(): Promise<void> {
  retentionSync ??= (async () => {
    const col = (Message as mongoose.Model<unknown>).collection;
    const seconds = env.chatRetentionDays * 86400;
    const indexes = await col.indexes().catch(() => []);
    const ttl = indexes.find((i) => i.key && Object.keys(i.key).length === 1 && i.key.createdAt === 1);
    if (!seconds) {
      if (ttl?.name && ttl.expireAfterSeconds !== undefined) await col.dropIndex(ttl.name);
      return;
    }
    if (!ttl) await col.createIndex({ createdAt: 1 }, { expireAfterSeconds: seconds });
    else if (ttl.expireAfterSeconds !== seconds) {
      const db = mongoose.connection.db;
      if (db) await db.command({ collMod: col.collectionName, index: { keyPattern: { createdAt: 1 }, expireAfterSeconds: seconds } });
    }
  })().catch((err) => {
    retentionSync = null;
    console.error("chat retention:", err instanceof Error ? err.message : "unknown error");
  });
  return retentionSync;
}
