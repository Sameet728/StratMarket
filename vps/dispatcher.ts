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
    const liveFallback = "https://strat-market-chi.vercel.app/api/internal/signals";
    if (this.apiEndpoint !== liveFallback) {
      endpointsToTry.push(liveFallback);
    }

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
}
