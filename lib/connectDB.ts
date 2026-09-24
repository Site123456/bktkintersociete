import "server-only";
import mongoose from "mongoose";
import { env } from "@/lib/env";

/**
 * One shared MongoDB connection per server instance (Vercel functions reuse warm instances).
 * The pending promise is cached too, so parallel requests never open several connections.
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = globalThis as typeof globalThis & { __bktkMongo?: Cache };
const cache: Cache = (g.__bktkMongo ??= { conn: null, promise: null });

export default async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;
  if (!env.mongoUri) throw new Error("MONGOSEDB_URI is not set");
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(env.mongoUri, {
        maxPoolSize: 5, // small pool: serverless functions are short-lived
        serverSelectionTimeoutMS: 8000,
        bufferCommands: false,
      })
      .catch((err) => {
        cache.promise = null;
        console.error("MongoDB connection error:", err instanceof Error ? err.message : err);
        throw new Error("Failed to connect to MongoDB");
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

/** Native database handle (for the `deliveries` collection, which keeps legacy documents). */
export async function getDb() {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB is not connected");
  return db;
}
