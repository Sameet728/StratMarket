"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StratMarketLogo } from "@/components/StratMarketLogo";
import { StrategySeedItem, PineParams, ReportData } from "@/lib/db/seed-data";
import pineReportsData from "@/lib/data/pineReports.json";
import ensembleReportsData from "@/lib/data/ensembleReports.json";

interface AdminStats {
  totalUsers: number;
  totalStrategies: number;
  pythonStrategies: number;
  pineStrategies: number;
  signalsIngested: number;
}

interface VpsRuntimeHealth {
  vpsEndpoint: string;
  status: string;
  isMockMode: boolean;
  lastSignalReceived: string | null;
  lastSignalAgeMinutes: number | null;
  registeredStrategiesCount: number;
  vpsConfigured: boolean;
}

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  accountStatus: string;
  activeTrialsCount: number;
  activeEntitlementsCount: number;
  connectionsCount: number;
  createdAt: string;
}

const DEFAULT_PINE_PARAMS: PineParams = {
  bandLength: 28,
  bandMult: 2.1,
  emaMacroLen: 200,
  emaFastLen: 50,
  atrLen: 14,
  offsetVal: 4.0,
  crashFilterAtr: 1.25,
  rsiLen: 14,
  rsiLongThresh: 52,
  rsiShortThresh: 48,
  tpDist: 14.0,
  slDist: 13.75,
  sessionStart: 1,
  sessionEnd: 20,
  excludeHour12: false,
  maxDailyLosses: 1,
  maxDailyTrades: 2,
};

type ModalMode = "create" | "edit" | null;
type ModalTab = "basic" | "metrics" | "report" | "breakdown" | "pine";

interface StrategyFormData {
  name: string;
  slug: string;
  implementationType: "PYTHON" | "PINE_SCRIPT";
  instrument: string;
  timeframe: string;
  category: string;
  description: string;
  visibilityStatus: "PUBLIC" | "PRIVATE" | "DRAFT" | "ARCHIVED";
  currentVersion: string;
  trialEligibility: boolean;
  netProfitUsd: string;
  // Core Metrics
  netReturn: string;
  maxDrawdown: string;
  profitFactor: string;
  winRate: string;
  calmarRatio: string;
  totalTrades: string;
  averageTrade: string;
  sharpeRatio: string;
  backtestPeriod: string;
  transactionCosts: string;
  slippageAssumptions: string;
  dataSource: string;
  validationType: "BACKTESTED" | "SIMULATED" | "PAPER_TRADED" | "FORWARD_TESTED" | "LIVE";
  // Research Report
  hypothesis: string;
  methodology: string;
  riskRules: string;
  knownLimitations: string;
  dataCleaning: string;
  executionProtocol: string;
  // Full ReportData (Strategy Report view sections)
  reportSubtitle: string;
  bigStats: Array<{ val: string; label: string }>;
  mechLede: string;
  mechRows: Array<{ engine: string; weight: string; soloPnl: string; soloPf: string; soloDd: string; role: string }>;
  kpiLede: string;
  kpis: Array<{ val: string; label: string }>;
  payoffRatio: string;
  avgWin: string;
  avgLoss: string;
  actualWinRate: string;
  breakevenWinRate: string;
  expectancy: string;
  totalPnl: string;
  maxConsecWins: string;
  maxConsecLosses: string;
  longStats: { trades: string; pnl: string; winRate: string; pf: string };
  shortStats: { trades: string; pnl: string; winRate: string; pf: string };
  regimes: Array<{ name: string; period: string; trades: string; pnl: string; winRate: string; pf: string; dd: string }>;
  yearly: Array<{ year: string; trades: string; wl: string; winRate: string; returnPct: string }>;
  scriptDataJson: string;
  // Pine Params
  pineParams: PineParams;
}

function blankForm(): StrategyFormData {
  return {
    name: "",
    slug: "",
    implementationType: "PINE_SCRIPT",
    instrument: "XAUUSD",
    timeframe: "M15",
    category: "Mean reversion",
    description: "",
    visibilityStatus: "PRIVATE",
    currentVersion: "1.0.0",
    trialEligibility: true,
    netProfitUsd: "",
    netReturn: "",
    maxDrawdown: "",
    profitFactor: "",
    winRate: "",
    calmarRatio: "",
    totalTrades: "",
    averageTrade: "",
    sharpeRatio: "",
    backtestPeriod: "",
    transactionCosts: "Spread $0.20/oz, slippage $0.05/oz",
    slippageAssumptions: "Next-bar-open execution",
    dataSource: "TradingView",
    validationType: "BACKTESTED",
    hypothesis: "",
    methodology: "",
    riskRules: "",
    knownLimitations: "",
    dataCleaning: "Filtered for weekend rollover gaps and illiquid hours.",
    executionProtocol: "Automated 24x7 VPS Pine Script evaluator with HMAC webhooks.",
    reportSubtitle: "",
    bigStats: [],
    mechLede: "",
    mechRows: [],
    kpiLede: "",
    kpis: [],
    payoffRatio: "",
    avgWin: "",
    avgLoss: "",
    actualWinRate: "",
    breakevenWinRate: "",
    expectancy: "",
    totalPnl: "",
    maxConsecWins: "",
    maxConsecLosses: "",
    longStats: { trades: "", pnl: "", winRate: "", pf: "" },
    shortStats: { trades: "", pnl: "", winRate: "", pf: "" },
    regimes: [],
    yearly: [],
    scriptDataJson: "",
    pineParams: { ...DEFAULT_PINE_PARAMS },
  };
}

