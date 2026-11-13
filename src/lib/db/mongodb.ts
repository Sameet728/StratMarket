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

const DEFAULT_ATLAS_URI =
  "mongodb://sameetpisal_db_user:0op4uoeZpcVTooaP@ac-ozckia6-shard-00-00.syikpx1.mongodb.net:27017,ac-ozckia6-shard-00-01.syikpx1.mongodb.net:27017,ac-ozckia6-shard-00-02.syikpx1.mongodb.net:27017/stratmarket?ssl=true&replicaSet=atlas-11286g-shard-0&authSource=admin";

const isLocalhostUri = (uri: string | null | undefined) =>
  Boolean(uri && (uri.includes("127.0.0.1") || uri.includes("localhost")));

// Prioritize configured URI, but if running in production and raw URI points to localhost, fall back to Atlas
const MONGODB_URI =
  rawMongoUri && !(process.env.NODE_ENV === "production" && isLocalhostUri(rawMongoUri))
    ? rawMongoUri
    : DEFAULT_ATLAS_URI;

const DB_NAME = process.env.MONGODB_DB_NAME || "stratmarket";

// Global singleton cache across Next.js serverless invocations
declare global {
  var _mongoClient: MongoClient | undefined;
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  var _mongoIndexesEnsured: boolean | undefined;
}

let lastConnectionError: string | null = null;

export function getMongoDiagnostics() {
  const sanitizedTarget = MONGODB_URI.split("@").pop()?.split("?")[0] || "unknown";
  const isConnected = Boolean(global._mongoClient);
  return {
    isConnected,
    isSeeded: Boolean(global._mongoIndexesEnsured),
    targetHost: sanitizedTarget,
    dbName: DB_NAME,
    lastError: lastConnectionError,
  };
}

/**
 * Initializes and caches the singleton MongoDB client across serverless lambdas
 */
export async function getMongoClient(): Promise<MongoClient | null> {
  // If already connected, return cached client immediately
  if (global._mongoClient) {
    return global._mongoClient;
  }

  // In test environment or when VITEST is active, use in-memory repository
  if (process.env.NODE_ENV === "test" || process.env.VITEST === "true" || process.env.USE_IN_MEMORY_DB === "true") {
    return null;
  }

  if (!global._mongoClientPromise) {
    try {
      const options = {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
      };

      const newClient = new MongoClient(MONGODB_URI, options);
      global._mongoClientPromise = newClient
        .connect()
        .then((c) => {
          global._mongoClient = c;
          lastConnectionError = null;
          console.log(`[MongoDB] Connected successfully to ${DB_NAME} at ${MONGODB_URI.split("@").pop()?.split("?")[0]}`);

          // Trigger non-blocking asynchronous background index verification
          if (!global._mongoIndexesEnsured) {
            ensureIndexesAndSeed(c.db(DB_NAME))
              .then(() => {
                global._mongoIndexesEnsured = true;
              })
              .catch((err) => {
                console.warn("[MongoDB] Background indexing note:", err?.message || err);
              });
          }

          return c;
        })
        .catch((err) => {
          const errMsg = err?.message || String(err);
          lastConnectionError = errMsg;
          console.warn("[MongoDB] Connection attempt failed:", errMsg);
          global._mongoClient = undefined;
          global._mongoClientPromise = undefined;
          return null as any;
        });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      lastConnectionError = errMsg;
      console.warn("[MongoDB] Client initialization error:", errMsg);
      global._mongoClient = undefined;
      global._mongoClientPromise = undefined;
      return null;
    }
  }

  try {
    const client = await global._mongoClientPromise;
    if (client) {
      global._mongoClient = client;
      return client;
    }
    return null;
  } catch (err: any) {
    lastConnectionError = err?.message || String(err);
    global._mongoClient = undefined;
    global._mongoClientPromise = undefined;
    return null;
  }
}

/**
 * Returns the active MongoDB database instance, or null if offline
 */
export async function getMongoDb(): Promise<Db | null> {
  try {
    const c = await getMongoClient();
    if (!c) return null;
    return c.db(DB_NAME);
  } catch (err) {
    return null;
  }
}

export function isMongoActive(): boolean {
  return Boolean(global._mongoClient);
}

/**
 * Creates required indexes and seeds initial dataset on first connection
 */
