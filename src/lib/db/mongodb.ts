// StratMarket MongoDB Database Client & Connection Manager
// Provides high-performance, resilient MongoDB connection with automatic collection indexing and seeding

import { MongoClient, Db, Collection } from "mongodb";
import { INITIAL_STRATEGIES, StrategySeedItem } from "./seed-data";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Auto-load .env or .env.local if running in standalone scripts or VPS processes
try {
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  const envPath = path.resolve(process.cwd(), ".env");
  const targetEnv = fs.existsSync(envLocalPath) ? envLocalPath : fs.existsSync(envPath) ? envPath : null;
  if (targetEnv) {
    const raw = fs.readFileSync(targetEnv, "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        let val = trimmed.substring(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (_) {}

const rawMongoUri =
  process.env.MONGODB_URI ||
  (process.env.DATABASE_URL?.startsWith("mongodb") ? process.env.DATABASE_URL : null);

// Prioritize configured URI (including local MongoDB instances: 127.0.0.1 / localhost)
const MONGODB_URI = rawMongoUri || "mongodb://127.0.0.1:27017/stratmarket";

const DB_NAME = process.env.MONGODB_DB_NAME || "stratmarket";

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;
let isConnected = false;
let isSeeded = false;
let lastFailedAttempt = 0;
const RETRY_COOLDOWN_MS = 30000; // 30s cooldown if offline to avoid spamming timeouts

/**
 * Initializes and caches the singleton MongoDB client
 */
export async function getMongoClient(): Promise<MongoClient | null> {
  if (client && isConnected) {
    return client;
  }

  // If we already attempted and failed recently, return null immediately without delay
  if (!isConnected && Date.now() - lastFailedAttempt < RETRY_COOLDOWN_MS) {
    return null;
  }

  // In test environment without explicit MONGODB_URI set, default to immediate in-memory repository
  if (process.env.NODE_ENV === "test" && !process.env.MONGODB_URI) {
    return null;
  }

  if (!clientPromise) {
    try {
      const options = {
        serverSelectionTimeoutMS: 1500,
        connectTimeoutMS: 2000,
        maxPoolSize: 20,
      };

      const newClient = new MongoClient(MONGODB_URI, options);
      clientPromise = newClient
        .connect()
        .then(async (c) => {
          client = c;
          isConnected = true;
          console.log(`[MongoDB] Connected successfully to ${DB_NAME} at ${MONGODB_URI.split("@").pop()?.split("?")[0]}`);
          await ensureIndexesAndSeed(c.db(DB_NAME));
          return c;
        })
        .catch((err) => {
          console.warn("[MongoDB] Connection attempt failed, falling back to in-memory store:", err?.message || err);
          isConnected = false;
          lastFailedAttempt = Date.now();
          clientPromise = null;
          client = null;
          return null as any;
        });
    } catch (err: any) {
      console.warn("[MongoDB] Client initialization error:", err?.message || err);
      isConnected = false;
      lastFailedAttempt = Date.now();
      clientPromise = null;
      return null;
    }
  }

  return clientPromise;
}

/**
 * Returns the active MongoDB database instance, or null if offline
 */
export async function getMongoDb(): Promise<Db | null> {
  const c = await getMongoClient();
  if (!c || !isConnected) return null;
  return c.db(DB_NAME);
}

export function isMongoActive(): boolean {
  return isConnected;
}

/**
 * Creates required indexes and seeds initial dataset on first connection
 */
async function ensureIndexesAndSeed(db: Db): Promise<void> {
  if (isSeeded) return;

  try {
    // 1. Ensure Indexes
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("strategies").createIndex({ id: 1 }, { unique: true });
    await db.collection("strategies").createIndex({ slug: 1 }, { unique: true });
    await db.collection("signals").createIndex({ sourceEventId: 1 }, { unique: true, sparse: true });
    await db.collection("signals").createIndex({ strategyId: 1, timestamp: -1 });
    await db.collection("trials").createIndex({ userId: 1, strategyId: 1 });
    await db.collection("entitlements").createIndex({ userId: 1, strategyId: 1 });
    await db.collection("alert_preferences").createIndex({ userId: 1, strategyId: 1 }, { unique: true });

    // 2. Seed Strategies if collection is empty
    const stratCount = await db.collection("strategies").countDocuments();
    if (stratCount === 0) {
      console.log(`[MongoDB] Seeding initial ${INITIAL_STRATEGIES.length} strategies into collection...`);
      await db.collection("strategies").insertMany(INITIAL_STRATEGIES.map((s) => ({ ...s })));
    }

    // 3. Seed Users if collection is empty
    const userCount = await db.collection("users").countDocuments();
    if (userCount === 0) {
      console.log("[MongoDB] Seeding evaluation accounts (admin & trader)...");
      const defaultPassword = bcrypt.hashSync("Elvaris2026!", 10);
      await db.collection("users").insertMany([
        {
          id: "usr_admin_01",
          name: "Elvaris Admin",
          email: "admin@elvariscapital.in",
          passwordHash: defaultPassword,
          role: "ADMIN",
          accountStatus: "ACTIVE",
          emailVerified: true,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
        },
        {
          id: "usr_customer_01",
          name: "Quantitative Trader",
          email: "trader@elvariscapital.in",
          passwordHash: defaultPassword,
          role: "CUSTOMER",
          accountStatus: "ACTIVE",
          emailVerified: true,
          createdAt: new Date("2026-02-01"),
          updatedAt: new Date("2026-02-01"),
        },
      ]);
    }

    isSeeded = true;
  } catch (err: any) {
    console.warn("[MongoDB] Index/Seed check completed with note:", err?.message || err);
  }
}
