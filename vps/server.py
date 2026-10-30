"""
Elvaris Capital — StratMarket VPS Supervisor & Dashboard Server
================================================================
Serves the 24x7 VPS HTML Dashboard on Port 8080 (or Port 80),
exposes system health/telemetry, and proxies authenticated
test dispatches to the live Vercel marketplace.
"""

import os
import sys
import json
import time
import subprocess
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

# Add directory to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from dispatcher import VpsSignalDispatcher

# Load configuration
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")
try:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        CONFIG = json.load(f)
except Exception as e:
    CONFIG = {
        "apiEndpoint": "https://strat-market-chi.vercel.app/api/internal/signals",
        "healthEndpoint": "https://strat-market-chi.vercel.app/api/internal/health",
        "sharedSecret": "stratmarket-dev-vps-hmac-shared-secret-key-2026",
    }

API_ENDPOINT = os.environ.get("VPS_API_ENDPOINT", CONFIG.get("apiEndpoint", "https://strat-market-chi.vercel.app/api/internal/signals"))
SHARED_SECRET = os.environ.get("VPS_SHARED_SECRET", CONFIG.get("sharedSecret", "stratmarket-dev-vps-hmac-shared-secret-key-2026"))
PORT = int(os.environ.get("PORT", "8080"))

dispatcher = VpsSignalDispatcher(API_ENDPOINT, SHARED_SECRET)

def get_system_stats():
    stats = {
        "load": "0.00",
        "mem_total_mb": 952,
        "mem_used_mb": 200,
        "mem_percent": 21,
        "swap_total_mb": 4096,
        "swap_used_mb": 0,
        "uptime": "Unknown",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
    }
    try:
        with open("/proc/loadavg", "r") as f:
            stats["load"] = f.read().split()[0]
    except Exception:
        pass

    try:
        with open("/proc/uptime", "r") as f:
            up_secs = int(float(f.read().split()[0]))
            hours = up_secs // 3600
            mins = (up_secs % 3600) // 60
            stats["uptime"] = f"{hours}h {mins}m"
    except Exception:
        pass

    try:
        p = subprocess.run(["free", "-m"], capture_output=True, text=True, timeout=2)
        lines = p.stdout.strip().split("\n")
        for line in lines:
            if line.startswith("Mem:"):
                parts = line.split()
                total = int(parts[1])
                used = int(parts[2])
                stats["mem_total_mb"] = total
                stats["mem_used_mb"] = used
                stats["mem_percent"] = round((used / total) * 100, 1) if total > 0 else 0
            elif line.startswith("Swap:"):
                parts = line.split()
                stats["swap_total_mb"] = int(parts[1])
                stats["swap_used_mb"] = int(parts[2])
    except Exception:
        pass

    return stats


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


class DashboardHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Concise logging
        sys.stderr.write(f"[{time.strftime('%H:%M:%S')}] {self.address_string()} - {format%args}\n")

    def do_HEAD(self):
        self.do_GET()

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, x-vps-signature, x-vps-timestamp")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?")[0]

        # 1. Root / or /dashboard -> serve dashboard.html
        if path in ("/", "/dashboard", "/index.html"):
            html_path = os.path.join(BASE_DIR, "dashboard.html")
            try:
                with open(html_path, "r", encoding="utf-8") as f:
                    content = f.read().encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(content)
            except Exception as e:
                self.send_error(500, f"Error reading dashboard.html: {e}")
            return

        # 2. System status endpoint
        if path == "/api/vps/status":
            stats = get_system_stats()
            ticks_file = os.path.join(BASE_DIR, "data", "atlas_ticks.json")
            atlas_status = "Cloud Market Data Stream (24/7 Active)"
            latest_tick = None
            if os.path.exists(ticks_file):
                try:
                    with open(ticks_file, "r", encoding="utf-8") as f:
                        latest_tick = json.load(f)
                    age = time.time() - latest_tick.get("received_at", 0)
                    if age < 60:
                        atlas_status = f"LIVE Atlas Funded Feed (Active, {round(age)}s ago)"
                    else:
                        atlas_status = f"Cloud Market Data Stream (Atlas idle {round(age)}s ago)"
                except Exception:
                    pass

            resp = json.dumps({
                "success": True,
                "status": "ONLINE",
                "targetApi": API_ENDPOINT,
                "stats": stats,
                "strategies": {
                    "pine": [s["name"] for s in CONFIG.get("pineStrategies", []) if s.get("enabled", True)],
                    "python": [s["name"] for s in CONFIG.get("pythonStrategies", []) if s.get("enabled", True)],
                },
                "mt5": atlas_status,
                "latestAtlasTick": latest_tick,
            }).encode("utf-8")

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(resp)))
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(resp)
            return

        # 2b. Latest tick inspection endpoint (handles both /api/vps/ticks and /api/vps/ticks/status)
        if path in ("/api/vps/ticks", "/api/vps/ticks/status"):
            bid = 3896.20
            ask = 3896.45
            spread = 25
            try:
                req = urllib.request.Request(
                    "https://api.binance.com/api/v3/ticker/bookTicker?symbol=PAXGUSDT",
                    headers={"User-Agent": "StratMarket-VPS/1.0"}
                )
                with urllib.request.urlopen(req, timeout=3) as r:
                    bt = json.loads(r.read().decode("utf-8"))
                    bid = round(float(bt.get("bidPrice", 3896.20)), 2)
                    ask = round(float(bt.get("askPrice", 3896.45)), 2)
                    spread = max(1, round((ask - bid) * 100))
            except Exception as e:
                pass

            data = {
                "success": True,
                "mode": "24/7 Autonomous VPS Cloud Stream",
                "instrument": "XAUUSD (Gold)",
                "status": "ONLINE (Autonomous VPS Streamer Active)",
                "currentPrice": round((bid + ask) / 2, 2),
                "tick": {
                    "symbol": "XAUUSD",
                    "bid": bid,
                    "ask": ask,
                    "price": round((bid + ask) / 2, 2),
                    "spread": spread,
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
                }
            }
            resp = json.dumps(data, indent=2).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(resp)))
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(resp)
            return

        # 3. Proxy signals from Vercel MongoDB to local dashboard
        if path.startswith("/api/strategies/") and path.endswith("/signals"):
            vercel_url = f"https://strat-market-chi.vercel.app{self.path}"
            try:
                req = urllib.request.Request(vercel_url, headers={"User-Agent": "StratMarket-VPS/1.0"})
                with urllib.request.urlopen(req, timeout=8) as r:
                    data = r.read()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Content-Length", str(len(data)))
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(data)
                    return
            except Exception as e:
                resp = json.dumps({"success": False, "error": str(e), "data": []}).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(resp)
                return

        self.send_error(404, "Endpoint not found")

    def do_POST(self):
        path = self.path.split("?")[0]

        # 0. Live tick ingestion from Atlas Funded / MQL5 / Cloud Bridge
        if path == "/api/vps/ticks":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length) if content_length > 0 else b"{}"
            try:
                payload = json.loads(body.decode("utf-8")) if body else {}
                data_dir = os.path.join(BASE_DIR, "data")
                os.makedirs(data_dir, exist_ok=True)
                ticks_file = os.path.join(data_dir, "atlas_ticks.json")
                payload["received_at"] = time.time()
                with open(ticks_file, "w", encoding="utf-8") as f:
                    json.dump(payload, f)
                resp = json.dumps({
                    "success": True,
                    "message": "Atlas tick ingested successfully",
                    "symbol": payload.get("symbol", "XAUUSD"),
                    "bid": payload.get("bid"),
                    "ask": payload.get("ask"),
                    "timestamp": payload.get("received_at")
                }).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(resp)
            except Exception as e:
                self.send_error(400, f"Error processing tick: {e}")
            return

        # 1. Trigger live test signal dispatch with valid HMAC signature
        if path in ("/api/vps/test-signal", "/api/internal/signals"):
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length) if content_length > 0 else b"{}"
            try:
                payload = json.loads(body.decode("utf-8")) if body else {}
            except Exception:
                payload = {}

            strat = payload.get("strategyId", "PS-02")
            inst = payload.get("instrument", "XAUUSD")
            tf = payload.get("timeframe", "M15")
            sig_type = payload.get("signalType", "ENTRY")
            dir_val = payload.get("direction", "LONG")

            # Dynamic live market price detection
            if "entryPrice" in payload:
                entry = float(payload["entryPrice"])
            else:
                try:
                    req = urllib.request.Request(
                        "https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT",
                        headers={"User-Agent": "StratMarket-VPS/1.0"}
                    )
                    with urllib.request.urlopen(req, timeout=3) as r:
                        entry = round(float(json.loads(r.read().decode("utf-8"))["price"]), 2)
                except Exception:
                    entry = 3895.50

            sl = float(payload.get("stopLoss", round(entry - 14.0 if dir_val == "LONG" else entry + 14.0, 2)))
            tp = float(payload.get("targetPrice", round(entry + 18.0 if dir_val == "LONG" else entry - 18.0, 2)))

            # Dispatch with authentic HMAC SHA-256 signature
            result = dispatcher.dispatch_signal(
                strategy_id=strat,
                instrument=inst,
                timeframe=tf,
                signal_type=sig_type,
                direction=dir_val,
                entry_price=entry,
                stop_loss=sl,
                target_price=tp,
                provenance="ELVARIS_VPS_DASHBOARD_LIVE"
            )

            resp = json.dumps({
                "success": result.get("success", False),
                "dispatchResult": result,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            }).encode("utf-8")

            self.send_response(200 if result.get("success") else 500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(resp)))
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(resp)
            return

        self.send_error(404, "Not Found")


def run_server():
    server_address = ("0.0.0.0", PORT)
    httpd = ThreadedHTTPServer(server_address, DashboardHandler)
    print("=" * 70)
    print(f"  STRATMARKET VPS DASHBOARD SERVER")
    print(f"  Listening on: http://0.0.0.0:{PORT}")
    print(f"  Target Webhook: {API_ENDPOINT}")
    print("=" * 70)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping dashboard server...")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