async function ensureIndexesAndSeed(db: Db): Promise<void> {
  if (global._mongoIndexesEnsured) return;

  try {
    // 1. Ensure Indexes safely
    const indexPromises = [
      db.collection("users").createIndex({ email: 1 }, { unique: true }).catch(() => {}),
      db.collection("strategies").createIndex({ id: 1 }, { unique: true }).catch(() => {}),
      db.collection("strategies").createIndex({ slug: 1 }, { unique: true }).catch(() => {}),
      db.collection("signals").createIndex({ sourceEventId: 1 }, { unique: true, sparse: true }).catch(() => {}),
      db.collection("signals").createIndex({ strategyId: 1, timestamp: -1 }).catch(() => {}),
      db.collection("trials").createIndex({ userId: 1, strategyId: 1 }).catch(() => {}),
      db.collection("entitlements").createIndex({ userId: 1, strategyId: 1 }).catch(() => {}),
      db.collection("alert_preferences").createIndex({ userId: 1, strategyId: 1 }, { unique: true }).catch(() => {}),
      db.collection("deliveries").createIndex({ signalId: 1, recipientEmail: 1 }).catch(() => {}),
    ];
    await Promise.all(indexPromises);

    // 2. Ensure all canonical strategies are synchronized and up-to-date in MongoDB Atlas
    for (const s of INITIAL_STRATEGIES) {
      await db.collection("strategies").updateOne(
        { id: s.id },
        { $set: { ...s } },
        { upsert: true }
      ).catch(() => {});
    }

    // 3. Ensure evaluation and primary accounts exist
    const defaultPassword = bcrypt.hashSync("Elvaris2026!", 10);
    const primaryUsers = [
      {
        id: "usr_admin_01",
        name: "Elvaris Admin",
        email: "admin@elvariscapital.in",
        role: "ADMIN",
      },
      {
        id: "usr_customer_01",
        name: "Quantitative Trader",
        email: "trader@elvariscapital.in",
        role: "CUSTOMER",
      },
      {
        id: "usr_sam_01",
        name: "sam",
        email: "sameetpisal728@gmail.com",
        role: "CUSTOMER",
      },
      {
        id: "usr_sam_02",
        name: "Sameet Pisal",
        email: "sameetpisal@gmail.com",
        role: "CUSTOMER",
      },
    ];

    for (const u of primaryUsers) {
      await db.collection("users").updateOne(
        { email: u.email },
        {
          $setOnInsert: {
            id: u.id,
            name: u.name,
            email: u.email,
            passwordHash: defaultPassword,
            role: u.role,
            accountStatus: "ACTIVE",
            emailVerified: true,
            createdAt: new Date("2026-01-01"),
            updatedAt: new Date("2026-01-01"),
          },
        },
        { upsert: true }
      ).catch(() => {});
    }

    // 4. Ensure guaranteed alert preferences for active strategies exist in Atlas
    const guaranteedPrefs = [
      { userId: "usr_sam_01", strategyId: "PS-01", destination: "sameetpisal728@gmail.com" },
      { userId: "usr_sam_01", strategyId: "PS-02", destination: "sameetpisal728@gmail.com" },
      { userId: "usr_sam_01", strategyId: "PS-03", destination: "sameetpisal728@gmail.com" },
      { userId: "usr_sam_01", strategyId: "ALL", destination: "sameetpisal728@gmail.com" },
      { userId: "usr_7aqty30mf", strategyId: "PS-01", destination: "geminivedant1@gmail.com" },
      { userId: "usr_7aqty30mf", strategyId: "PS-02", destination: "geminivedant1@gmail.com" },
      { userId: "usr_7aqty30mf", strategyId: "PS-03", destination: "geminivedant1@gmail.com" },
    ];

    for (const gp of guaranteedPrefs) {
      await db.collection("alert_preferences").updateOne(
        { userId: gp.userId, strategyId: gp.strategyId },
        {
          $set: {
            enabled: true,
            alertTypes: ["ENTRY", "EXIT", "STOP_LOSS", "TAKE_PROFIT"],
            verifiedDestination: gp.destination,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            id: "alt_" + Math.random().toString(36).substring(2, 11),
            createdAt: new Date(),
          },
        },
        { upsert: true }
      ).catch(() => {});
    }

    global._mongoIndexesEnsured = true;
  } catch (err: any) {
    console.warn("[MongoDB] Index/Seed check completed with note:", err?.message || err);
  }
}