function strategyToForm(s: StrategySeedItem): StrategyFormData {
  const staticPreset: any =
    s.implementationType === "PYTHON"
      ? (ensembleReportsData as any)[s.slug]
      : (pineReportsData as any)[s.slug];
  const rd: ReportData = { ...(staticPreset || {}), ...(s.reportData || {}) };

  return {
    name: s.name,
    slug: s.slug,
    implementationType: s.implementationType,
    instrument: s.instrument,
    timeframe: s.timeframe,
    category: s.category,
    description: s.description,
    visibilityStatus: s.visibilityStatus,
    currentVersion: s.currentVersion,
    trialEligibility: s.trialEligibility,
    netProfitUsd: s.netProfitUsd || "",
    netReturn: String(s.metrics.netReturn),
    maxDrawdown: String(s.metrics.maxDrawdown),
    profitFactor: String(s.metrics.profitFactor),
    winRate: String(s.metrics.winRate),
    calmarRatio: String(s.metrics.calmarRatio ?? ""),
    totalTrades: String(s.metrics.totalTrades),
    averageTrade: String(s.metrics.averageTrade),
    sharpeRatio: String(s.metrics.sharpeRatio),
    backtestPeriod: s.metrics.backtestPeriod,
    transactionCosts: s.metrics.transactionCosts,
    slippageAssumptions: s.metrics.slippageAssumptions,
    dataSource: s.metrics.dataSource,
    validationType: s.metrics.validationType,
    hypothesis: s.researchReport.hypothesis,
    methodology: s.researchReport.methodology,
    riskRules: s.researchReport.riskRules,
    knownLimitations: s.researchReport.knownLimitations,
    dataCleaning: s.researchReport.dataCleaning,
    executionProtocol: s.researchReport.executionProtocol,
    reportSubtitle: rd.subtitle || "",
    bigStats: Array.isArray(rd.bigStats) ? rd.bigStats.map((b) => ({ val: b.val, label: b.label })) : [],
    mechLede: rd.mechLede || "",
    mechRows: Array.isArray(rd.mechRows) ? rd.mechRows.map((r) => ({ ...r })) : [],
    kpiLede: rd.kpiLede || "",
    kpis: Array.isArray(rd.kpis) ? rd.kpis.map((k) => ({ val: k.val, label: k.label })) : [],
    payoffRatio: rd.payoff?.payoffRatio || "",
    avgWin: rd.payoff?.avgWin || "",
    avgLoss: rd.payoff?.avgLoss || "",
    actualWinRate: rd.payoff?.actualWinRate || "",
    breakevenWinRate: rd.payoff?.breakevenWinRate || "",
    expectancy: rd.payoff?.expectancy || "",
    totalPnl: rd.payoff?.totalPnl || "",
    maxConsecWins: rd.payoff?.maxConsecWins !== undefined ? String(rd.payoff.maxConsecWins) : "",
    maxConsecLosses: rd.payoff?.maxConsecLosses !== undefined ? String(rd.payoff.maxConsecLosses) : "",
    longStats: rd.longStats ? { ...rd.longStats } : { trades: "", pnl: "", winRate: "", pf: "" },
    shortStats: rd.shortStats ? { ...rd.shortStats } : { trades: "", pnl: "", winRate: "", pf: "" },
    regimes: Array.isArray(rd.regimes)
      ? rd.regimes.map((r) => ({ ...r, trades: String(r.trades) }))
      : [],
    yearly: Array.isArray(rd.yearly)
      ? rd.yearly.map((y) => ({
          year: y.year,
          trades: String(y.trades),
          wl: y.wl,
          winRate: y.winRate,
          returnPct: y.returnPct || y.pnl || "",
        }))
      : [],
    scriptDataJson: rd.scriptData ? JSON.stringify(rd.scriptData, null, 2) : "",
    pineParams: s.pineParams ? { ...DEFAULT_PINE_PARAMS, ...s.pineParams } : { ...DEFAULT_PINE_PARAMS },
  };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg)",
  border: "1px solid var(--line)",
  borderRadius: "6px",
  padding: "7px 10px",
  color: "#fff",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--muted, #888)",
  display: "block",
  marginBottom: "3px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

