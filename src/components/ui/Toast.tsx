"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning" | "trade";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, "id">) => string;
  removeToast: (id: string) => void;
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  trade: (title: string, message?: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Global event bus for non-hook usage
type ToastListener = (toast: Omit<ToastMessage, "id">) => void;
const toastListeners = new Set<ToastListener>();

export const toast = {
  show: (t: Omit<ToastMessage, "id">) => {
    toastListeners.forEach((fn) => fn(t));
  },
  success: (title: string, message?: string, duration: number = 4000) => {
    toast.show({ type: "success", title, message, duration });
  },
  error: (title: string, message?: string, duration: number = 5000) => {
    toast.show({ type: "error", title, message, duration });
  },
  info: (title: string, message?: string, duration: number = 4000) => {
    toast.show({ type: "info", title, message, duration });
  },
  warning: (title: string, message?: string, duration: number = 4500) => {
    toast.show({ type: "warning", title, message, duration });
  },
  trade: (title: string, message?: string, duration: number = 6000) => {
    toast.show({ type: "trade", title, message, duration });
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (item: Omit<ToastMessage, "id">) => {
      const id = "toast_" + Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = {
        id,
        duration: item.duration || 4500,
        ...item,
      };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Keep max 5 visible

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, newToast.duration);
      }

      return id;
    },
    [removeToast]
  );

  useEffect(() => {
    const listener: ToastListener = (t) => {
      addToast(t);
    };
    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
    };
  }, [addToast]);

  const success = useCallback((title: string, message?: string, duration?: number) => addToast({ type: "success", title, message, duration }), [addToast]);
  const error = useCallback((title: string, message?: string, duration?: number) => addToast({ type: "error", title, message, duration }), [addToast]);
  const info = useCallback((title: string, message?: string, duration?: number) => addToast({ type: "info", title, message, duration }), [addToast]);
  const warning = useCallback((title: string, message?: string, duration?: number) => addToast({ type: "warning", title, message, duration }), [addToast]);
  const tradeFn = useCallback((title: string, message?: string, duration?: number) => addToast({ type: "trade", title, message, duration }), [addToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        success,
        error,
        info,
        warning,
        trade: tradeFn,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return toast;
  }
  return ctx;
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: 420,
        width: "calc(100vw - 40px)",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: () => void;
}) {
  const getTheme = () => {
    switch (toast.type) {
      case "success":
        return {
          border: "rgba(163, 230, 53, 0.4)",
          glow: "0 8px 32px rgba(163, 230, 53, 0.2)",
          accent: "#a3e635",
          icon: "✓",
          badge: "CONFIRMED",
        };
      case "error":
        return {
          border: "rgba(239, 68, 68, 0.4)",
          glow: "0 8px 32px rgba(239, 68, 68, 0.25)",
          accent: "#ef4444",
          icon: "✕",
          badge: "ALERT",
        };
      case "warning":
        return {
          border: "rgba(245, 158, 11, 0.4)",
          glow: "0 8px 32px rgba(245, 158, 11, 0.2)",
          accent: "#f59e0b",
          icon: "⚠",
          badge: "NOTICE",
        };
      case "trade":
        return {
          border: "rgba(56, 189, 248, 0.5)",
          glow: "0 8px 32px rgba(56, 189, 248, 0.25)",
          accent: "#38bdf8",
          icon: "⚡",
          badge: "TRADE EVENT",
        };
      case "info":
      default:
        return {
          border: "rgba(96, 165, 250, 0.35)",
          glow: "0 8px 32px rgba(96, 165, 250, 0.15)",
          accent: "#60a5fa",
          icon: "ℹ",
          badge: "SYSTEM",
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      style={{
        pointerEvents: "auto",
        background: "linear-gradient(135deg, rgba(20, 22, 28, 0.96) 0%, rgba(12, 14, 18, 0.98) 100%)",
        border: `1px solid ${theme.border}`,
        boxShadow: `${theme.glow}, 0 20px 40px rgba(0,0,0,0.8)`,
        borderRadius: 12,
        padding: "14px 16px",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        color: "#ffffff",
        position: "relative",
        overflow: "hidden",
        animation: "toastSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Accent Icon Pill */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: `rgba(255, 255, 255, 0.05)`,
            border: `1px solid ${theme.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: theme.accent,
            fontSize: 14,
            fontWeight: 800,
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          {theme.icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: theme.accent,
                textTransform: "uppercase",
              }}
            >
              {theme.badge}
            </span>
          </div>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.35,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {toast.title}
          </div>
          {toast.message && (
            <div
              style={{
                fontSize: 12,
                color: "rgba(255, 255, 255, 0.65)",
                marginTop: 4,
                lineHeight: 1.45,
              }}
            >
              {toast.message}
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          type="button"
          aria-label="Dismiss toast"
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255, 255, 255, 0.4)",
            cursor: "pointer",
            fontSize: 14,
            padding: 4,
            lineHeight: 1,
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)")}
        >
          ✕
        </button>
      </div>

      {/* Auto-Dismiss Progress Bar */}
      {toast.duration && toast.duration > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 2,
            background: theme.accent,
            width: "100%",
            animation: `toastCountdown ${toast.duration}ms linear forwards`,
            opacity: 0.7,
          }}
        />
      )}
    </div>
  );
}

