"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StratMarketLogo } from "@/components/StratMarketLogo";
import { StrategySeedItem, PineParams, ReportData } from "@/lib/db/seed-data";
import { extractPineMetadata } from "@/lib/pine/pine-interpreter";
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
type OptionalTab = "metrics" | "report" | "breakdown" | "params";

interface StrategyFormData {
  name: string;
  slug: string;
  pineScriptCode: string;
  implementationType: "PYTHON" | "PINE_SCRIPT";
  instrument: string;
  timeframe: string;
  category: string;
  description: string;
  visibilityStatus: "PUBLIC" | "PRIVATE" | "DRAFT" | "ARCHIVED";
  currentVersion: string;
  trialEligibility: boolean;
  netProfitUsd: string;
  // Optional Core Metrics
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
  // Optional Research Report
  hypothesis: string;
  methodology: string;
  riskRules: string;
  knownLimitations: string;
  dataCleaning: string;
  executionProtocol: string;
  // Optional Full ReportData sections
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
  pineParams: PineParams;
}

function blankForm(): StrategyFormData {
  return {
    name: "",
    slug: "",
    pineScriptCode: "",
    implementationType: "PINE_SCRIPT",
    instrument: "XAUUSD",
    timeframe: "M15",
    category: "Mean reversion",
    description: "",
    visibilityStatus: "PUBLIC",
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
    transactionCosts: "",
    slippageAssumptions: "",
    dataSource: "TradingView",
    validationType: "BACKTESTED",
    hypothesis: "",
    methodology: "",
    riskRules: "",
    knownLimitations: "",
    dataCleaning: "",
    executionProtocol: "",
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
    pineScriptCode: s.pineScriptCode || "",
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
  padding: "8px 10px",
  color: "#fff",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--muted, #888)",
  display: "block",
  marginBottom: "4px",
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
  const [showOptional, setShowOptional] = useState(false);
  const [optionalTab, setOptionalTab] = useState<OptionalTab>("metrics");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StrategyFormData>(blankForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const router = useRouter();

  const pinePreview = useMemo(() => {
    if (!form.pineScriptCode.trim()) return null;
    return extractPineMetadata(form.pineScriptCode);
  }, [form.pineScriptCode]);

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
            ? `${s.id} (${s.name}) is now PUBLIC — visible to users, alerts enabled, and running 24x7 on VPS within 60s.`
            : `${s.id} (${s.name}) is now PRIVATE — hidden from users, alerts disabled, and stopped from VPS.`
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
    setShowOptional(false);
    setModalMode("create");
  };

  const openEdit = (s: StrategySeedItem) => {
    setForm(strategyToForm(s));
    setEditingId(s.id);
    setSaveError(null);
    setShowOptional(false);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setSaveError(null);
  };

  const setF = (key: keyof StrategyFormData, val: any) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handlePineCodeChange = (code: string) => {
    const meta = code.trim() ? extractPineMetadata(code) : null;
    setForm((prev) => {
      const next = { ...prev, pineScriptCode: code };
      if (meta) {
        if (!prev.name && meta.detectedTitle) next.name = meta.detectedTitle;
        if (meta.detectedInstrument) next.instrument = meta.detectedInstrument;
        if (meta.detectedTimeframe) next.timeframe = meta.detectedTimeframe;
        if (!prev.winRate && meta.detectedWinRate !== undefined) next.winRate = String(meta.detectedWinRate);
        if (!prev.profitFactor && meta.detectedProfitFactor !== undefined) next.profitFactor = String(meta.detectedProfitFactor);
        if (!prev.maxDrawdown && meta.detectedMaxDrawdown !== undefined) next.maxDrawdown = String(meta.detectedMaxDrawdown);
        if (!prev.netReturn && meta.detectedNetReturn !== undefined) next.netReturn = String(meta.detectedNetReturn);
        if (!prev.totalTrades && meta.detectedTotalTrades !== undefined) next.totalTrades = String(meta.detectedTotalTrades);
      }
      return next;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    handlePineCodeChange(text);
    if (!form.name.trim()) {
      setF("name", file.name.replace(/\.(pine|txt)$/i, "").replace(/[_-]+/g, " "));
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || form.name.trim().length < 2) {
      setSaveError("Please enter a Strategy Name (at least 2 characters).");
      return;
    }

    if (form.pineScriptCode.trim() && pinePreview && !pinePreview.parseValid) {
      setSaveError(`Pine Script syntax error: ${pinePreview.parseError}`);
      return;
    }

    let parsedScriptData: ReportData["scriptData"] | undefined;
    if (form.scriptDataJson.trim()) {
      try {
        parsedScriptData = JSON.parse(form.scriptDataJson);
      } catch {
        setSaveError("Monthly Heatmap JSON is invalid. Please fix JSON syntax or clear that field.");
        return;
      }
    }

    setSaving(true);
    setSaveError(null);

    try {
      const hasPayoffFields =
        form.payoffRatio || form.avgWin || form.avgLoss || form.actualWinRate || form.breakevenWinRate || form.expectancy || form.totalPnl;

      const hasReportOverrides =
        form.reportSubtitle ||
        form.bigStats.length > 0 ||
        form.mechLede ||
        form.mechRows.length > 0 ||
        form.kpiLede ||
        form.kpis.length > 0 ||
        hasPayoffFields ||
        form.longStats.trades ||
        form.shortStats.trades ||
        form.regimes.length > 0 ||
        form.yearly.length > 0 ||
        parsedScriptData;

      const reportData: ReportData | undefined = hasReportOverrides
        ? {
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
          }
        : undefined;

      const cleanSlug =
        form.slug.trim() ||
        form.name
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "-")
          .replace(/^-|-$/g, "") ||
        "strategy";

      const hasAnyMetric =
        form.netReturn || form.maxDrawdown || form.profitFactor || form.winRate || form.totalTrades || form.sharpeRatio;

      const payload: any = {
        name: form.name.trim(),
        slug: cleanSlug,
        pineScriptCode: form.pineScriptCode.trim() || undefined,
        implementationType: form.implementationType,
        instrument: form.instrument,
        timeframe: form.timeframe,
        category: form.category || undefined,
        description: form.description.trim() || undefined,
        visibilityStatus: form.visibilityStatus,
        currentVersion: form.currentVersion.trim() || "1.0.0",
        trialEligibility: form.trialEligibility,
        netProfitUsd: form.netProfitUsd || undefined,
        reportData,
      };

      if (hasAnyMetric || modalMode === "edit") {
        payload.metrics = {
          netReturn: parseFloat(form.netReturn) || 0,
          maxDrawdown: parseFloat(form.maxDrawdown) || 0,
          profitFactor: parseFloat(form.profitFactor) || 1.0,
          winRate: parseFloat(form.winRate) || 0,
          calmarRatio: form.calmarRatio ? parseFloat(form.calmarRatio) : undefined,
          totalTrades: parseInt(form.totalTrades, 10) || 0,
          averageTrade: parseFloat(form.averageTrade) || 0,
          sharpeRatio: parseFloat(form.sharpeRatio) || 0,
          backtestPeriod: form.backtestPeriod || "Live Forward + Historical",
          transactionCosts: form.transactionCosts || "Standard spread",
          slippageAssumptions: form.slippageAssumptions || "Confirmed bar-close execution",
          dataSource: form.dataSource || "TradingView",
          validationType: form.validationType,
          isDemo: false,
        };
      }

      if (form.hypothesis || form.methodology || form.riskRules || form.knownLimitations || form.executionProtocol || modalMode === "edit") {
        payload.researchReport = {
          hypothesis: form.hypothesis || "",
          methodology: form.methodology || "",
          riskRules: form.riskRules || "",
          knownLimitations: form.knownLimitations || "",
          dataCleaning: form.dataCleaning || "",
          executionProtocol: form.executionProtocol || "",
        };
      }

      if (showOptional && form.implementationType === "PINE_SCRIPT") {
        payload.pineParams = form.pineParams;
      }

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
        savedStrat.visibilityStatus === "PUBLIC"
          ? `${savedStrat.id} (${savedStrat.name}) saved as PUBLIC — visible to users, alerts enabled, and syncing to 24x7 VPS.`
          : `${savedStrat.id} (${savedStrat.name}) saved as PRIVATE — hidden from users and not running on VPS.`
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
        setStatusBanner(`Deleted strategy ${id}. Removed from website, alerts, and VPS.`);
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
    background: "rgba(0,0,0,0.82)",
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
            Paste Pine Script strategies, toggle PUBLIC/PRIVATE visibility, and auto-deploy 24x7 alerts to the VPS.
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
              <h3 style={{ margin: 0 }}>Strategies &amp; 24x7 VPS Auto-Sync</h3>
              <p className="note" style={{ marginTop: "4px" }}>
                <b>PUBLIC</b> = visible to users, alerts active, and runs 24x7 on VPS. <b>PRIVATE</b> = hidden from users, no alerts, not running on VPS.
              </p>
            </div>
            <button
              type="button"
              className="pill g"
              onClick={openCreate}
              style={{ background: "rgba(163, 230, 53, 0.15)", borderColor: "rgba(163, 230, 53, 0.5)", color: "var(--lime)", fontWeight: 700, touchAction: "manipulation" }}
            >
              + Add New Strategy (Paste Pine Code)
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
                    {s.pineScriptCode && (
                      <span style={{ fontSize: "10px", background: "rgba(163,230,53,0.12)", border: "1px solid rgba(163,230,53,0.35)", borderRadius: "4px", padding: "1px 6px", color: "var(--lime)" }}>
                        Pine Code Uploaded ✓
                      </span>
                    )}
                    {s.visibilityStatus === "PUBLIC" && s.implementationType === "PINE_SCRIPT" && (
                      <span style={{ fontSize: "10px", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "4px", padding: "1px 6px", color: "#38bdf8" }}>
                        VPS 24x7 Active
                      </span>
                    )}
                  </div>
                  <div className="note" style={{ marginTop: "4px" }}>
                    {s.instrument} · {s.timeframe} · Return: {s.metrics.netReturn}% · Max DD: {s.metrics.maxDrawdown}% · WR: {s.metrics.winRate}% · PF: {s.metrics.profitFactor}
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
                    Edit / Code
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
          </div>
        </div>
      )}

      {/* Tab 3: Customer Access */}
      {activeTab === "customers" && (
        <div className="card" style={{ padding: "24px" }}>
          <h3>Customer Entitlements &amp; Accounts</h3>
          <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
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
          <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
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

      {/* Strategy Create / Edit Modal — SIMPLE MAIN VIEW + COLLAPSIBLE OPTIONAL REPORT */}
      {modalMode && (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div style={modalStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>{modalMode === "create" ? "Add New Strategy" : `Edit Strategy: ${editingId}`}</h3>
              <button type="button" onClick={closeModal} style={{ background: "none", border: "none", color: "#888", fontSize: "20px", cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "grid", gap: "16px" }}>
              {/* 1. REQUIRED: Strategy Name & Visibility */}
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "12px", alignItems: "end" }}>
                <FormField
                  label="Strategy Name *"
                  value={form.name}
                  onChange={(v) => {
                    setF("name", v);
                    if (modalMode === "create") {
                      setF("slug", v.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, ""));
                    }
                  }}
                  placeholder="e.g. London Keltner Champion"
                />

                <div>
                  <label style={labelStyle}>Visibility &amp; VPS Alerts</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => setF("visibilityStatus", "PUBLIC")}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: form.visibilityStatus === "PUBLIC" ? "1px solid #a3e635" : "1px solid var(--line)",
                        background: form.visibilityStatus === "PUBLIC" ? "rgba(163, 230, 53, 0.16)" : "var(--bg)",
                        color: form.visibilityStatus === "PUBLIC" ? "#a3e635" : "#888",
                        fontWeight: 700,
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      PUBLIC (Live + VPS)
                    </button>
                    <button
                      type="button"
                      onClick={() => setF("visibilityStatus", "PRIVATE")}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: form.visibilityStatus === "PRIVATE" ? "1px solid #f59e0b" : "1px solid var(--line)",
                        background: form.visibilityStatus === "PRIVATE" ? "rgba(245, 158, 11, 0.15)" : "var(--bg)",
                        color: form.visibilityStatus === "PRIVATE" ? "#fbbf24" : "#888",
                        fontWeight: 700,
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      PRIVATE (Hidden)
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. MAIN BOX: Paste Pine Script Code */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>
                    Paste Pine Script Code (//@version=5 / v6) — Runs 24x7 on VPS when PUBLIC
                  </label>
                  <label
                    style={{
                      fontSize: "11px",
                      color: "var(--lime, #a3e635)",
                      cursor: "pointer",
                      border: "1px solid rgba(163, 230, 53, 0.35)",
                      padding: "3px 10px",
                      borderRadius: "99px",
                    }}
                  >
                    Upload .pine File
                    <input type="file" accept=".pine,.txt" onChange={handleFileUpload} style={{ display: "none" }} />
                  </label>
                </div>

                <textarea
                  rows={11}
                  value={form.pineScriptCode}
                  onChange={(e) => handlePineCodeChange(e.target.value)}
                  placeholder={`//@version=5\nstrategy("My Strategy", overlay=true)\n\n// Paste your full Pine Script strategy code here...\n// Everything else below is OPTIONAL — Name + Code + PUBLIC/PRIVATE is enough!`}
                  style={{
                    ...inputStyle,
                    fontFamily: "JetBrains Mono, Consolas, monospace",
                    fontSize: "12px",
                    lineHeight: 1.5,
                    resize: "vertical",
                    background: "#090a0d",
                  }}
                />

                {/* Live Auto-Parse Feedback */}
                {pinePreview && (
                  <div
                    style={{
                      marginTop: "6px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      border: pinePreview.parseValid
                        ? "1px solid rgba(163, 230, 53, 0.35)"
                        : "1px solid rgba(239, 68, 68, 0.5)",
                      background: pinePreview.parseValid
                        ? "rgba(163, 230, 53, 0.08)"
                        : "rgba(239, 68, 68, 0.1)",
                      color: pinePreview.parseValid ? "#d9f99d" : "#fca5a5",
                    }}
                  >
                    {pinePreview.parseValid ? (
                      <>
                        ✓ Valid Pine Script {pinePreview.pineVersion || ""} · Instrument:{" "}
                        <b>{pinePreview.detectedInstrument || form.instrument}</b> · Timeframe:{" "}
                        <b>{pinePreview.detectedTimeframe || form.timeframe}</b>
                        {pinePreview.detectedIndicators.length > 0 && (
                          <> · Indicators: <b>{pinePreview.detectedIndicators.join(", ")}</b></>
                        )}
                        {(pinePreview.detectedTpDist || pinePreview.detectedSlDist) && (
                          <> · TP/SL: <b>${pinePreview.detectedTpDist ?? "?"} / ${pinePreview.detectedSlDist ?? "?"}</b></>
                        )}
                      </>
                    ) : (
                      <>Syntax Warning: {pinePreview.parseError}</>
                    )}
                  </div>
                )}
              </div>

              {/* Compact Instrument / Timeframe Bar (auto-filled from Pine code, editable if desired) */}
              <div style={grid3}>
                <FormField label="Instrument (Optional)" value={form.instrument} onChange={(v) => setF("instrument", v)} as="select" options={["XAUUSD", "NAS100", "EURUSD", "GBPUSD", "US30", "BTCUSD"]} />
                <FormField label="Timeframe (Optional)" value={form.timeframe} onChange={(v) => setF("timeframe", v)} as="select" options={["M5", "M15", "M30", "H1", "H4", "D1"]} />
                <FormField label="Engine Type" value={form.implementationType} onChange={(v) => setF("implementationType", v)} as="select" options={["PINE_SCRIPT", "PYTHON"]} />
              </div>

              {/* 3. COLLAPSIBLE OPTIONAL SECTION (Report, Metrics & Overrides) */}
              <div style={{ border: "1px solid var(--line)", borderRadius: "10px", overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setShowOptional(!showOptional)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.03)",
                    border: "none",
                    color: "#d4d4d8",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  <span>Optional: Add / Edit Strategy Report Details, Metrics &amp; Regimes</span>
                  <span>{showOptional ? "▲ Hide Optional Fields" : "▼ Expand Optional Fields"}</span>
                </button>

                {showOptional && (
                  <div style={{ padding: "16px", borderTop: "1px solid var(--line)", display: "grid", gap: "12px" }}>
                    <div className="chips">
                      <button type="button" className={`chip ${optionalTab === "metrics" ? "on" : ""}`} onClick={() => setOptionalTab("metrics")}>Metrics &amp; Payoff</button>
                      <button type="button" className={`chip ${optionalTab === "report" ? "on" : ""}`} onClick={() => setOptionalTab("report")}>Report &amp; Architecture</button>
                      <button type="button" className={`chip ${optionalTab === "breakdown" ? "on" : ""}`} onClick={() => setOptionalTab("breakdown")}>Regimes &amp; Monthly</button>
                      <button type="button" className={`chip ${optionalTab === "params" ? "on" : ""}`} onClick={() => setOptionalTab("params")}>URL Slug &amp; Fallback Params</button>
                    </div>

                    {optionalTab === "metrics" && (
                      <>
                        <FormField label="Description" value={form.description} onChange={(v) => setF("description", v)} as="textarea" placeholder="Optional description shown in marketplace & report" />
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
                          <FormField label="Backtest Period" value={form.backtestPeriod} onChange={(v) => setF("backtestPeriod", v)} />
                          <FormField label="Report Hero Subtitle" value={form.reportSubtitle} onChange={(v) => setF("reportSubtitle", v)} />
                        </div>
                        <div style={grid3}>
                          <FormField label="Payoff Ratio" value={form.payoffRatio} onChange={(v) => setF("payoffRatio", v)} placeholder="1.20:1" />
                          <FormField label="Avg Win" value={form.avgWin} onChange={(v) => setF("avgWin", v)} placeholder="+1.20R" />
                          <FormField label="Avg Loss" value={form.avgLoss} onChange={(v) => setF("avgLoss", v)} placeholder="-1.00R" />
                        </div>
                      </>
                    )}

                    {optionalTab === "report" && (
                      <>
                        <FormField label="Hypothesis" value={form.hypothesis} onChange={(v) => setF("hypothesis", v)} as="textarea" />
                        <FormField label="Methodology" value={form.methodology} onChange={(v) => setF("methodology", v)} as="textarea" />
                        <FormField label="Risk Rules" value={form.riskRules} onChange={(v) => setF("riskRules", v)} as="textarea" />
                        <FormField label="Execution Protocol" value={form.executionProtocol} onChange={(v) => setF("executionProtocol", v)} as="textarea" />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ ...labelStyle, marginBottom: 0 }}>Subsystems Table Rows</span>
                          <button type="button" className="chip" onClick={() => setF("mechRows", [...form.mechRows, { engine: "", weight: "1.00×", soloPnl: "—", soloPf: "—", soloDd: "—", role: "" }])}>+ Add Row</button>
                        </div>
                        {form.mechRows.map((row, idx) => (
                          <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr auto", gap: "6px" }}>
                            <input style={inputStyle} placeholder="Engine" value={row.engine} onChange={(e) => { const n = [...form.mechRows]; n[idx] = { ...row, engine: e.target.value }; setF("mechRows", n); }} />
                            <input style={inputStyle} placeholder="Weight" value={row.weight} onChange={(e) => { const n = [...form.mechRows]; n[idx] = { ...row, weight: e.target.value }; setF("mechRows", n); }} />
                            <input style={inputStyle} placeholder="Role" value={row.role} onChange={(e) => { const n = [...form.mechRows]; n[idx] = { ...row, role: e.target.value }; setF("mechRows", n); }} />
                            <button type="button" className="chip" style={{ color: "var(--dn)" }} onClick={() => setF("mechRows", form.mechRows.filter((_, i) => i !== idx))}>×</button>
                          </div>
                        ))}
                      </>
                    )}

                    {optionalTab === "breakdown" && (
                      <>
                        <div style={grid2}>
                          <div>
                            <label style={labelStyle}>Long Stats (Trades / PnL / WR / PF)</label>
                            <div style={grid2}>
                              <input style={inputStyle} placeholder="Trades" value={form.longStats.trades} onChange={(e) => setF("longStats", { ...form.longStats, trades: e.target.value })} />
                              <input style={inputStyle} placeholder="PnL" value={form.longStats.pnl} onChange={(e) => setF("longStats", { ...form.longStats, pnl: e.target.value })} />
                              <input style={inputStyle} placeholder="Win Rate" value={form.longStats.winRate} onChange={(e) => setF("longStats", { ...form.longStats, winRate: e.target.value })} />
                              <input style={inputStyle} placeholder="PF" value={form.longStats.pf} onChange={(e) => setF("longStats", { ...form.longStats, pf: e.target.value })} />
                            </div>
                          </div>
                          <div>
                            <label style={labelStyle}>Short Stats (Trades / PnL / WR / PF)</label>
                            <div style={grid2}>
                              <input style={inputStyle} placeholder="Trades" value={form.shortStats.trades} onChange={(e) => setF("shortStats", { ...form.shortStats, trades: e.target.value })} />
                              <input style={inputStyle} placeholder="PnL" value={form.shortStats.pnl} onChange={(e) => setF("shortStats", { ...form.shortStats, pnl: e.target.value })} />
                              <input style={inputStyle} placeholder="Win Rate" value={form.shortStats.winRate} onChange={(e) => setF("shortStats", { ...form.shortStats, winRate: e.target.value })} />
                              <input style={inputStyle} placeholder="PF" value={form.shortStats.pf} onChange={(e) => setF("shortStats", { ...form.shortStats, pf: e.target.value })} />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label style={labelStyle}>Monthly Heatmap &amp; ScriptData JSON</label>
                          <textarea
                            rows={3}
                            value={form.scriptDataJson}
                            onChange={(e) => setF("scriptDataJson", e.target.value)}
                            placeholder='{"mx":30,"years":[["2026",28.67]],"pnl":{"2026":[...]},"cnt":{"2026":[...]}}'
                            style={{ ...inputStyle, fontFamily: "JetBrains Mono, monospace", fontSize: "12px" }}
                          />
                        </div>
                      </>
                    )}

                    {optionalTab === "params" && (
                      <div style={grid3}>
                        <FormField label="URL Slug" value={form.slug} onChange={(v) => setF("slug", v)} />
                        <FormField label="Category" value={form.category} onChange={(v) => setF("category", v)} as="select" options={["Mean reversion", "Trend", "Momentum", "Breakout", "Volatility", "Scalping", "Systematic"]} />
                        <FormField label="Version" value={form.currentVersion} onChange={(v) => setF("currentVersion", v)} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {saveError && (
                <div style={{ padding: "10px", border: "1px solid var(--dn)", borderRadius: "8px", color: "var(--dn)", fontSize: "13px" }}>
                  {saveError}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", borderTop: "1px solid var(--line)", paddingTop: "14px", flexWrap: "wrap" }}>
                <span className="note" style={{ fontSize: "12px" }}>
                  {form.visibilityStatus === "PUBLIC"
                    ? "PUBLIC: Shown to users, Alerts ON & runs 24x7 on VPS automatically."
                    : "PRIVATE: Hidden from users, Alerts OFF & NOT running on VPS."}
                </span>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" className="chip" onClick={closeModal} style={{ touchAction: "manipulation" }}>Cancel</button>
                  <button
                    type="button"
                    className="pill g"
                    onClick={handleSave}
                    disabled={saving}
                    style={{ background: "rgba(163, 230, 53, 0.16)", borderColor: "rgba(163, 230, 53, 0.55)", color: "var(--lime)", fontWeight: 700, touchAction: "manipulation" }}
                  >
                    {saving ? "Saving..." : modalMode === "create" ? "Save Strategy" : "Save Changes"}
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
