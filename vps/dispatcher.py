"""
Elvaris Capital — VPS Signal Dispatcher (Python 3)
==================================================
Dispatches authenticated HMAC SHA-256 webhooks from Python MT5 strategy runners
to the Next.js marketplace internal ingestion endpoint.
"""

import hmac
import hashlib
import time
import json
import urllib.request
import urllib.error
from typing import Optional, Dict, Any

class VpsSignalDispatcher:
    def __init__(self, api_endpoint: str, shared_secret: str):
        self.api_endpoint = api_endpoint
        self.shared_secret = shared_secret.encode('utf-8')

    def generate_signature(self, raw_body: str, timestamp: str) -> str:
        payload = f"{timestamp}.{raw_body}".encode('utf-8')
        return hmac.new(self.shared_secret, payload, hashlib.sha256).hexdigest()

    def dispatch_signal(
        self,
        strategy_id: str,
        instrument: str,
        timeframe: str,
        signal_type: str,
        direction: str,
        entry_price: Optional[float] = None,
        stop_loss: Optional[float] = None,
        target_price: Optional[float] = None,
        strategy_version: str = "1.0.0",
        provenance: str = "ELVARIS_VPS_MT5_ENGINE"
    ) -> Dict[str, Any]:
        """
        Dispatches an authenticated signal webhook with HMAC SHA-256 headers.
        """
        timestamp = str(int(time.time() * 1000))
        event_id = f"vps_evt_{strategy_id.lower().replace('-', '_')}_{timestamp}"

        payload_dict = {
            "sourceEventId": event_id,
            "strategyId": strategy_id,
            "strategyVersion": strategy_version,
            "instrument": instrument,
            "timeframe": timeframe,
            "signalType": signal_type,
            "direction": direction,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "signalProvenance": provenance,
        }

        if entry_price is not None:
            payload_dict["entryPrice"] = round(float(entry_price), 2)
        if stop_loss is not None:
            payload_dict["stopLoss"] = round(float(stop_loss), 2)
        if target_price is not None:
            payload_dict["targetPrice"] = round(float(target_price), 2)

        raw_body = json.dumps(payload_dict)
        signature = self.generate_signature(raw_body, timestamp)

        endpoints_to_try = [self.api_endpoint]

        last_error = ""
        last_status = 500

        for endpoint in endpoints_to_try:
            req = urllib.request.Request(
                endpoint,
                data=raw_body.encode('utf-8'),
                headers={
                    "Content-Type": "application/json",
                    "x-vps-timestamp": timestamp,
                    "x-vps-signature": signature,
                    "User-Agent": "Elvaris-Python-VPS-Dispatcher/1.0"
                },
                method="POST"
            )

            try:
                with urllib.request.urlopen(req, timeout=10) as response:
                    resp_body = response.read().decode('utf-8')
                    data = json.loads(resp_body)
                    return {
                        "success": True,
                        "status_code": response.status,
                        "signal_id": data.get("signalId"),
                        "notified_users": data.get("notifiedUsersCount", 0),
                        "event_id": event_id
                    }
            except urllib.error.HTTPError as e:
                err_body = e.read().decode('utf-8')
                last_error = err_body
                last_status = e.code
            except Exception as e:
                last_error = str(e)

        return {
            "success": False,
            "status_code": last_status,
            "error": last_error,
            "event_id": event_id
        }

if __name__ == "__main__":
    # Test dispatcher
    dispatcher = VpsSignalDispatcher(
        "http://localhost:3000/api/internal/signals",
        "stratmarket-dev-vps-hmac-shared-secret-key-2026"
    )
    res = dispatcher.dispatch_signal(
        strategy_id="PY-01",
        instrument="XAUUSD",
        timeframe="5",
        signal_type="ENTRY",
        direction="LONG",
        entry_price=2684.50,
        stop_loss=2670.00,
        target_price=2702.50
    )
    print("Test Dispatch Result:", res)
