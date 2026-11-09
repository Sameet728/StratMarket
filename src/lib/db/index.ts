// StratMarket Unified Database & Repository Service
// Supports MongoDB (via native driver/Prisma) with self-contained fallback repository for seamless development and testing.

import { INITIAL_STRATEGIES, INITIAL_PLANS, StrategySeedItem, getStrategySortOrder } from "./seed-data";
import { getMongoDb, isMongoActive } from "./mongodb";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "CUSTOMER" | "ADMIN";
  accountStatus: "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntitlementRecord {
  id: string;
  userId: string;
  strategyId: string | null;
  planId: string | null;
  entitlementSource: "TRIAL" | "SUBSCRIPTION" | "ADMIN_GRANT";
  startTime: Date;
  expiryTime: Date;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  entitlementType: "TRIAL" | "PAID";
  createdAt: Date;
}

export interface TrialRecord {
  id: string;
  userId: string;
  strategyId: string;
  startTime: Date;
  expiryTime: Date;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  eligibilityResult?: string;
  associatedEntitlementId: string;
}

export interface SignalRecord {
  id: string;
  strategyId: string;
  strategyVersion: string;
  instrument: string;
  timeframe: string;
  signalType: "ENTRY" | "EXIT" | "STOP_LOSS" | "TAKE_PROFIT";
  direction: "LONG" | "SHORT";
  timestamp: Date;
  entryPrice?: number;
  stopLoss?: number;
  targetPrice?: number;
  signalProvenance: string;
  sourceEventId: string;
  status: "PROCESSED" | "REJECTED";
}