function FormField({
  label,
  value,
  onChange,
  type = "text",
  step,
  placeholder,
  as,
  options,
}: {
  label: string;
  value: string | number | boolean;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
  as?: "textarea" | "select";
  options?: string[];
}) {
  if (as === "textarea") {
    return (
      <div>
        <label style={labelStyle}>{label}</label>
        <textarea
          value={value as string}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>
    );
  }
  if (as === "select" && options) {
    return (
      <div>
        <label style={labelStyle}>{label}</label>
        <select value={value as string} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (type === "checkbox") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          type="checkbox"
          checked={value as boolean}
          onChange={(e) => onChange(String(e.target.checked))}
          style={{ width: 16, height: 16 }}
        />
        <label style={{ ...labelStyle, marginBottom: 0, textTransform: "none", fontSize: "13px" }}>{label}</label>
      </div>
    );
  }
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        step={step}
        placeholder={placeholder}
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function PineParamsSection({
  params,
  onChange,
}: {
  params: PineParams;
  onChange: (p: PineParams) => void;
}) {
  const set = (key: keyof PineParams, val: string) => {
    const numVal = parseFloat(val);
    onChange({ ...params, [key]: isNaN(numVal) ? 0 : numVal });
  };
  return (
    <div>
      <div
        style={{
          fontWeight: 700,
          fontSize: "13px",
          borderBottom: "1px solid var(--line)",
          paddingBottom: "8px",
          marginBottom: "10px",
          color: "var(--lime, #a3e635)",
        }}
      >
        🌲 24x7 VPS Pine Script Execution Parameters
      </div>
      <p className="note" style={{ fontSize: "12px", marginBottom: "12px" }}>
        When visibility is set to <b>PUBLIC</b>, the 24x7 VPS runner automatically polls and executes these exact Pine parameters on live TradingView candles within 60 seconds.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
        <FormField label="Band Length" value={params.bandLength} onChange={(v) => set("bandLength", v)} type="number" />
        <FormField label="Band Mult" value={params.bandMult} onChange={(v) => set("bandMult", v)} type="number" step="0.01" />
        <FormField label="EMA Macro Len" value={params.emaMacroLen} onChange={(v) => set("emaMacroLen", v)} type="number" />
        <FormField label="EMA Fast Len" value={params.emaFastLen} onChange={(v) => set("emaFastLen", v)} type="number" />
        <FormField label="ATR Len" value={params.atrLen} onChange={(v) => set("atrLen", v)} type="number" />
        <FormField label="Offset Val" value={params.offsetVal} onChange={(v) => set("offsetVal", v)} type="number" step="0.01" />
        <FormField label="Crash Filter ATR" value={params.crashFilterAtr} onChange={(v) => set("crashFilterAtr", v)} type="number" step="0.01" />
        <FormField label="RSI Len" value={params.rsiLen} onChange={(v) => set("rsiLen", v)} type="number" />
        <FormField label="RSI Long Thresh" value={params.rsiLongThresh} onChange={(v) => set("rsiLongThresh", v)} type="number" />
        <FormField label="RSI Short Thresh" value={params.rsiShortThresh} onChange={(v) => set("rsiShortThresh", v)} type="number" />
        <FormField label="TP Dist ($)" value={params.tpDist} onChange={(v) => set("tpDist", v)} type="number" step="0.01" />
        <FormField label="SL Dist ($)" value={params.slDist} onChange={(v) => set("slDist", v)} type="number" step="0.01" />
        <FormField label="Session Start (UTC H)" value={params.sessionStart} onChange={(v) => set("sessionStart", v)} type="number" />
        <FormField label="Session End (UTC H)" value={params.sessionEnd} onChange={(v) => set("sessionEnd", v)} type="number" />
        <FormField label="Max Daily Losses" value={params.maxDailyLosses} onChange={(v) => set("maxDailyLosses", v)} type="number" />
        <FormField label="Max Daily Trades" value={params.maxDailyTrades} onChange={(v) => set("maxDailyTrades", v)} type="number" />
        <div style={{ gridColumn: "span 3", marginTop: "4px" }}>
          <FormField
            label="Exclude Hour 12 (noon UTC)"
            value={params.excludeHour12}
            onChange={(v) => onChange({ ...params, excludeHour12: v === "true" })}
            type="checkbox"
          />
        </div>
      </div>
    </div>
  );
}

export function AdminClient() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [vpsHealth, setVpsHealth] = useState<VpsRuntimeHealth | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [strategies, setStrategies] = useState<StrategySeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"strategies" | "runtime" | "customers" | "audit">("strategies");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [modalTab, setModalTab] = useState<ModalTab>("basic");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StrategyFormData>(blankForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const router = useRouter();

  const refreshAdminData = useCallback(async () => {
    try {
      const [stratRes, overviewRes] = await Promise.all([
        fetch("/api/admin/strategies"),
        fetch("/api/admin/overview"),
      ]);
      const stratData = await stratRes.json();
      if (stratData.success) setStrategies(stratData.data || []);

      const overviewData = await overviewRes.json();
      if (overviewData.success) {
        setStats(overviewData.stats);
        setVpsHealth(overviewData.vpsRuntime);
        setAuditLogs(overviewData.recentAuditLogs || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    async function fetchAdminData() {
      try {
        const authRes = await fetch("/api/auth/me");
        const authData = await authRes.json();
        if (!authData.authenticated || authData.user?.role !== "ADMIN") {
          setError("Administrator privilege required. Please sign in as an admin.");
          setLoading(false);
          return;
        }

        const [usersRes] = await Promise.all([
          fetch("/api/admin/users"),
          refreshAdminData(),
        ]);

        const usersData = await usersRes.json();
        if (usersData.success) setUsers(usersData.data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load administrative console.");
      } finally {
        setLoading(false);
      }
    }
    fetchAdminData();
  }, [refreshAdminData]);

  const toggleStrategyStatus = async (s: StrategySeedItem) => {
    const newStatus = s.visibilityStatus === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    try {
      const res = await fetch(`/api/admin/strategies/${s.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setStrategies((prev) => prev.map((item) => (item.id === s.id ? { ...item, visibilityStatus: newStatus } : item)));
        setStatusBanner(
          newStatus === "PUBLIC"
            ? `${s.id} (${s.name}) is now PUBLIC — visible to traders, enabled for alerts, and will auto-sync to the 24x7 VPS within 60s.`
            : `${s.id} (${s.name}) is now PRIVATE — hidden from users and stopped from VPS alerts.`
        );
        refreshAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openCreate = () => {
    setForm(blankForm());
    setEditingId(null);
    setSaveError(null);
    setModalTab("basic");
    setModalMode("create");
  };

  const openEdit = (s: StrategySeedItem) => {
    setForm(strategyToForm(s));
    setEditingId(s.id);
    setSaveError(null);
    setModalTab("basic");
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setSaveError(null);
  };

  const setF = (key: keyof StrategyFormData, val: any) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim() || form.name.trim().length < 2) {
      setSaveError("Strategy Name must be at least 2 characters.");
      setModalTab("basic");
      return;
    }
    if (!form.description.trim()) {
      setSaveError("Description is required.");
      setModalTab("basic");
      return;
    }

    let parsedScriptData: ReportData["scriptData"] | undefined;
    if (form.scriptDataJson.trim()) {
      try {
        parsedScriptData = JSON.parse(form.scriptDataJson);
      } catch {
        setSaveError("Monthly Heatmap / ScriptData JSON is invalid. Please fix JSON syntax or leave blank.");
        setModalTab("breakdown");
        return;
      }
    }

    setSaving(true);
    setSaveError(null);

    try {
      const hasPayoffFields =
        form.payoffRatio || form.avgWin || form.avgLoss || form.actualWinRate || form.breakevenWinRate || form.expectancy || form.totalPnl;

      const reportData: ReportData = {
        subtitle: form.reportSubtitle || undefined,
        bigStats: form.bigStats.filter((b) => b.val.trim() || b.label.trim()),
        mechLede: form.mechLede || undefined,
        mechRows: form.mechRows.filter((r) => r.engine.trim()),
        kpiLede: form.kpiLede || undefined,
        kpis: form.kpis.filter((k) => k.val.trim() || k.label.trim()),
        payoff: hasPayoffFields
          ? {
              payoffRatio: form.payoffRatio || undefined,
              avgWin: form.avgWin || undefined,
              avgLoss: form.avgLoss || undefined,
              actualWinRate: form.actualWinRate || undefined,
              breakevenWinRate: form.breakevenWinRate || undefined,
              expectancy: form.expectancy || undefined,
              totalPnl: form.totalPnl || undefined,
              maxConsecWins: form.maxConsecWins ? parseInt(form.maxConsecWins, 10) : undefined,
              maxConsecLosses: form.maxConsecLosses ? parseInt(form.maxConsecLosses, 10) : undefined,
            }
          : undefined,
        longStats: form.longStats.trades || form.longStats.pnl ? form.longStats : undefined,
        shortStats: form.shortStats.trades || form.shortStats.pnl ? form.shortStats : undefined,
        regimes: form.regimes.filter((r) => r.name.trim()),
        yearly: form.yearly.filter((y) => y.year.trim()),
        scriptData: parsedScriptData,
      };

      const cleanSlug = (form.slug || form.name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "")) || "strategy";

      const payload = {
        name: form.name.trim(),
        slug: cleanSlug,
        implementationType: form.implementationType,
        instrument: form.instrument,
        timeframe: form.timeframe,
        category: form.category,
        description: form.description.trim(),
        visibilityStatus: form.visibilityStatus,
        currentVersion: form.currentVersion.trim() || "1.0.0",
        trialEligibility: form.trialEligibility,
        netProfitUsd: form.netProfitUsd || undefined,
        metrics: {
          netReturn: parseFloat(form.netReturn) || 0,
          maxDrawdown: parseFloat(form.maxDrawdown) || 0,
          profitFactor: parseFloat(form.profitFactor) || 0,
          winRate: parseFloat(form.winRate) || 0,
          calmarRatio: form.calmarRatio ? parseFloat(form.calmarRatio) : undefined,
          totalTrades: parseInt(form.totalTrades, 10) || 0,
          averageTrade: parseFloat(form.averageTrade) || 0,
          sharpeRatio: parseFloat(form.sharpeRatio) || 0,
          backtestPeriod: form.backtestPeriod,
          transactionCosts: form.transactionCosts,
          slippageAssumptions: form.slippageAssumptions,
          dataSource: form.dataSource || "TradingView",
          validationType: form.validationType,
          isDemo: false,
        },
        researchReport: {
          hypothesis: form.hypothesis,
          methodology: form.methodology,
          riskRules: form.riskRules,
          knownLimitations: form.knownLimitations,
          dataCleaning: form.dataCleaning,
          executionProtocol: form.executionProtocol,
        },
        pineParams: form.implementationType === "PINE_SCRIPT" ? form.pineParams : undefined,
        reportData,
      };

      let res: Response;
      if (modalMode === "create") {
        res = await fetch("/api/admin/strategies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/admin/strategies/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        setSaveError(data.error || "Failed to save strategy.");
        return;
      }

      const savedStrat = data.strategy;
      setStatusBanner(
        modalMode === "create"
          ? `Created strategy ${savedStrat.id} (${savedStrat.name}) as ${savedStrat.visibilityStatus}.`
          : `Updated strategy ${savedStrat.id} (${savedStrat.name}).`
      );
      await refreshAdminData();
      closeModal();
    } catch (err: any) {
      setSaveError(err.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/strategies/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setStrategies((prev) => prev.filter((s) => s.id !== id));
        setDeleteConfirmId(null);
        setStatusBanner(`Deleted strategy ${id}. Removed from marketplace and VPS rotation.`);
        refreshAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="wrap admin-wrap" style={{ textAlign: "center" }}>
        <p className="note">Authenticating administrative credentials...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wrap admin-wrap" style={{ textAlign: "center" }}>
        <h2 style={{ color: "var(--dn)" }}>Access Restricted</h2>
        <p className="note" style={{ margin: "16px 0 24px" }}>{error}</p>
        <button type="button" className="pill" onClick={() => router.push("/signin")} style={{ touchAction: "manipulation" }}>
          Sign in as Administrator
        </button>
      </div>
    );
  }

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.8)",
    zIndex: 1000,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    overflowY: "auto",
    padding: "24px 16px",
  };

  const modalStyle: React.CSSProperties = {
    background: "var(--card, #111)",
    border: "1px solid var(--line)",
    borderRadius: "14px",
    width: "100%",
    maxWidth: "860px",
    padding: "28px",
    position: "relative",
  };

  const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" };
  const grid3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" };

  return (
    <div className="wrap admin-wrap">
      {/* Admin Header */}
      <div
        style={{
          borderBottom: "1px solid var(--line)",
          paddingBottom: "24px",
          marginBottom: "32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <span className="badge pn" style={{ borderColor: "rgba(255, 255, 255, 0.15)", color: "#ffffff" }}>
            Elvaris Capital Core System
          </span>
          <h1 style={{ fontSize: "36px", marginTop: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
            <StratMarketLogo size={32} color="#ffffff" />
            <span>StratMarket Administration</span>
          </h1>
          <p className="note" style={{ fontSize: "14px", marginTop: "4px" }}>
            Full strategy lifecycle management, report editing, 24x7 VPS auto-sync, customer entitlements, and security audits.
          </p>
        </div>
        <div>
          <Link
            href="/analytics"
            className="pill g sm"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(163, 230, 53, 0.12)",
              borderColor: "rgba(163, 230, 53, 0.4)",
              color: "var(--lime)",
              fontWeight: 700,
            }}
          >
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--lime)", boxShadow: "0 0 8px var(--lime)" }} />
            View Live Telemetry Dashboard ↗
          </Link>
        </div>
      </div>

      {/* KPI Overview Grid */}
      {stats && (
        <div className="kp" style={{ marginBottom: "32px" }}>
          <div>Registered Traders<b>{stats.totalUsers}</b></div>
          <div>Total Strategies<b>{stats.totalStrategies}</b></div>
          <div>Python / Pine<b>{stats.pythonStrategies} / {stats.pineStrategies}</b></div>
          <div>Signals Processed<b>{stats.signalsIngested}</b></div>
        </div>
      )}

      {statusBanner && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid rgba(163, 230, 53, 0.4)",
            background: "rgba(163, 230, 53, 0.08)",
            color: "#d9f99d",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "13px",
          }}
        >
          <span>✓ {statusBanner}</span>
          <button type="button" onClick={() => setStatusBanner(null)} style={{ background: "none", border: "none", color: "#d9f99d", cursor: "pointer", fontSize: "16px" }}>×</button>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="chips" style={{ marginBottom: "24px" }}>
        <button type="button" className={`chip ${activeTab === "strategies" ? "on" : ""}`} onClick={() => setActiveTab("strategies")} style={{ touchAction: "manipulation" }}>
          Strategy Management ({strategies.length})
        </button>
        <button type="button" className={`chip ${activeTab === "runtime" ? "on" : ""}`} onClick={() => setActiveTab("runtime")} style={{ touchAction: "manipulation" }}>
          VPS Runtime &amp; Signals
        </button>
        <button type="button" className={`chip ${activeTab === "customers" ? "on" : ""}`} onClick={() => setActiveTab("customers")} style={{ touchAction: "manipulation" }}>
          Customer Access ({users.length})
        </button>
        <button type="button" className={`chip ${activeTab === "audit" ? "on" : ""}`} onClick={() => setActiveTab("audit")} style={{ touchAction: "manipulation" }}>
          Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Strategy Management */}
      {activeTab === "strategies" && (
        <div className="card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h3 style={{ margin: 0 }}>Catalogue Inventory &amp; Publication</h3>
              <p className="note" style={{ marginTop: "4px" }}>
                Add, edit, or delete strategies with complete report sections. Publishing a Pine strategy to <b>PUBLIC</b> automatically adds it to users, alerts, and the 24x7 VPS runner within 60s.
              </p>
            </div>
            <button
              type="button"
              className="pill g"
              onClick={openCreate}
              style={{ background: "rgba(163, 230, 53, 0.15)", borderColor: "rgba(163, 230, 53, 0.5)", color: "var(--lime)", fontWeight: 700, touchAction: "manipulation" }}
            >
              + Add New Strategy
            </button>
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            {strategies.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: "1px solid var(--line)",
                  borderRadius: "10px",
                  padding: "14px",
                  background: "var(--bg)",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <span className={`badge ${s.implementationType === "PYTHON" ? "py" : "pn"}`}>
                      {s.implementationType === "PINE_SCRIPT" ? "PINE" : "PYTHON"}
                    </span>
                    <b>{s.id}: {s.name}</b>
                    {s.pineParams && (
                      <span style={{ fontSize: "10px", background: "rgba(163,230,53,0.1)", border: "1px solid rgba(163,230,53,0.3)", borderRadius: "4px", padding: "1px 6px", color: "var(--lime)" }}>
                        VPS Params ✓
                      </span>
                    )}
                    {s.visibilityStatus === "PUBLIC" && s.implementationType === "PINE_SCRIPT" && (
                      <span style={{ fontSize: "10px", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "4px", padding: "1px 6px", color: "#38bdf8" }}>
                        24x7 Alerts Active
                      </span>
                    )}
                  </div>
                  <div className="note" style={{ marginTop: "4px" }}>
                    {s.instrument} · {s.timeframe} · {s.category} · Return: {s.metrics.netReturn}% · Max DD: {s.metrics.maxDrawdown}% · WR: {s.metrics.winRate}% · PF: {s.metrics.profitFactor}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <span className={`badge ${s.visibilityStatus === "PUBLIC" ? "py" : "pn"}`}>
                    {s.visibilityStatus}
                  </span>
                  <Link href={`/strategies/${s.slug}`} className="chip" target="_blank" style={{ textDecoration: "none" }}>
                    View Report ↗
                  </Link>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => toggleStrategyStatus(s)}
                    style={{ touchAction: "manipulation" }}
                  >
                    {s.visibilityStatus === "PUBLIC" ? "Make Private" : "Publish Public"}
                  </button>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => openEdit(s)}
                    style={{ touchAction: "manipulation" }}
                  >
                    Edit
                  </button>
                  {deleteConfirmId === s.id ? (
                    <span style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span className="note" style={{ fontSize: "12px" }}>Confirm?</span>
                      <button type="button" className="chip" onClick={() => handleDelete(s.id)} style={{ color: "var(--dn)", touchAction: "manipulation" }}>Yes, delete</button>
                      <button type="button" className="chip" onClick={() => setDeleteConfirmId(null)} style={{ touchAction: "manipulation" }}>Cancel</button>
                    </span>
                  ) : (
                    <button type="button" className="chip" onClick={() => setDeleteConfirmId(s.id)} style={{ color: "var(--dn)", touchAction: "manipulation" }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: VPS Runtime & Health */}
      {activeTab === "runtime" && vpsHealth && (
        <div style={{ display: "grid", gap: "24px" }}>
          <div className="card" style={{ padding: "24px" }}>
            <h3>Pine Script VPS Runtime Monitor</h3>
            <p className="note" style={{ marginBottom: "16px" }}>
              Direct integration boundary with the Elvaris Capital execution environment. VPS polls <code>/api/internal/vps-strategies</code> every 60s.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
              <div style={{ border: "1px solid var(--line)", borderRadius: "10px", padding: "14px", background: "var(--bg)" }}>
                <span className="note">VPS Endpoint</span>
                <b style={{ display: "block", fontSize: "14px", marginTop: "4px", wordBreak: "break-all" }}>{vpsHealth.vpsEndpoint}</b>
              </div>
              <div style={{ border: "1px solid var(--line)", borderRadius: "10px", padding: "14px", background: "var(--bg)" }}>
                <span className="note">Connection State</span>
                <b style={{ display: "block", fontSize: "14px", marginTop: "4px", color: "#ffffff" }}>{vpsHealth.status}</b>
              </div>
              <div style={{ border: "1px solid var(--line)", borderRadius: "10px", padding: "14px", background: "var(--bg)" }}>
                <span className="note">Last Ingested Signal</span>
                <b style={{ display: "block", fontSize: "14px", marginTop: "4px" }}>
                  {vpsHealth.lastSignalReceived
                    ? `${new Date(vpsHealth.lastSignalReceived).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} (${vpsHealth.lastSignalAgeMinutes}m ago)`
                    : "No signals received yet"}
                </b>
              </div>
              <div style={{ border: "1px solid var(--line)", borderRadius: "10px", padding: "14px", background: "var(--bg)" }}>
                <span className="note">HMAC Shared Secret</span>
                <b style={{ display: "block", fontSize: "14px", marginTop: "4px", color: vpsHealth.vpsConfigured ? "var(--up)" : "var(--dn)" }}>
                  {vpsHealth.vpsConfigured ? "Configured & Active" : "Missing secret"}
                </b>
              </div>
            </div>

            <div className="note" style={{ marginTop: "16px", padding: "12px", border: "1px dashed var(--line)", borderRadius: "8px" }}>
              VPS polls <code>GET /api/internal/vps-strategies</code> every 60s using HMAC SHA-256 authentication. Publishing a new Pine strategy to PUBLIC automatically adds it to the VPS 24x7 loop and activates email + Telegram alerts.
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Customer Access */}
      {activeTab === "customers" && (
        <div className="card" style={{ padding: "24px" }}>
          <h3>Customer Entitlements &amp; Accounts</h3>
          <p className="note" style={{ marginBottom: "16px" }}>
            Audit active trials and broker connection scopes for registered users.
          </p>

          <div style={{ display: "grid", gap: "10px" }}>
            {users.map((u) => (
              <div
                key={u.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: "1px solid var(--line)",
                  borderRadius: "10px",
                  padding: "14px",
                  background: "var(--bg)",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <b>{u.name}</b>
                    <span className="badge py">{u.role}</span>
                  </div>
                  <div className="note" style={{ marginTop: "4px" }}>
                    {u.email} · Account: {u.accountStatus} · Joined {new Date(u.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "12px", fontSize: "13px" }}>
                  <span>Active trials: <b>{u.activeTrialsCount}</b></span>
                  <span>Connections: <b>{u.connectionsCount}</b></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === "audit" && (
        <div className="card" style={{ padding: "24px" }}>
          <h3>Security &amp; Operational Audit Trail</h3>
          <p className="note" style={{ marginBottom: "16px" }}>
            Immutable event log tracking logins, trial activations, webhook signals, and administrative mutations.
          </p>

          <div style={{ display: "grid", gap: "8px" }}>
            {auditLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  background: "var(--bg)",
                }}
              >
                <div>
                  <span className="badge pn" style={{ marginRight: "8px" }}>{log.action}</span>
                  <span>{log.details || log.entityType}</span>
                </div>
                <span className="note">{new Date(log.createdAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy Create / Edit Modal */}
      {modalMode && (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div style={modalStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>{modalMode === "create" ? "Add New Strategy" : `Edit Strategy: ${editingId}`}</h3>
              <button type="button" onClick={closeModal} style={{ background: "none", border: "none", color: "#888", fontSize: "20px", cursor: "pointer" }}>×</button>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="chips" style={{ marginBottom: "18px", flexWrap: "wrap" }}>
              <button type="button" className={`chip ${modalTab === "basic" ? "on" : ""}`} onClick={() => setModalTab("basic")}>
                1. Basic &amp; Visibility
              </button>
              <button type="button" className={`chip ${modalTab === "metrics" ? "on" : ""}`} onClick={() => setModalTab("metrics")}>
                2. Metrics &amp; Payoff
              </button>
              <button type="button" className={`chip ${modalTab === "report" ? "on" : ""}`} onClick={() => setModalTab("report")}>
                3. Architecture &amp; Report
              </button>
              <button type="button" className={`chip ${modalTab === "breakdown" ? "on" : ""}`} onClick={() => setModalTab("breakdown")}>
                4. Regimes &amp; Monthly
              </button>
              {form.implementationType === "PINE_SCRIPT" && (
                <button type="button" className={`chip ${modalTab === "pine" ? "on" : ""}`} onClick={() => setModalTab("pine")}>
                  5. Pine VPS Params
                </button>
              )}
            </div>

            <div style={{ display: "grid", gap: "14px" }}>
              {/* TAB 1: BASIC */}
              {modalTab === "basic" && (
                <>
                  <div style={grid2}>
                    <FormField
                      label="Strategy Name"
                      value={form.name}
                      onChange={(v) => {
                        setF("name", v);
                        if (modalMode === "create" && (!form.slug || form.slug === form.name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, ""))) {
                          setF("slug", v.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, ""));
                        }
                      }}
                      placeholder="e.g. Asian Gold Breakout"
                    />
                    <FormField label="Slug (URL)" value={form.slug} onChange={(v) => setF("slug", v)} placeholder="e.g. ps-04 or asian-gold" />
                  </div>
                  <div style={grid3}>
                    <FormField label="Type" value={form.implementationType} onChange={(v) => setF("implementationType", v)} as="select" options={["PINE_SCRIPT", "PYTHON"]} />
                    <FormField label="Instrument" value={form.instrument} onChange={(v) => setF("instrument", v)} as="select" options={["XAUUSD", "NAS100", "EURUSD", "GBPUSD", "US30", "BTCUSD"]} />
                    <FormField label="Timeframe" value={form.timeframe} onChange={(v) => setF("timeframe", v)} as="select" options={["M5", "M15", "M30", "H1", "H4", "D1"]} />
                  </div>
                  <div style={grid3}>
                    <FormField label="Category" value={form.category} onChange={(v) => setF("category", v)} as="select" options={["Mean reversion", "Trend", "Momentum", "Breakout", "Volatility", "Scalping"]} />
                    <FormField label="Visibility" value={form.visibilityStatus} onChange={(v) => setF("visibilityStatus", v)} as="select" options={["PRIVATE", "PUBLIC", "DRAFT", "ARCHIVED"]} />
                    <FormField label="Version" value={form.currentVersion} onChange={(v) => setF("currentVersion", v)} />
                  </div>
                  <FormField label="Description" value={form.description} onChange={(v) => setF("description", v)} as="textarea" placeholder="Summary shown in marketplace card & report hero" />
                  <FormField
                    label="Eligible for Free Trial"
                    value={form.trialEligibility}
                    onChange={(v) => setF("trialEligibility", v === "true")}
                    type="checkbox"
                  />
                </>
              )}

              {/* TAB 2: METRICS & PAYOFF */}
              {modalTab === "metrics" && (
                <>
                  <div style={grid3}>
                    <FormField label="Net Return (%)" value={form.netReturn} onChange={(v) => setF("netReturn", v)} type="number" step="0.01" />
                    <FormField label="Max Drawdown (%)" value={form.maxDrawdown} onChange={(v) => setF("maxDrawdown", v)} type="number" step="0.01" />
                    <FormField label="Profit Factor" value={form.profitFactor} onChange={(v) => setF("profitFactor", v)} type="number" step="0.01" />
                    <FormField label="Win Rate (%)" value={form.winRate} onChange={(v) => setF("winRate", v)} type="number" step="0.01" />
                    <FormField label="Calmar Ratio" value={form.calmarRatio} onChange={(v) => setF("calmarRatio", v)} type="number" step="0.01" />
                    <FormField label="Sharpe Ratio" value={form.sharpeRatio} onChange={(v) => setF("sharpeRatio", v)} type="number" step="0.01" />
                    <FormField label="Total Trades" value={form.totalTrades} onChange={(v) => setF("totalTrades", v)} type="number" />
                    <FormField label="Avg Trade (R)" value={form.averageTrade} onChange={(v) => setF("averageTrade", v)} type="number" step="0.01" />
                    <FormField label="Net Profit (USD)" value={form.netProfitUsd} onChange={(v) => setF("netProfitUsd", v)} placeholder="+$12,500.00" />
                  </div>
                  <div style={grid2}>
                    <FormField label="Backtest Period" value={form.backtestPeriod} onChange={(v) => setF("backtestPeriod", v)} placeholder="2026-08-02 to 2026-11-09 (6,800 bars)" />
                    <FormField label="Data Source" value={form.dataSource} onChange={(v) => setF("dataSource", v)} />
                    <FormField label="Transaction Costs" value={form.transactionCosts} onChange={(v) => setF("transactionCosts", v)} />
                    <FormField label="Slippage Assumptions" value={form.slippageAssumptions} onChange={(v) => setF("slippageAssumptions", v)} />
                  </div>
                  <div style={grid2}>
                    <FormField label="Validation Type" value={form.validationType} onChange={(v) => setF("validationType", v)} as="select" options={["BACKTESTED", "SIMULATED", "PAPER_TRADED", "FORWARD_TESTED", "LIVE"]} />
                    <FormField label="Report Hero Subtitle" value={form.reportSubtitle} onChange={(v) => setF("reportSubtitle", v)} placeholder="Optional custom subtitle for tear sheet hero" />
                  </div>

                  {/* Hero Big Stats */}
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: "10px", marginTop: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ ...labelStyle, marginBottom: 0 }}>Hero Stat Cards (up to 4)</span>
                      <button type="button" className="chip" onClick={() => setF("bigStats", [...form.bigStats, { val: "", label: "" }])}>+ Add Stat Card</button>
                    </div>
                    {form.bigStats.map((bs, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px", marginBottom: "6px" }}>
                        <input style={inputStyle} placeholder="Value (e.g. +28.67R)" value={bs.val} onChange={(e) => { const next = [...form.bigStats]; next[idx] = { ...bs, val: e.target.value }; setF("bigStats", next); }} />
                        <input style={inputStyle} placeholder="Label (e.g. Net Return)" value={bs.label} onChange={(e) => { const next = [...form.bigStats]; next[idx] = { ...bs, label: e.target.value }; setF("bigStats", next); }} />
                        <button type="button" className="chip" style={{ color: "var(--dn)" }} onClick={() => setF("bigStats", form.bigStats.filter((_, i) => i !== idx))}>×</button>
                      </div>
                    ))}
                  </div>

                  {/* Payoff Structure */}
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: "10px" }}>
                    <span style={{ ...labelStyle, marginBottom: "8px" }}>Payoff Structure &amp; Mathematical Edge</span>
                    <div style={grid3}>
                      <FormField label="Payoff Ratio" value={form.payoffRatio} onChange={(v) => setF("payoffRatio", v)} placeholder="1.02:1" />
                      <FormField label="Avg Win" value={form.avgWin} onChange={(v) => setF("avgWin", v)} placeholder="+1.02R" />
                      <FormField label="Avg Loss" value={form.avgLoss} onChange={(v) => setF("avgLoss", v)} placeholder="-1.00R" />
                      <FormField label="Actual Win Rate" value={form.actualWinRate} onChange={(v) => setF("actualWinRate", v)} placeholder="80.43%" />
                      <FormField label="Breakeven Win Rate" value={form.breakevenWinRate} onChange={(v) => setF("breakevenWinRate", v)} placeholder="49.5%" />
                      <FormField label="Expectancy" value={form.expectancy} onChange={(v) => setF("expectancy", v)} placeholder="+0.62R / trade" />
                      <FormField label="Cumulative PnL Label" value={form.totalPnl} onChange={(v) => setF("totalPnl", v)} placeholder="+28.67R" />
                      <FormField label="Max Consec Wins" value={form.maxConsecWins} onChange={(v) => setF("maxConsecWins", v)} type="number" />
                      <FormField label="Max Consec Losses" value={form.maxConsecLosses} onChange={(v) => setF("maxConsecLosses", v)} type="number" />
                    </div>
                  </div>
                </>
              )}

              {/* TAB 3: ARCHITECTURE & RESEARCH REPORT */}
              {modalTab === "report" && (
                <>
                  <FormField label="Hypothesis" value={form.hypothesis} onChange={(v) => setF("hypothesis", v)} as="textarea" />
                  <FormField label="Methodology" value={form.methodology} onChange={(v) => setF("methodology", v)} as="textarea" />
                  <FormField label="Risk Rules" value={form.riskRules} onChange={(v) => setF("riskRules", v)} as="textarea" />
                  <div style={grid2}>
                    <FormField label="Known Limitations" value={form.knownLimitations} onChange={(v) => setF("knownLimitations", v)} as="textarea" />
                    <FormField label="Data Cleaning" value={form.dataCleaning} onChange={(v) => setF("dataCleaning", v)} as="textarea" />
                  </div>
                  <FormField label="Execution Protocol" value={form.executionProtocol} onChange={(v) => setF("executionProtocol", v)} as="textarea" />

                  {/* Architecture Subsystems (mechRows) */}
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: "10px" }}>
                    <FormField label="Architecture Lede (How Strategy Works)" value={form.mechLede} onChange={(v) => setF("mechLede", v)} as="textarea" />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0 6px" }}>
                      <span style={{ ...labelStyle, marginBottom: 0 }}>Quantitative Subsystems Table</span>
                      <button type="button" className="chip" onClick={() => setF("mechRows", [...form.mechRows, { engine: "", weight: "1.00×", soloPnl: "—", soloPf: "—", soloDd: "—", role: "" }])}>+ Add Subsystem</button>
                    </div>
                    {form.mechRows.map((row, idx) => (
                      <div key={idx} style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "8px", marginBottom: "8px", display: "grid", gap: "6px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: "6px" }}>
                          <input style={inputStyle} placeholder="Engine name" value={row.engine} onChange={(e) => { const n = [...form.mechRows]; n[idx] = { ...row, engine: e.target.value }; setF("mechRows", n); }} />
                          <input style={inputStyle} placeholder="Weight" value={row.weight} onChange={(e) => { const n = [...form.mechRows]; n[idx] = { ...row, weight: e.target.value }; setF("mechRows", n); }} />
                          <input style={inputStyle} placeholder="Solo PnL" value={row.soloPnl} onChange={(e) => { const n = [...form.mechRows]; n[idx] = { ...row, soloPnl: e.target.value }; setF("mechRows", n); }} />
                          <input style={inputStyle} placeholder="Solo PF" value={row.soloPf} onChange={(e) => { const n = [...form.mechRows]; n[idx] = { ...row, soloPf: e.target.value }; setF("mechRows", n); }} />
                          <input style={inputStyle} placeholder="Solo DD" value={row.soloDd} onChange={(e) => { const n = [...form.mechRows]; n[idx] = { ...row, soloDd: e.target.value }; setF("mechRows", n); }} />
                          <button type="button" className="chip" style={{ color: "var(--dn)" }} onClick={() => setF("mechRows", form.mechRows.filter((_, i) => i !== idx))}>×</button>
                        </div>
                        <input style={inputStyle} placeholder="Portfolio Function & Role" value={row.role} onChange={(e) => { const n = [...form.mechRows]; n[idx] = { ...row, role: e.target.value }; setF("mechRows", n); }} />
                      </div>
                    ))}
                  </div>

                  {/* Custom Report KPIs */}
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: "10px" }}>
                    <FormField label="KPI Section Lede" value={form.kpiLede} onChange={(v) => setF("kpiLede", v)} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0 6px" }}>
                      <span style={{ ...labelStyle, marginBottom: 0 }}>Custom Core KPI Tiles</span>
                      <button type="button" className="chip" onClick={() => setF("kpis", [...form.kpis, { val: "", label: "" }])}>+ Add KPI Tile</button>
                    </div>
                    {form.kpis.map((k, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px", marginBottom: "6px" }}>
                        <input style={inputStyle} placeholder="Value (e.g. 14.33)" value={k.val} onChange={(e) => { const n = [...form.kpis]; n[idx] = { ...k, val: e.target.value }; setF("kpis", n); }} />
                        <input style={inputStyle} placeholder="Label (e.g. Calmar Ratio)" value={k.label} onChange={(e) => { const n = [...form.kpis]; n[idx] = { ...k, label: e.target.value }; setF("kpis", n); }} />
                        <button type="button" className="chip" style={{ color: "var(--dn)" }} onClick={() => setF("kpis", form.kpis.filter((_, i) => i !== idx))}>×</button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* TAB 4: LONG/SHORT, REGIMES, YEARLY & MONTHLY */}
              {modalTab === "breakdown" && (
                <>
                  <div style={grid2}>
                    <div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "10px" }}>
                      <span style={labelStyle}>Long Trades Stats</span>
                      <div style={grid2}>
                        <input style={inputStyle} placeholder="Trades (e.g. 25)" value={form.longStats.trades} onChange={(e) => setF("longStats", { ...form.longStats, trades: e.target.value })} />
                        <input style={inputStyle} placeholder="Net Return (+15.4R)" value={form.longStats.pnl} onChange={(e) => setF("longStats", { ...form.longStats, pnl: e.target.value })} />
                        <input style={inputStyle} placeholder="Win Rate (80.0%)" value={form.longStats.winRate} onChange={(e) => setF("longStats", { ...form.longStats, winRate: e.target.value })} />
                        <input style={inputStyle} placeholder="Profit Factor (4.10)" value={form.longStats.pf} onChange={(e) => setF("longStats", { ...form.longStats, pf: e.target.value })} />
                      </div>
                    </div>
                    <div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "10px" }}>
                      <span style={labelStyle}>Short Trades Stats</span>
                      <div style={grid2}>
                        <input style={inputStyle} placeholder="Trades (e.g. 21)" value={form.shortStats.trades} onChange={(e) => setF("shortStats", { ...form.shortStats, trades: e.target.value })} />
                        <input style={inputStyle} placeholder="Net Return (+13.2R)" value={form.shortStats.pnl} onChange={(e) => setF("shortStats", { ...form.shortStats, pnl: e.target.value })} />
                        <input style={inputStyle} placeholder="Win Rate (80.9%)" value={form.shortStats.winRate} onChange={(e) => setF("shortStats", { ...form.shortStats, winRate: e.target.value })} />
                        <input style={inputStyle} placeholder="Profit Factor (4.29)" value={form.shortStats.pf} onChange={(e) => setF("shortStats", { ...form.shortStats, pf: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* Regimes */}
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ ...labelStyle, marginBottom: 0 }}>Market Regimes Table</span>
                      <button type="button" className="chip" onClick={() => setF("regimes", [...form.regimes, { name: "", period: "", trades: "", pnl: "", winRate: "", pf: "", dd: "" }])}>+ Add Regime</button>
                    </div>
                    {form.regimes.map((reg, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr 0.6fr 0.8fr 0.7fr 0.6fr 0.7fr auto", gap: "6px", marginBottom: "6px" }}>
                        <input style={inputStyle} placeholder="Regime" value={reg.name} onChange={(e) => { const n = [...form.regimes]; n[idx] = { ...reg, name: e.target.value }; setF("regimes", n); }} />
                        <input style={inputStyle} placeholder="Period" value={reg.period} onChange={(e) => { const n = [...form.regimes]; n[idx] = { ...reg, period: e.target.value }; setF("regimes", n); }} />
                        <input style={inputStyle} placeholder="Trades" value={reg.trades} onChange={(e) => { const n = [...form.regimes]; n[idx] = { ...reg, trades: e.target.value }; setF("regimes", n); }} />
                        <input style={inputStyle} placeholder="PnL" value={reg.pnl} onChange={(e) => { const n = [...form.regimes]; n[idx] = { ...reg, pnl: e.target.value }; setF("regimes", n); }} />
                        <input style={inputStyle} placeholder="WR" value={reg.winRate} onChange={(e) => { const n = [...form.regimes]; n[idx] = { ...reg, winRate: e.target.value }; setF("regimes", n); }} />
                        <input style={inputStyle} placeholder="PF" value={reg.pf} onChange={(e) => { const n = [...form.regimes]; n[idx] = { ...reg, pf: e.target.value }; setF("regimes", n); }} />
                        <input style={inputStyle} placeholder="DD" value={reg.dd} onChange={(e) => { const n = [...form.regimes]; n[idx] = { ...reg, dd: e.target.value }; setF("regimes", n); }} />
                        <button type="button" className="chip" style={{ color: "var(--dn)" }} onClick={() => setF("regimes", form.regimes.filter((_, i) => i !== idx))}>×</button>
                      </div>
                    ))}
                  </div>

                  {/* Yearly Breakdown */}
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ ...labelStyle, marginBottom: 0 }}>Year-by-Year Breakdown</span>
                      <button type="button" className="chip" onClick={() => setF("yearly", [...form.yearly, { year: "2026", trades: "", wl: "", winRate: "", returnPct: "" }])}>+ Add Year</button>
                    </div>
                    {form.yearly.map((y, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "0.8fr 0.8fr 1fr 0.9fr 1fr auto", gap: "6px", marginBottom: "6px" }}>
                        <input style={inputStyle} placeholder="Year" value={y.year} onChange={(e) => { const n = [...form.yearly]; n[idx] = { ...y, year: e.target.value }; setF("yearly", n); }} />
                        <input style={inputStyle} placeholder="Trades" value={y.trades} onChange={(e) => { const n = [...form.yearly]; n[idx] = { ...y, trades: e.target.value }; setF("yearly", n); }} />
                        <input style={inputStyle} placeholder="W / L" value={y.wl} onChange={(e) => { const n = [...form.yearly]; n[idx] = { ...y, wl: e.target.value }; setF("yearly", n); }} />
                        <input style={inputStyle} placeholder="Win Rate" value={y.winRate} onChange={(e) => { const n = [...form.yearly]; n[idx] = { ...y, winRate: e.target.value }; setF("yearly", n); }} />
                        <input style={inputStyle} placeholder="Net Return" value={y.returnPct} onChange={(e) => { const n = [...form.yearly]; n[idx] = { ...y, returnPct: e.target.value }; setF("yearly", n); }} />
                        <button type="button" className="chip" style={{ color: "var(--dn)" }} onClick={() => setF("yearly", form.yearly.filter((_, i) => i !== idx))}>×</button>
                      </div>
                    ))}
                  </div>

                  {/* Monthly Heatmap JSON */}
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: "10px" }}>
                    <label style={labelStyle}>Monthly Heatmap &amp; ScriptData JSON (Optional)</label>
                    <textarea
                      rows={5}
                      value={form.scriptDataJson}
                      onChange={(e) => setF("scriptDataJson", e.target.value)}
                      placeholder='{"mx":30,"years":[["2026",28.67]],"pnl":{"2026":[null,null,null,null,null,null,null,9.2,9.2,7.2,3.07,null]},"cnt":{"2026":[0,0,0,0,0,0,0,15,14,12,5,0]},"tot":{"2026":28.67},"tc":{"2026":46}}'
                      style={{ ...inputStyle, fontFamily: "JetBrains Mono, monospace", fontSize: "12px", resize: "vertical" }}
                    />
                  </div>
                </>
              )}

              {/* TAB 5: PINE VPS PARAMS */}
              {modalTab === "pine" && form.implementationType === "PINE_SCRIPT" && (
                <PineParamsSection
                  params={form.pineParams}
                  onChange={(p) => setF("pineParams", p)}
                />
              )}

              {saveError && (
                <div style={{ padding: "10px", border: "1px solid var(--dn)", borderRadius: "8px", color: "var(--dn)", fontSize: "13px" }}>
                  {saveError}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginTop: "8px", borderTop: "1px solid var(--line)", paddingTop: "14px" }}>
                <span className="note" style={{ fontSize: "12px" }}>
                  {form.visibilityStatus === "PUBLIC"
                    ? "Will be visible to users & alerts (+ auto-synced to 24x7 VPS if Pine)"
                    : "Saved as PRIVATE (hidden from users & alerts)"}
                </span>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" className="chip" onClick={closeModal} style={{ touchAction: "manipulation" }}>Cancel</button>
                  <button
                    type="button"
                    className="pill g"
                    onClick={handleSave}
                    disabled={saving}
                    style={{ background: "rgba(163, 230, 53, 0.15)", borderColor: "rgba(163, 230, 53, 0.5)", color: "var(--lime)", fontWeight: 700, touchAction: "manipulation" }}
                  >
                    {saving ? "Saving..." : modalMode === "create" ? "Create Strategy" : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
