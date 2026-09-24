import "server-only";

/**
 * Server-side settings. Nothing here is ever sent to the browser.
 *
 * - MONGOSEDB_URI   MongoDB connection string (name kept for the existing Vercel setup).
 * - API_SECRET      Key(s) used by the mobile app in the `x-api-key` header. Several keys can be
 *                   given separated by commas, so a new key can be rolled out before the old one
 *                   is removed.
 * - PUBLIC_BASE_URL Public address of the app, used in QR codes and PDF links.
 * - CHAT_RETENTION_DAYS  Optional. When set (e.g. 180), chat messages older than this are deleted
 *                   automatically by MongoDB (TTL index). Not set = messages are kept.
 */
export const env = {
  mongoUri: process.env.MONGOSEDB_URI || process.env.MONGODB_URI || "",
  apiKeys: (process.env.API_SECRET || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean),
  baseUrl: (process.env.PUBLIC_BASE_URL || "https://bktk.indian-nepaliswad.fr").replace(/\/+$/, ""),
  chatRetentionDays: Number(process.env.CHAT_RETENTION_DAYS || 0) || 0,
};
