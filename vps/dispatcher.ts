// Elvaris Capital — VPS Signal Dispatcher (TypeScript / Node.js)
// Dispatches authenticated HMAC SHA-256 webhooks to the Next.js marketplace API

import crypto from "crypto";

export interface SignalPayload {
  sourceEventId: string;
  strategyId: string;
  strategyVersion?: string;
  instrument: string;
  timeframe: string;
  signalType: "ENTRY" | "EXIT" | "STOP_LOSS" | "TAKE_PROFIT";
  direction: "LONG" | "SHORT";
  timestamp: string;
  entryPrice?: number;
  stopLoss?: number;
  targetPrice?: number;
  signalProvenance?: string;
}

export interface DispatchResult {
  success: boolean;
  statusCode?: number;
  signalId?: string;
  notifiedUsersCount?: number;
  error?: string;
}

export class VpsSignalDispatcher {
  private apiEndpoint: string;
  private sharedSecret: string;

  constructor(apiEndpoint: string, sharedSecret: string) {
    this.apiEndpoint = apiEndpoint;
    this.sharedSecret = sharedSecret;
  }

  /**
   * Generates HMAC SHA-256 signature matching Next.js server verification
   */
  public generateSignature(rawBody: string, timestamp: string): string {
    const payloadToSign = `${timestamp}.${rawBody}`;
    return crypto.createHmac("sha256", this.sharedSecret).update(payloadToSign).digest("hex");
  }

  /**
   * Signs and dispatches signal payload to the marketplace webhook receiver
   */
  public async dispatchSignal(payload: SignalPayload): Promise<DispatchResult> {
    const rawBody = JSON.stringify(payload);
    const timestamp = Date.now().toString();
    const signature = this.generateSignature(rawBody, timestamp);

    const endpointsToTry = [this.apiEndpoint];

    let lastError = "";
    let lastStatusCode = 500;

    for (const endpoint of endpointsToTry) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-vps-timestamp": timestamp,
            "x-vps-signature": signature,
          },
          body: rawBody,
        });

        const responseData = (await response.json().catch(() => ({}))) as any;

        if (response.ok) {
          return {
            success: true,
            statusCode: response.status,
            signalId: responseData.signalId,
            notifiedUsersCount: responseData.notifiedUsersCount,
          };
        }

        lastStatusCode = response.status;
        lastError = responseData.error || responseData.reason || `HTTP ${response.status}`;
      } catch (err: any) {
        lastError = err.message || "Network dispatch failure";
      }
    }

    return {
      success: false,
      statusCode: lastStatusCode,
      error: lastError,
    };
  }

  /**
   * Fetches currently active PUBLIC Pine Script strategies & params from the marketplace API
   */
  public async fetchActivePineStrategies(): Promise<{
    success: boolean;
    strategies?: any[];
    error?: string;
  }> {
    const strategiesUrl = this.apiEndpoint.replace(/\/api\/internal\/signals\/?$/, "/api/internal/vps-strategies");
    const timestamp = Date.now().toString();
    const signature = this.generateSignature("", timestamp);

    try {
      const response = await fetch(strategiesUrl, {
        method: "GET",
        headers: {
          "x-vps-timestamp": timestamp,
          "x-vps-signature": signature,
        },
      });
      const data = (await response.json().catch(() => ({}))) as any;
      if (response.ok && data.success && Array.isArray(data.strategies)) {
        return { success: true, strategies: data.strategies };
      }
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Network error fetching VPS strategies",
      };
    }
  }
}