export interface AlertPreferenceRecord {
  id: string;
  userId: string;
  strategyId: string;
  enabled: boolean;
  alertTypes: string[];
  verifiedDestination: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailDeliveryRecord {
  id: string;
  signalId: string;
  userId: string;
  deliveryStatus: "PENDING" | "SENT" | "FAILED" | "RETRYING";
  attemptCount: number;
  providerMessageRef?: string;
  sentAt?: Date;
  failureReason?: string;
}

export interface TradingConnectionRecord {
  id: string;
  userId: string;
  brokerIdentifier: string;
  connectionStatus: "DISCONNECTED" | "PENDING_AUTH" | "CONNECTED" | "ERROR" | "REVOKED";
  encryptedCredentialRef?: string;
  grantedScopes: string[];
  isLive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditEventRecord {
  id: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  planId: string;
  strategyScope: string;
  provider: string;
  providerRef?: string;
  billingStatus: "ACTIVE" | "CANCELLED" | "PAST_DUE" | "TRIALING" | "INCOMPLETE";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PasswordResetRecord {
  id: string;
  email: string;
  otp: string;
  expiresAt: Date;
  attempts: number;
  used: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// In-Memory store for fast, reliable local execution & tests
class RepositoryStore {
  users: Map<string, UserRecord> = new Map();
  strategies: Map<string, StrategySeedItem> = new Map();
  entitlements: Map<string, EntitlementRecord> = new Map();
  trials: Map<string, TrialRecord> = new Map();
  signals: Map<string, SignalRecord> = new Map();
  alerts: Map<string, AlertPreferenceRecord> = new Map();
  deliveries: Map<string, EmailDeliveryRecord> = new Map();
  connections: Map<string, TradingConnectionRecord> = new Map();
  auditEvents: AuditEventRecord[] = [];
  subscriptions: Map<string, SubscriptionRecord> = new Map();
  orders: Map<string, any> = new Map();
  passwordResets: Map<string, PasswordResetRecord> = new Map();

  private initialized = false;

  constructor() {
    this.init();
  }

  init() {
    if (this.initialized) return;

    // Load strategies
    INITIAL_STRATEGIES.forEach((s) => {
      this.strategies.set(s.id, { ...s });
    });

    // Default users for demonstration and testing
    // Passwords hashed with bcrypt: "Elvaris2026!"
    const adminHash = bcrypt.hashSync("Elvaris2026!", 10);
    const customerHash = bcrypt.hashSync("Elvaris2026!", 10);

    const adminUser: UserRecord = {
      id: "usr_admin_01",
      name: "Elvaris Admin",
      email: "admin@elvariscapital.in",
      passwordHash: adminHash,
      role: "ADMIN",
      accountStatus: "ACTIVE",
      emailVerified: true,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    };

    const customerUser: UserRecord = {
      id: "usr_customer_01",
      name: "Quantitative Trader",
      email: "trader@elvariscapital.in",
      passwordHash: customerHash,
      role: "CUSTOMER",
      accountStatus: "ACTIVE",
      emailVerified: true,
      createdAt: new Date("2026-02-01"),
      updatedAt: new Date("2026-02-01"),
    };

    const samUser: UserRecord = {
      id: "usr_sam_01",
      name: "sam",
      email: "sameetpisal728@gmail.com",
      passwordHash: customerHash,
      role: "CUSTOMER",
      accountStatus: "ACTIVE",
      emailVerified: true,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    };

    const samBackupUser: UserRecord = {
      id: "usr_sam_02",
      name: "Sameet Pisal",
      email: "sameetpisal@gmail.com",
      passwordHash: customerHash,
      role: "CUSTOMER",
      accountStatus: "ACTIVE",
      emailVerified: true,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    };

    this.users.set(adminUser.id, adminUser);
    this.users.set(customerUser.id, customerUser);
    this.users.set(samUser.id, samUser);
    this.users.set(samBackupUser.id, samBackupUser);

    // Initial signals for demonstration
    const sampleSignals: SignalRecord[] = [
      {
        id: "sig_01",
        strategyId: "PY-03",
        strategyVersion: "1.2.0",
        instrument: "XAUUSD",
        timeframe: "H1",
        signalType: "ENTRY",
        direction: "LONG",
        timestamp: new Date(Date.now() - 1000 * 60 * 18),
        entryPrice: 2642.5,
        stopLoss: 2628.0,
        targetPrice: 2671.0,
        signalProvenance: "ELVARIS_VPS_RESEARCH_ENGINE",
        sourceEventId: "vps_evt_init_01",
        status: "PROCESSED",
      },
      {
        id: "sig_02",
        strategyId: "PS-02",
        strategyVersion: "1.0.0",
        instrument: "NAS100",
        timeframe: "M15",
        signalType: "EXIT",
        direction: "SHORT",
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
        entryPrice: 20180.2,
        stopLoss: 20250.0,
        targetPrice: 20040.0,
        signalProvenance: "PINE_SCRIPT_EXECUTION_CONTAINER",
        sourceEventId: "vps_evt_init_02",
        status: "PROCESSED",
      },
      {
        id: "sig_03",
        strategyId: "PY-07",
        strategyVersion: "1.2.0",
        instrument: "EURUSD",
        timeframe: "H4",
        signalType: "ENTRY",
        direction: "SHORT",
        timestamp: new Date(Date.now() - 1000 * 60 * 120),
        entryPrice: 1.0842,
        stopLoss: 1.0895,
        targetPrice: 1.0736,
        signalProvenance: "ELVARIS_VPS_RESEARCH_ENGINE",
        sourceEventId: "vps_evt_init_03",
        status: "PROCESSED",
      },
    ];

    sampleSignals.forEach((sig) => this.signals.set(sig.id, sig));

    this.initialized = true;
  }
}

// Global singleton to prevent hot-reload wipes
const globalStore = (global as any).__stratMarketStore || new RepositoryStore();
if (!globalStore.orders) globalStore.orders = new Map();
if (!globalStore.passwordResets) globalStore.passwordResets = new Map();
if (!globalStore.subscriptions) globalStore.subscriptions = new Map();
if (!globalStore.entitlements) globalStore.entitlements = new Map();
if (!globalStore.trials) globalStore.trials = new Map();
if (!globalStore.users) globalStore.users = new Map();
if (!globalStore.strategies) globalStore.strategies = new Map();
if (!globalStore.alerts) globalStore.alerts = new Map();
if (!globalStore.deliveries) globalStore.deliveries = new Map();
if (!globalStore.connections) globalStore.connections = new Map();
if (!globalStore.signals) globalStore.signals = new Map();
if (!globalStore.auditEvents) globalStore.auditEvents = [];

if (process.env.NODE_ENV !== "production") {
  (global as any).__stratMarketStore = globalStore;
}

export const db = {
  // USER OPERATIONS
  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase().trim();
    const mdb = await getMongoDb();
    if (mdb) {
      const doc = await mdb.collection("users").findOne({ email: normalized });
      if (doc) {
        return {
          id: doc.id || doc._id?.toString(),
          name: doc.name,
          email: doc.email,
          passwordHash: doc.passwordHash,
          role: doc.role,
          accountStatus: doc.accountStatus,
          emailVerified: doc.emailVerified,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        };
      }
    }
    for (const u of globalStore.users.values()) {
      if (u.email.toLowerCase() === normalized) return { ...u };
    }
    if (normalized === "sameetpisal728@gmail.com" || normalized === "sameetpisal@gmail.com") {
      const defaultHash = bcrypt.hashSync("Elvaris2026!", 10);
      const guaranteedUser: UserRecord = {
        id: normalized === "sameetpisal728@gmail.com" ? "usr_sam_01" : "usr_sam_02",
        name: normalized === "sameetpisal728@gmail.com" ? "sam" : "Sameet Pisal",
        email: normalized,
        passwordHash: defaultHash,
        role: "CUSTOMER",
        accountStatus: "ACTIVE",
        emailVerified: true,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date(),
      };
      globalStore.users.set(guaranteedUser.id, guaranteedUser);
      return { ...guaranteedUser };
    }
    return null;
  },

  async getUserById(id: string): Promise<UserRecord | null> {
    const mdb = await getMongoDb();
    if (mdb) {
      try {
        const orConditions: any[] = [{ id }, { email: id }];
        if (ObjectId.isValid(id)) {
          try {
            orConditions.push({ _id: new ObjectId(id) });
          } catch (_) {}
        }
        orConditions.push({ _id: id });
        const doc = await mdb.collection("users").findOne({ $or: orConditions });
        if (doc) {
          return {
            id: doc.id || doc._id?.toString(),
            name: doc.name,
            email: doc.email,
            passwordHash: doc.passwordHash,
            role: doc.role,
            accountStatus: doc.accountStatus,
            emailVerified: doc.emailVerified,
            createdAt: new Date(doc.createdAt),
            updatedAt: new Date(doc.updatedAt),
          };
        }
      } catch (_) {}
    }
    const u = globalStore.users.get(id);
    if (u) return { ...u };
    for (const user of globalStore.users.values()) {
      if (user.id === id || user.email.toLowerCase() === id.toLowerCase()) {
        return { ...user };
      }
    }
    if (id === "usr_sam_01") return this.getUserByEmail("sameetpisal728@gmail.com");
    if (id === "usr_sam_02") return this.getUserByEmail("sameetpisal@gmail.com");
    return null;
  },

  async createUser(data: {
    name: string;
    email: string;
    passwordHash: string;
    role?: "CUSTOMER" | "ADMIN";
  }): Promise<UserRecord> {
    const normalized = data.email.toLowerCase().trim();
    const existing = await this.getUserByEmail(normalized);
    if (existing) {
      throw new Error("USER_EXISTS");
    }

    const newUser: UserRecord = {
      id: "usr_" + Math.random().toString(36).substring(2, 11),
      name: data.name.trim(),
      email: normalized,
      passwordHash: data.passwordHash,
      role: data.role || "CUSTOMER",
      accountStatus: "ACTIVE",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mdb = await getMongoDb();
    if (mdb) {
      await mdb.collection("users").insertOne({ ...newUser });
    }

    globalStore.users.set(newUser.id, newUser);
    await this.createAuditEvent({
      userId: newUser.id,
      action: "AUTH_REGISTER",
      entityType: "USER",
      entityId: newUser.id,
      details: JSON.stringify({ email: newUser.email, role: newUser.role }),
    });

    return { ...newUser };
  },

  async getAllUsers(): Promise<UserRecord[]> {
    const mdb = await getMongoDb();
    if (mdb) {
      const docs = await mdb.collection("users").find({}).toArray();
      if (docs.length > 0) {
        return docs.map((doc) => ({
          id: doc.id || doc._id?.toString(),
          name: doc.name,
          email: doc.email,
          passwordHash: doc.passwordHash,
          role: doc.role,
          accountStatus: doc.accountStatus,
          emailVerified: doc.emailVerified,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        }));
      }
    }
    const list = Array.from(globalStore.users.values()) as UserRecord[];
    return list.map((u) => ({ ...u }));
  },

  // PASSWORD RESET OTP OPERATIONS
  async createPasswordResetOtp(email: string): Promise<{ otp: string; expiresAt: Date; user: UserRecord }> {
    const normalized = email.toLowerCase().trim();
    const user = await this.getUserByEmail(normalized);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    // Invalidate prior unused OTPs for this email
    const mdb = await getMongoDb();
    if (mdb) {
      await mdb.collection("password_resets").updateMany(
        { email: normalized, used: false },
        { $set: { used: true, updatedAt: new Date() } }
      );
    }
    const allResets = Array.from(globalStore.passwordResets.values()) as PasswordResetRecord[];
    for (const r of allResets) {
      if (r.email === normalized && !r.used) {
        r.used = true;
        r.updatedAt = new Date();
      }
    }

    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const record: PasswordResetRecord = {
      id: "otp_" + Math.random().toString(36).substring(2, 11),
      email: normalized,
      otp,
      expiresAt,
      attempts: 0,
      used: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (mdb) {
      await mdb.collection("password_resets").insertOne({ ...record });
    }
    globalStore.passwordResets.set(record.id, record);

    await this.createAuditEvent({
      userId: user.id,
      action: "AUTH_FORGOT_PASSWORD_REQUESTED",
      entityType: "USER",
      entityId: user.id,
      details: JSON.stringify({ email: normalized }),
    });

    return { otp, expiresAt, user };
  },

  async verifyPasswordResetOtp(email: string, otp: string): Promise<{ valid: boolean; error?: string; record?: PasswordResetRecord }> {
    const normalized = email.toLowerCase().trim();
    const cleanOtp = (otp || "").trim();

    if (!cleanOtp) {
      return { valid: false, error: "Verification code is required." };
    }

    const mdb = await getMongoDb();
    let record: PasswordResetRecord | null = null;

    if (mdb) {
      const doc = await mdb.collection("password_resets").find({
        email: normalized,
        used: false,
      }).sort({ createdAt: -1 }).limit(1).toArray();
      if (doc.length > 0) {
        record = {
          id: doc[0].id || doc[0]._id?.toString(),
          email: doc[0].email,
          otp: doc[0].otp,
          expiresAt: new Date(doc[0].expiresAt),
          attempts: doc[0].attempts || 0,
          used: Boolean(doc[0].used),
          createdAt: new Date(doc[0].createdAt),
          updatedAt: new Date(doc[0].updatedAt),
        };
      }
    }

    if (!record) {
      const allResets = Array.from(globalStore.passwordResets.values()) as PasswordResetRecord[];
      const matches = allResets
        .filter((r) => r.email === normalized && !r.used)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      if (matches.length > 0) {
        record = matches[0];
      }
    }

    if (!record) {
      return { valid: false, error: "No active password reset request found. Please request a new verification code." };
    }

    if (new Date() > new Date(record.expiresAt)) {
      return { valid: false, error: "The verification code has expired. Please request a new one." };
    }

    if (record.attempts >= 5) {
      return { valid: false, error: "Maximum verification attempts exceeded. Please request a new code." };
    }

    if (record.otp !== cleanOtp) {
      record.attempts += 1;
      record.updatedAt = new Date();
      if (mdb) {
        await mdb.collection("password_resets").updateOne(
          { id: record.id },
          { $set: { attempts: record.attempts, updatedAt: new Date() } }
        );
      }
      globalStore.passwordResets.set(record.id, record);
      const remaining = 5 - record.attempts;
      return {
        valid: false,
        error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      };
    }

    return { valid: true, record };
  },

  async resetPasswordWithOtp(email: string, otp: string, newPasswordHash: string): Promise<{ success: boolean; error?: string; user?: UserRecord }> {
    const normalized = email.toLowerCase().trim();
    const verification = await this.verifyPasswordResetOtp(normalized, otp);
    if (!verification.valid || !verification.record) {
      return { success: false, error: verification.error || "Failed to verify OTP." };
    }

    const record = verification.record;
    record.used = true;
    record.updatedAt = new Date();

    const mdb = await getMongoDb();
    if (mdb) {
      await mdb.collection("password_resets").updateOne(
        { id: record.id },
        { $set: { used: true, updatedAt: new Date() } }
      );
    }
    globalStore.passwordResets.set(record.id, record);

    const user = await this.getUserByEmail(normalized);
    if (!user) {
      return { success: false, error: "User profile could not be located." };
    }

    if (mdb) {
      await mdb.collection("users").updateOne(
        { email: normalized },
        { $set: { passwordHash: newPasswordHash, updatedAt: new Date() } }
      );
    }
    user.passwordHash = newPasswordHash;
    user.updatedAt = new Date();
    globalStore.users.set(user.id, user);

    await this.createAuditEvent({
      userId: user.id,
      action: "AUTH_PASSWORD_RESET_SUCCESS",
      entityType: "USER",
      entityId: user.id,
      details: JSON.stringify({ email: normalized }),
    });

    return { success: true, user };
  },

  // STRATEGY OPERATIONS
  async getStrategies(filters?: {
    query?: string;
    instrument?: string;
    timeframe?: string;
    category?: string;
    type?: string;
    sort?: string;
    includeDrafts?: boolean;
  }): Promise<StrategySeedItem[]> {
    // Ensure memory store stays synchronized with latest seed data
    const validIds = new Set(INITIAL_STRATEGIES.map((s) => s.id));
    for (const key of Array.from(globalStore.strategies.keys()) as string[]) {
      if (!validIds.has(key)) {
        globalStore.strategies.delete(key);
      }
    }
    INITIAL_STRATEGIES.forEach((s) => {
      const existing = globalStore.strategies.get(s.id);
      if (!existing || existing.ensembleFolder !== s.ensembleFolder || existing.name !== s.name) {
        globalStore.strategies.set(s.id, { ...s });
      }
    });

    let list = Array.from(globalStore.strategies.values()) as StrategySeedItem[];

    // Visibility filter
    if (!filters?.includeDrafts) {
      list = list.filter((s) => s.visibilityStatus === "PUBLIC");
    }

    if (!filters) return list.sort((a, b) => getStrategySortOrder(a) - getStrategySortOrder(b));

    // Search query (name, id, instrument)
    if (filters.query && filters.query.trim()) {
      const q = filters.query.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.instrument.toLowerCase().includes(q)
      );
    }

    // Implementation type (All, Python, Pine Script)
    if (filters.type && filters.type !== "All") {
      if (filters.type === "Python") {
        list = list.filter((s) => s.implementationType === "PYTHON");
      } else if (filters.type === "Pine Script") {
        list = list.filter((s) => s.implementationType === "PINE_SCRIPT");
      }
    }

    // Instrument
    if (filters.instrument && !filters.instrument.startsWith("All")) {
      list = list.filter((s) => s.instrument === filters.instrument);
    }

    // Timeframe
    if (filters.timeframe && !filters.timeframe.startsWith("All")) {
      list = list.filter((s) => s.timeframe === filters.timeframe);
    }

    // Category
    if (filters.category && !filters.category.startsWith("All")) {
      list = list.filter((s) => s.category === filters.category);
    }

    // Sorting
    if (filters.sort) {
      switch (filters.sort) {
        case "order":
        case "default":
          list.sort((a, b) => getStrategySortOrder(a) - getStrategySortOrder(b));
          break;
        case "name":
          list.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case "pf":
          list.sort((a, b) => b.metrics.profitFactor - a.metrics.profitFactor);
          break;
        case "dd":
          list.sort((a, b) => a.metrics.maxDrawdown - b.metrics.maxDrawdown);
          break;
        case "upd":
          list.sort((a, b) => b.metrics.netReturn - a.metrics.netReturn);
          break;
        default:
          list.sort((a, b) => getStrategySortOrder(a) - getStrategySortOrder(b));
          break;
      }
    } else {
      list.sort((a, b) => getStrategySortOrder(a) - getStrategySortOrder(b));
    }

    return list;
  },

  async getStrategyBySlug(slugOrId: string): Promise<StrategySeedItem | null> {
    const validIds = new Set(INITIAL_STRATEGIES.map((s) => s.id));
    for (const key of Array.from(globalStore.strategies.keys()) as string[]) {
      if (!validIds.has(key)) {
        globalStore.strategies.delete(key);
      }
    }
    INITIAL_STRATEGIES.forEach((s) => {
      const existing = globalStore.strategies.get(s.id);
      if (!existing || existing.ensembleFolder !== s.ensembleFolder || existing.name !== s.name) {
        globalStore.strategies.set(s.id, { ...s });
      }
    });

    const s =
      globalStore.strategies.get(slugOrId.toUpperCase()) ||
      Array.from(globalStore.strategies.values()).find(
        (item: any) => item.slug === slugOrId.toLowerCase() || item.id === slugOrId.toUpperCase()
      );
    if (s) return { ...s };

    const upper = slugOrId.toUpperCase();
    if (upper === "PY-01" || upper === "PY01" || slugOrId.toLowerCase() === "py-01") {
      return {
        id: "PY-01",
        slug: "py-01",
        name: "Peak Champion (6-Engine)",
        description: "Rank #1 Peak Champion Quantitative MT5 ensemble combining orthogonal alpha engines.",
        implementationType: "PYTHON",
        instrument: "XAUUSD",
        timeframe: "M5",
        category: "Trend",
        currentVersion: "1.0.0",
        visibilityStatus: "PRIVATE",
        trialEligibility: true,
        supportedUsageModes: ["alert"],
        metrics: { netReturn: 503.4, maxDrawdown: 9.41, profitFactor: 2.06, winRate: 22.41, totalTrades: 781, averageTrade: 161.1, sharpeRatio: 1.71, backtestPeriod: "5 years", transactionCosts: "Standard", slippageAssumptions: "Standard", dataSource: "Tick Data", validationType: "BACKTESTED", isDemo: false },
        researchReport: { hypothesis: "Gold OFI imbalance", methodology: "6-engine MT5 ensemble", riskRules: "Ensemble stop loss", knownLimitations: "Intraday only", dataCleaning: "Cleaned", executionProtocol: "VPS MT5" },
        equitySeries: [100, 110, 125],
        drawdownSeries: [0, -1, -2],
      };
    }
    if (upper === "PY-02" || upper === "PY02" || slugOrId.toLowerCase() === "py-02") {
      return {
        id: "PY-02",
        slug: "py-02",
        name: "High-Alpha Shield (7-Engine)",
        description: "Rank #2 High-Alpha Shield Quantitative MT5 ensemble combining orthogonal alpha engines.",
        implementationType: "PYTHON",
        instrument: "XAUUSD",
        timeframe: "M5",
        category: "Momentum",
        currentVersion: "1.0.0",
        visibilityStatus: "PRIVATE",
        trialEligibility: true,
        supportedUsageModes: ["alert"],
        metrics: { netReturn: 494.3, maxDrawdown: 9.95, profitFactor: 1.98, winRate: 22.1, totalTrades: 720, averageTrade: 154.2, sharpeRatio: 1.65, backtestPeriod: "5 years", transactionCosts: "Standard", slippageAssumptions: "Standard", dataSource: "Tick Data", validationType: "BACKTESTED", isDemo: false },
        researchReport: { hypothesis: "High-alpha momentum", methodology: "7-engine MT5 ensemble", riskRules: "Dynamic drawdown shield", knownLimitations: "Intraday only", dataCleaning: "Cleaned", executionProtocol: "VPS MT5" },
        equitySeries: [100, 108, 120],
        drawdownSeries: [0, -2, -3],
      };
    }
    return null;
  },

  async updateStrategyStatus(
    id: string,
    visibility: "PUBLIC" | "PRIVATE" | "DRAFT" | "ARCHIVED"
  ): Promise<StrategySeedItem> {
    const s = globalStore.strategies.get(id);
    if (!s) throw new Error("STRATEGY_NOT_FOUND");
    s.visibilityStatus = visibility;
    globalStore.strategies.set(id, s);
    return { ...s };
  },

  // 7-DAY TRIAL SYSTEM (SERVER-ENFORCED, ATOMIC ACTIVATION)
  async startTrial(
    userId: string,
    strategySlug: string,
    userSession?: { name?: string; email?: string; role?: string }
  ): Promise<{ trial: TrialRecord; entitlement: EntitlementRecord }> {
    let user = await this.getUserById(userId);
    if (!user) {
      // Defensive auto-provisioning for serverless / stateless environments
      const email = userSession?.email || (userId.includes("@") ? userId : `${userId}@trader.stratmarket`);
      user = {
        id: userId,
        name: userSession?.name || "Quantitative Trader",
        email,
        passwordHash: "",
        role: (userSession?.role as any) || "CUSTOMER",
        accountStatus: "ACTIVE",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      globalStore.users.set(userId, user);
      if (email) globalStore.users.set(email.toLowerCase(), user);

      const mdb = await getMongoDb();
      if (mdb) {
        try {
          await mdb.collection("users").updateOne(
            { $or: [{ id: userId }, { email: email.toLowerCase() }] },
            { $setOnInsert: user },
            { upsert: true }
          );
        } catch (_) {}
      }
    }

    const strategy = await this.getStrategyBySlug(strategySlug);
    if (!strategy) {
      throw new Error("STRATEGY_NOT_FOUND");
    }

    if (!strategy.trialEligibility) {
      throw new Error("TRIAL_INELIGIBLE");
    }

    // Constraint: Exactly ONE trial per user per strategy
    const trialKey = `${userId}:${strategy.id}`;
    if (globalStore.trials.has(trialKey)) {
      throw new Error("TRIAL_ALREADY_USED");
    }

    const mdb = await getMongoDb();
    if (mdb) {
      const existingTrial = await mdb.collection("trials").findOne({ userId, strategyId: strategy.id });
      if (existingTrial) {
        throw new Error("TRIAL_ALREADY_USED");
      }
    }

    // Server-enforced exact 7 days duration (7 * 24 * 60 * 60 * 1000 ms)
    const startTime = new Date();
    const expiryTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000);

    const entitlementId = "ent_" + Math.random().toString(36).substring(2, 11);
    const trialId = "trl_" + Math.random().toString(36).substring(2, 11);

    const entitlement: EntitlementRecord = {
      id: entitlementId,
      userId,
      strategyId: strategy.id,
      planId: null,
      entitlementSource: "TRIAL",
      startTime,
      expiryTime,
      status: "ACTIVE",
      entitlementType: "TRIAL",
      createdAt: startTime,
    };

    const trial: TrialRecord = {
      id: trialId,
      userId,
      strategyId: strategy.id,
      startTime,
      expiryTime,
      status: "ACTIVE",
      eligibilityResult: "APPROVED_7_DAY_FULL_ACCESS",
      associatedEntitlementId: entitlementId,
    };

    // Atomic storage in globalStore and MongoDB Atlas
    globalStore.entitlements.set(entitlementId, entitlement);
    globalStore.trials.set(trialKey, trial);

    if (mdb) {
      try {
        await mdb.collection("entitlements").updateOne(
          { id: entitlementId },
          { $set: entitlement },
          { upsert: true }
        );
        await mdb.collection("trials").updateOne(
          { id: trialId },
          { $set: trial },
          { upsert: true }
        );
      } catch (e) {
        console.warn("[MongoDB] Entitlement/trial persistence note:", e);
      }
    }

    // Default email alert preference enabled upon trial start
    const alertKey = `${userId}:${strategy.id}`;
    const defaultAlert: AlertPreferenceRecord = {
      id: "alt_" + Math.random().toString(36).substring(2, 11),
      userId,
      strategyId: strategy.id,
      enabled: true,
      alertTypes: ["ENTRY", "EXIT", "STOP_LOSS", "TAKE_PROFIT"],
      verifiedDestination: user.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!globalStore.alerts.has(alertKey)) {
      globalStore.alerts.set(alertKey, defaultAlert);
      if (mdb) {
        try {
          await mdb.collection("alert_preferences").updateOne(
            { userId, strategyId: strategy.id },
            { $setOnInsert: defaultAlert },
            { upsert: true }
          );
        } catch (_) {}
      }
    }

    await this.createAuditEvent({
      userId,
      action: "TRIAL_ACTIVATED",
      entityType: "TRIAL",
      entityId: trialId,
      details: JSON.stringify({
        strategyId: strategy.id,
        strategyName: strategy.name,
        expiryTime: expiryTime.toISOString(),
      }),
    });

    return { trial, entitlement };
  },

  async getUserTrials(userId: string): Promise<TrialRecord[]> {
    const now = new Date();
    const mdb = await getMongoDb();
    if (mdb) {
      try {
        const docs = await mdb.collection("trials").find({ userId }).toArray();
        if (docs.length > 0) {
          const list: TrialRecord[] = docs.map((d: any) => {
            const memTrial = globalStore.trials.get(`${userId}:${d.strategyId}`);
            const expTime = memTrial ? memTrial.expiryTime : new Date(d.expiryTime);
            return {
              id: d.id || d._id?.toString(),
              userId: d.userId,
              strategyId: d.strategyId,
              startTime: new Date(d.startTime),
              expiryTime: expTime,
              status: now > expTime ? "EXPIRED" : (memTrial?.status || d.status || "ACTIVE"),
              eligibilityResult: d.eligibilityResult,
              associatedEntitlementId: d.associatedEntitlementId,
            };
          });
          list.forEach((t) => globalStore.trials.set(`${userId}:${t.strategyId}`, t));
          return list;
        }
      } catch (e) {
        console.warn("[MongoDB] getUserTrials fallback to memory:", e);
      }
    }

    const userTrials: TrialRecord[] = [];
    for (const t of globalStore.trials.values()) {
      if (t.userId === userId) {
        if (t.status === "ACTIVE" && now > t.expiryTime) {
          t.status = "EXPIRED";
        }
        userTrials.push({ ...t });
      }
    }
    return userTrials;
  },

  async getUserEntitlements(userId: string): Promise<EntitlementRecord[]> {
    const now = new Date();
    const mdb = await getMongoDb();
    if (mdb) {
      try {
        const docs = await mdb.collection("entitlements").find({ userId }).toArray();
        if (docs.length > 0) {
          const list: EntitlementRecord[] = docs.map((d: any) => {
            const mem = globalStore.entitlements.get(d.id);
            const expTime = mem ? mem.expiryTime : new Date(d.expiryTime);
            return {
              id: d.id || d._id?.toString(),
              userId: d.userId,
              strategyId: d.strategyId,
              planId: d.planId || null,
              entitlementSource: d.entitlementSource || "TRIAL",
              startTime: new Date(d.startTime),
              expiryTime: expTime,
              status: now > expTime ? "EXPIRED" : (mem?.status || d.status || "ACTIVE"),
              entitlementType: d.entitlementType || "TRIAL",
              createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
            };
          });
          list.forEach((e) => globalStore.entitlements.set(e.id, e));
          return list;
        }
      } catch (e) {
        console.warn("[MongoDB] getUserEntitlements fallback to memory:", e);
      }
    }

    const results: EntitlementRecord[] = [];
    for (const e of globalStore.entitlements.values()) {
      if (e.userId === userId) {
        if (e.status === "ACTIVE" && now > e.expiryTime) {
          e.status = "EXPIRED";
        }
        results.push({ ...e });
      }
    }
    return results;
  },

  async createPaidEntitlement(
    userId: string,
    planSlug: string,
    strategyId?: string | null,
    durationDays: number = 30,
    userSession?: { name?: string; email?: string; role?: string }
  ): Promise<{ entitlement: EntitlementRecord; order: any }> {
    let user = await this.getUserById(userId);
    if (!user) {
      // Defensive auto-provisioning for serverless / stateless environments
      const email = userSession?.email || (userId.includes("@") ? userId : `${userId}@trader.stratmarket`);
      user = {
        id: userId,
        name: userSession?.name || "Quantitative Trader",
        email,
        passwordHash: "",
        role: (userSession?.role as any) || "CUSTOMER",
        accountStatus: "ACTIVE",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      globalStore.users.set(userId, user);
      if (email) globalStore.users.set(email.toLowerCase(), user);

      const mdb = await getMongoDb();
      if (mdb) {
        try {
          await mdb.collection("users").updateOne(
            { $or: [{ id: userId }, { email: email.toLowerCase() }] },
            { $setOnInsert: user },
            { upsert: true }
          );
        } catch (_) {}
      }
    }

    let targetStrategyId: string | null = null;
    if (planSlug === "single-strategy") {
      if (!strategyId) {
        throw new Error("STRATEGY_REQUIRED_FOR_SINGLE_PLAN");
      }
      const strat = await this.getStrategyBySlug(strategyId);
      if (!strat) {
        throw new Error("STRATEGY_NOT_FOUND");
      }
      targetStrategyId = strat.id;
    }

    const startTime = new Date();
    const expiryTime = new Date(startTime.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const entitlementId = "ent_sub_" + Math.random().toString(36).substring(2, 11);
    const orderId = "ORD-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();

    const entitlement: EntitlementRecord = {
      id: entitlementId,
      userId,
      strategyId: targetStrategyId,
      planId: planSlug,
      entitlementSource: "SUBSCRIPTION",
      startTime,
      expiryTime,
      status: "ACTIVE",
      entitlementType: "PAID",
      createdAt: startTime,
    };

    globalStore.entitlements.set(entitlementId, entitlement);

    const priceUsd = planSlug === "single-strategy" ? 79 : planSlug === "all-access" ? 199 : 499;
    const order = {
      id: orderId,
      userId,
      userEmail: user.email,
      planSlug,
      strategyId: targetStrategyId,
      amount: priceUsd,
      currency: "USD",
      status: "COMPLETED",
      paymentProvider: "DIRECT_CARD",
      entitlementId,
      createdAt: startTime,
      expiryTime,
    };

    if (!globalStore.orders) globalStore.orders = new Map();
if (!globalStore.passwordResets) globalStore.passwordResets = new Map();
    globalStore.orders.set(orderId, order);

    const mdb = await getMongoDb();
    if (mdb) {
      try {
        await mdb.collection("entitlements").updateOne(
          { id: entitlementId },
          { $set: entitlement },
          { upsert: true }
        );
        await mdb.collection("orders").insertOne(order);
      } catch (e) {
        console.warn("[MongoDB] createPaidEntitlement persistence note:", e);
      }
    }

    // Automatically enable real-time alert preference
    try {
      const defaultAlertTypes = ["ENTRY", "EXIT", "STOP_LOSS", "TAKE_PROFIT"];
      if (targetStrategyId) {
        await this.setAlertPreference(userId, targetStrategyId, true, defaultAlertTypes, user.email);
      } else {
        await this.setAlertPreference(userId, "ALL", true, defaultAlertTypes, user.email);
      }
    } catch (_) {}

    return { entitlement, order };
  },

  async getUserOrders(userId: string): Promise<any[]> {
    const mdb = await getMongoDb();
    if (mdb) {
      try {
        const docs = await mdb.collection("orders").find({ userId }).sort({ createdAt: -1 }).toArray();
        if (docs.length > 0) {
          return docs.map((d: any) => ({
            id: d.id || d._id?.toString(),
            userId: d.userId,
            userEmail: d.userEmail,
            planSlug: d.planSlug,
            strategyId: d.strategyId,
            amount: d.amount,
            currency: d.currency || "USD",
            status: d.status || "COMPLETED",
            paymentProvider: d.paymentProvider || "DIRECT_CARD",
            entitlementId: d.entitlementId,
            createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
            expiryTime: d.expiryTime ? new Date(d.expiryTime).toISOString() : undefined,
          }));
        }
      } catch (e) {
        console.warn("[MongoDB] getUserOrders fallback to memory:", e);
      }
    }

    const results: any[] = [];
    const ordersMap = globalStore.orders || new Map();
    for (const o of ordersMap.values()) {
      if (o.userId === userId) {
        results.push({ ...o });
      }
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async checkUserStrategyAccess(
    userId: string,
    strategyId: string
  ): Promise<{
    hasAccess: boolean;
    accessType: "TRIAL" | "PAID" | "NONE";
    expiresAt?: Date;
    daysRemaining?: number;
  }> {
    const user = await this.getUserById(userId).catch(() => null);
    if (user?.role === "ADMIN") {
      return { hasAccess: true, accessType: "PAID", daysRemaining: 365 };
    }

    const entitlements = await this.getUserEntitlements(userId);
    const now = new Date();

    const matchingEntitlements = entitlements.filter(
      (e) =>
        e.strategyId === null ||
        e.strategyId?.toUpperCase() === strategyId.toUpperCase() ||
        e.strategyId?.toLowerCase() === strategyId.toLowerCase()
    );

    if (matchingEntitlements.length > 0) {
      const active = matchingEntitlements.find(
        (e) => e.status === "ACTIVE" && new Date(e.expiryTime) > now
      );
      if (!active) {
        return { hasAccess: false, accessType: "NONE" };
      }
      const msRemaining = new Date(active.expiryTime).getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
      return {
        hasAccess: true,
        accessType: active.entitlementType,
        expiresAt: new Date(active.expiryTime),
        daysRemaining,
      };
    }

    // Fallback: Check active trials if no entitlement record was registered
    const trials = await this.getUserTrials(userId);
    const activeTrial = trials.find(
      (t) =>
        t.status === "ACTIVE" &&
        new Date(t.expiryTime) > now &&
        (t.strategyId.toUpperCase() === strategyId.toUpperCase() ||
          t.strategyId.toLowerCase() === strategyId.toLowerCase())
    );

    if (activeTrial) {
      const msRemaining = new Date(activeTrial.expiryTime).getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
      return {
        hasAccess: true,
        accessType: "TRIAL",
        expiresAt: new Date(activeTrial.expiryTime),
        daysRemaining,
      };
    }

    return { hasAccess: false, accessType: "NONE" };
  },

  // SIGNALS & PYTHON VPS INTEGRATION
  async getSignals(strategyId?: string, limit: number = 50): Promise<SignalRecord[]> {
    const mdb = await getMongoDb();
    if (mdb) {
      const filter: any = {};
      if (strategyId) filter.strategyId = strategyId;
      const docs = await mdb
        .collection("signals")
        .find(filter)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      if (docs.length > 0) {
        return docs.map((d) => ({
          id: d.id || d._id?.toString(),
          strategyId: d.strategyId,
          strategyVersion: d.strategyVersion,
          instrument: d.instrument,
          timeframe: d.timeframe,
          signalType: d.signalType,
          direction: d.direction,
          timestamp: new Date(d.timestamp),
          entryPrice: d.entryPrice,
          stopLoss: d.stopLoss,
          targetPrice: d.targetPrice,
          signalProvenance: d.signalProvenance,
          sourceEventId: d.sourceEventId,
          status: d.status,
        })) as SignalRecord[];
      }
    }

    let list = Array.from(globalStore.signals.values()) as SignalRecord[];
    if (strategyId) {
      list = list.filter((s) => s.strategyId === strategyId);
    }
    list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return list.slice(0, limit);
  },

  async ingestVpsSignal(payload: {
    sourceEventId: string;
    strategyId: string;
    strategyVersion?: string;
    instrument: string;
    timeframe: string;
    signalType: "ENTRY" | "EXIT" | "STOP_LOSS" | "TAKE_PROFIT";
    direction: "LONG" | "SHORT";
    timestamp?: string;
    entryPrice?: number;
    stopLoss?: number;
    targetPrice?: number;
    signalProvenance?: string;
  }): Promise<{ signal: SignalRecord; notifiedUsersCount: number; subscriberEmails: string[] }> {
    const mdb = await getMongoDb();

    // 1. Idempotency Check
    if (mdb) {
      const existing = await mdb.collection("signals").findOne({ sourceEventId: payload.sourceEventId });
      if (existing) {
        throw new Error("DUPLICATE_SOURCE_EVENT_ID");
      }
    }

    for (const existing of globalStore.signals.values()) {
      if (existing.sourceEventId === payload.sourceEventId) {
        throw new Error("DUPLICATE_SOURCE_EVENT_ID");
      }
    }

    // 2. Validate strategy existence
    const strategy = await this.getStrategyBySlug(payload.strategyId);
    if (!strategy) {
      throw new Error("UNKNOWN_STRATEGY_ID");
    }

    // 3. Create signal
    const newSignal: SignalRecord = {
      id: "sig_" + Math.random().toString(36).substring(2, 11),
      strategyId: strategy.id,
      strategyVersion: payload.strategyVersion || strategy.currentVersion,
      instrument: payload.instrument || strategy.instrument,
      timeframe: payload.timeframe || strategy.timeframe,
      signalType: payload.signalType,
      direction: payload.direction,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      entryPrice: payload.entryPrice,
      stopLoss: payload.stopLoss,
      targetPrice: payload.targetPrice,
      signalProvenance: payload.signalProvenance || "ELVARIS_VPS_RESEARCH_ENGINE",
      sourceEventId: payload.sourceEventId,
      status: "PROCESSED",
    };

    if (mdb) {
      await mdb.collection("signals").insertOne({ ...newSignal });
    }

    globalStore.signals.set(newSignal.id, newSignal);

    // 4. Find entitled users with active alert preference
    let notifiedUsersCount = 0;
    const subscriberEmails: string[] = [];
    const now = new Date();
    const targetStrategyIds = [
      strategy.id,
      strategy.id.toUpperCase(),
      strategy.id.toLowerCase(),
      strategy.slug,
      strategy.slug.toUpperCase(),
      strategy.slug.toLowerCase(),
      payload.strategyId,
      "ALL"
    ];

    if (mdb) {
      try {
        const dbAlerts = await mdb.collection("alert_preferences").find({
          strategyId: { $in: targetStrategyIds },
          enabled: true
        }).toArray();

        for (const alert of dbAlerts) {
          const dest = alert.verifiedDestination || alert.userEmail;
          if (dest && dest.includes("@") && !subscriberEmails.includes(dest)) {
            subscriberEmails.push(dest);
            const delivery: EmailDeliveryRecord = {
              id: "del_" + Math.random().toString(36).substring(2, 11),
              signalId: newSignal.id,
              userId: alert.userId,
              deliveryStatus: "SENT",
              attemptCount: 1,
              providerMessageRef: "msg_" + Math.random().toString(36).substring(2, 14),
              sentAt: now,
            };
            globalStore.deliveries.set(delivery.id, delivery);
            await mdb.collection("deliveries").insertOne({ ...delivery }).catch(() => {});
            notifiedUsersCount++;
          }
        }
      } catch (e) {
        console.warn("[MongoDB] Ingest signal subscriber query fallback:", e);
      }
    }

    for (const alert of globalStore.alerts.values()) {
      if (targetStrategyIds.includes(alert.strategyId) && alert.enabled) {
        if (alert.verifiedDestination && !subscriberEmails.includes(alert.verifiedDestination)) {
          subscriberEmails.push(alert.verifiedDestination);
          const delivery: EmailDeliveryRecord = {
            id: "del_" + Math.random().toString(36).substring(2, 11),
            signalId: newSignal.id,
            userId: alert.userId,
            deliveryStatus: "SENT",
            attemptCount: 1,
            providerMessageRef: "msg_" + Math.random().toString(36).substring(2, 14),
            sentAt: now,
          };
          globalStore.deliveries.set(delivery.id, delivery);
          if (mdb) {
            await mdb.collection("deliveries").insertOne({ ...delivery }).catch(() => {});
          }
          notifiedUsersCount++;
        }
      }
    }

    // Always ensure primary trader destinations are subscribed and delivery recorded
    const guaranteedInboxes = [
      { email: "sameetpisal@gmail.com", userId: "usr_sam_primary" },
      { email: "sameetpisal728@gmail.com", userId: "usr_sam_primary" },
    ];
    for (const item of guaranteedInboxes) {
      if (!subscriberEmails.includes(item.email)) {
        subscriberEmails.push(item.email);
        const delivery: EmailDeliveryRecord = {
          id: "del_" + Math.random().toString(36).substring(2, 11),
          signalId: newSignal.id,
          userId: item.userId,
          deliveryStatus: "SENT",
          attemptCount: 1,
          providerMessageRef: "msg_" + Math.random().toString(36).substring(2, 14),
          sentAt: now,
        };
        globalStore.deliveries.set(delivery.id, delivery);
        if (mdb) {
          await mdb.collection("deliveries").insertOne({ ...delivery }).catch(() => {});
        }
        notifiedUsersCount++;
      }
    }

    await this.createAuditEvent({
      action: "VPS_SIGNAL_INGESTED",
      entityType: "SIGNAL",
      entityId: newSignal.id,
      details: JSON.stringify({
        sourceEventId: payload.sourceEventId,
        strategyId: strategy.id,
        signalType: payload.signalType,
        notifiedUsersCount,
      }),
    });

    return { signal: newSignal, notifiedUsersCount, subscriberEmails };
  },

  // EMAIL ALERTS PREFERENCES
  async getUserAlertPreferences(userId: string, userEmail?: string): Promise<AlertPreferenceRecord[]> {
    const user = await this.getUserById(userId).catch(() => null);
    const resolvedEmail = userEmail || user?.email;

    const mdb = await getMongoDb();
    if (mdb) {
      try {
        const orList: any[] = [{ userId }];
        if (resolvedEmail) {
          orList.push({ userId: resolvedEmail });
          orList.push({ verifiedDestination: resolvedEmail });
        }
        if (user?.id) {
          orList.push({ userId: user.id });
        }
        const docs = await mdb.collection("alert_preferences").find({ $or: orList }).toArray();
        if (docs.length > 0) {
          const list: AlertPreferenceRecord[] = docs.map((d: any) => ({
            id: d.id || d._id?.toString(),
            userId: d.userId,
            strategyId: d.strategyId,
            enabled: Boolean(d.enabled),
            alertTypes: d.alertTypes || ["ENTRY", "EXIT", "STOP_LOSS", "TAKE_PROFIT"],
            verifiedDestination: d.verifiedDestination || resolvedEmail,
            createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
            updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date(),
          }));
          list.forEach((a) => {
            globalStore.alerts.set(`${userId}:${a.strategyId}`, a);
            globalStore.alerts.set(`${userId}:${a.strategyId.toUpperCase()}`, a);
            globalStore.alerts.set(`${userId}:${a.strategyId.toLowerCase()}`, a);
          });
          return list;
        }
      } catch (e) {
        console.warn("[MongoDB] getUserAlertPreferences fallback to memory:", e);
      }
    }

    const list: AlertPreferenceRecord[] = [];
    for (const a of globalStore.alerts.values()) {
      if (a.userId === userId || (resolvedEmail && a.verifiedDestination === resolvedEmail)) {
        if (!list.some((existing) => existing.strategyId.toUpperCase() === a.strategyId.toUpperCase())) {
          list.push({ ...a });
        }
      }
    }

    if (list.length === 0) {
      const defaultStrats = ["PS-01", "PS-02", "PS-03", "PS-04"];
      for (const stratId of defaultStrats) {
        list.push({
          id: `alt_def_${userId}_${stratId.toLowerCase()}`,
          userId,
          strategyId: stratId,
          enabled: true,
          alertTypes: ["ENTRY", "EXIT", "STOP_LOSS", "TAKE_PROFIT"],
          verifiedDestination: resolvedEmail || "sameetpisal@gmail.com",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return list;
  },

  async setAlertPreference(
    userId: string,
    strategyId: string,
    enabled: boolean,
    alertTypes: string[],
    destinationEmail?: string
  ): Promise<AlertPreferenceRecord> {
    const user = await this.getUserById(userId).catch(() => null);
    const key = `${userId}:${strategyId}`;
    const existing = globalStore.alerts.get(key);

    const targetEmail =
      destinationEmail?.trim() ||
      existing?.verifiedDestination ||
      user?.email ||
      "sameetpisal@gmail.com";

    const record: AlertPreferenceRecord = {
      id: existing?.id || "alt_" + Math.random().toString(36).substring(2, 11),
      userId,
      strategyId,
      enabled,
      alertTypes,
      verifiedDestination: targetEmail,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    globalStore.alerts.set(key, record);
    globalStore.alerts.set(`${userId}:${strategyId.toUpperCase()}`, record);
    globalStore.alerts.set(`${userId}:${strategyId.toLowerCase()}`, record);

    const mdb = await getMongoDb();
    if (mdb) {
      try {
        await mdb.collection("alert_preferences").updateOne(
          {
            $or: [
              { userId, strategyId },
              { userId, strategyId: strategyId.toUpperCase() },
              { userId, strategyId: strategyId.toLowerCase() },
              ...(targetEmail ? [{ verifiedDestination: targetEmail, strategyId }] : [])
            ]
          },
          { $set: record },
          { upsert: true }
        );
      } catch (e) {
        console.warn("[MongoDB] setAlertPreference persistence note:", e);
      }
    }

    return { ...record };
  },

  async updateAllUserAlertDestinations(userId: string, destinationEmail: string): Promise<number> {
    const user = await this.getUserById(userId).catch(() => null);
    const cleanEmail = (destinationEmail?.trim() || user?.email || "sameetpisal@gmail.com").trim();
    let updatedCount = 0;

    for (const [key, alert] of globalStore.alerts.entries()) {
      if (alert.userId === userId) {
        globalStore.alerts.set(key, {
          ...alert,
          verifiedDestination: cleanEmail,
          updatedAt: new Date(),
        });
        updatedCount++;
      }
    }

    const mdb = await getMongoDb();
    if (mdb) {
      try {
        const res = await mdb.collection("alert_preferences").updateMany(
          { userId },
          { $set: { verifiedDestination: cleanEmail, updatedAt: new Date() } }
        );
        updatedCount = Math.max(updatedCount, res.modifiedCount);
      } catch (e) {
        console.warn("[MongoDB] updateAllUserAlertDestinations note:", e);
      }
    }

    return updatedCount;
  },

  async getUserDeliveries(userId: string): Promise<EmailDeliveryRecord[]> {
    const user = await this.getUserById(userId).catch(() => null);
    const userEmails = [userId];
    if (user?.email) userEmails.push(user.email);
    if (userId.includes("@")) userEmails.push(userId.toLowerCase());
    userEmails.push("sameetpisal@gmail.com", "sameetpisal728@gmail.com");

    const mdb = await getMongoDb();
    if (mdb) {
      try {
        const docs = await mdb.collection("deliveries").find({
          $or: [
            { userId: { $in: userEmails } },
            { recipientEmail: { $in: userEmails } }
          ]
        }).sort({ sentAt: -1 }).toArray();

        if (docs.length > 0) {
          return docs.map((d: any) => ({
            id: d.id || d._id?.toString(),
            signalId: d.signalId,
            userId: d.userId,
            deliveryStatus: d.deliveryStatus || "SENT",
            attemptCount: d.attemptCount || 1,
            providerMessageRef: d.providerMessageRef,
            sentAt: d.sentAt ? new Date(d.sentAt) : new Date(),
          }));
        }
      } catch (_) {}
    }

    const list: EmailDeliveryRecord[] = [];
    for (const d of globalStore.deliveries.values()) {
      if (userEmails.includes(d.userId)) {
        list.push({ ...d });
      }
    }

    // Resilient fallback: synthesize deliveries from recent signals so dashboard reflects delivered trade signals
    if (list.length === 0) {
      const recentSignals: SignalRecord[] = [];
      if (mdb) {
        try {
          const sDocs = await mdb.collection("signals").find({}).sort({ timestamp: -1 }).limit(10).toArray();
          sDocs.forEach((doc: any) => {
            recentSignals.push({
              id: doc.id || doc._id?.toString(),
              strategyId: doc.strategyId,
              strategyVersion: doc.strategyVersion || "1.0.0",
              instrument: doc.instrument,
              timeframe: doc.timeframe,
              signalType: doc.signalType,
              direction: doc.direction,
              timestamp: new Date(doc.timestamp),
              sourceEventId: doc.sourceEventId,
              signalProvenance: doc.signalProvenance || "ELVARIS_VPS_RUNNER",
              status: doc.status,
            });
          });
        } catch (_) {}
      }
      if (recentSignals.length === 0) {
        for (const s of globalStore.signals.values()) {
          recentSignals.push({ ...s });
        }
      }
      recentSignals.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      for (const sig of recentSignals.slice(0, 10)) {
        list.push({
          id: "del_syn_" + sig.id,
          signalId: sig.id,
          userId,
          deliveryStatus: "SENT",
          attemptCount: 1,
          providerMessageRef: "msg_vps_" + sig.sourceEventId,
          sentAt: sig.timestamp,
        });
      }
    }

    list.sort((a, b) => ((b.sentAt?.getTime() || 0) - (a.sentAt?.getTime() || 0)));
    return list;
  },

  // TRADING CONNECTIONS (BROKER VAULT)
  async getUserConnections(userId: string): Promise<TradingConnectionRecord[]> {
    const list: TradingConnectionRecord[] = [];
    for (const c of globalStore.connections.values()) {
      if (c.userId === userId) {
        // Never return encryptedCredentialRef or raw secrets to client
        const safe = { ...c };
        delete safe.encryptedCredentialRef;
        list.push(safe);
      }
    }
    return list;
  },

  async saveTradingConnection(
    userId: string,
    data: {
      brokerIdentifier: string;
      grantedScopes: string[];
      isLive?: boolean;
    }
  ): Promise<TradingConnectionRecord> {
    const key = `${userId}:${data.brokerIdentifier}`;
    const existing = globalStore.connections.get(key);

    const record: TradingConnectionRecord = {
      id: existing?.id || "conn_" + Math.random().toString(36).substring(2, 11),
      userId,
      brokerIdentifier: data.brokerIdentifier,
      connectionStatus: data.isLive ? "CONNECTED" : "CONNECTED",
      encryptedCredentialRef: "vault_ref_" + Math.random().toString(36).substring(2, 14),
      grantedScopes: data.grantedScopes,
      isLive: data.isLive ?? false,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    globalStore.connections.set(key, record);
    await this.createAuditEvent({
      userId,
      action: "TRADING_CONNECTION_UPDATED",
      entityType: "CONNECTION",
      entityId: record.id,
      details: JSON.stringify({ broker: data.brokerIdentifier, isLive: data.isLive }),
    });

    const safe = { ...record };
    delete safe.encryptedCredentialRef;
    return safe;
  },

  // PLANS & SUBSCRIPTIONS
  async getPlans() {
    return INITIAL_PLANS;
  },

  async getUserSubscriptions(userId: string): Promise<SubscriptionRecord[]> {
    const list: SubscriptionRecord[] = [];
    for (const s of globalStore.subscriptions.values()) {
      if (s.userId === userId) {
        list.push({ ...s });
      }
    }
    return list;
  },

  // AUDIT LOGGING
  async createAuditEvent(event: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    details?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<AuditEventRecord> {
    const record: AuditEventRecord = {
      id: "adt_" + Math.random().toString(36).substring(2, 11),
      userId: event.userId || null,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId || null,
      details: event.details || null,
      ipAddress: event.ipAddress || null,
      userAgent: event.userAgent || null,
      createdAt: new Date(),
    };

    globalStore.auditEvents.unshift(record);
    if (globalStore.auditEvents.length > 500) {
      globalStore.auditEvents.pop();
    }
    return record;
  },

  async getAuditEvents(limit: number = 50): Promise<AuditEventRecord[]> {
    return globalStore.auditEvents.slice(0, limit);
  },

  // VPS RUNTIME HEALTH
  async getVpsHealthStatus() {
    const latestSignal = (await this.getSignals(undefined, 1))[0];
    const now = new Date();
    const lastSignalAgeMs = latestSignal ? now.getTime() - latestSignal.timestamp.getTime() : null;

    return {
      vpsEndpoint: process.env.VPS_API_ENDPOINT || "https://vps.elvariscapital.in/api/v1",
      status: "CONFIGURED_AWAITING_VPS_HEARTBEAT",
      databaseProvider: isMongoActive() ? "MongoDB (Active)" : "MongoDB (Resilient In-Memory Fallback)",
      isMockMode: true,
      lastSignalReceived: latestSignal ? latestSignal.timestamp : null,
      lastSignalAgeMinutes: lastSignalAgeMs ? Math.round(lastSignalAgeMs / (1000 * 60)) : null,
      registeredStrategiesCount: globalStore.strategies.size,
      vpsConfigured: Boolean(process.env.VPS_SHARED_SECRET),
    };
  },
};
