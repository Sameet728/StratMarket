# StratMarket — 24x7 VPS Strategy Execution Runner

Operated by **Elvaris Capital** ([https://elvariscapital.in](https://elvariscapital.in))

This directory contains the independent, 24x7 autonomous execution runner designed to be hosted on a cloud VPS (Ubuntu 24.04 LTS / Debian / Windows Server). It continuously evaluates algorithmic trading strategies, detects live trades, and dispatches HMAC SHA-256 authenticated signals to the StratMarket marketplace web application.

---

## Architecture & Data Flow

```
┌────────────────────────────────────────────────────────┐
│                   24x7 Cloud VPS                       │
│                                                        │
│   ┌────────────────────────┐  ┌────────────────────┐   │
│   │ Pine Script Evaluator  │  │  Python MT5 Runner │   │
│   │ (@mathieuc/tradingview)│  │   (MetaTrader 5)   │   │
│   │ - Grandmaster (PS-01)  │  │ - Peak Champ(PY-01)│   │
│   │ - Apex 88% WR (PS-02)  │  │ - High-Alpha(PY-02)│   │
│   │ - Strict 1:2 (PS-03)   │  │ - 5-7 Ensembles    │   │
│   │ - Elite (PS-04)        │  │                    │   │
│   └───────────┬────────────┘  └─────────┬──────────┘   │
│               │                         │              │
│               ▼                         ▼              │
│   ┌────────────────────────────────────────────────┐   │
│   │        HMAC SHA-256 Signal Dispatcher          │   │
│   │     (x-vps-timestamp, x-vps-signature)         │   │
│   └───────────────────────┬────────────────────────┘   │
└───────────────────────────┼────────────────────────────┘
                            │
                            │ HTTPS Webhook (POST /api/internal/signals)
                            ▼
┌────────────────────────────────────────────────────────┐
│            StratMarket Next.js Application             │
│                                                        │
│  - Ingests & stores signal into PostgreSQL / DB        │
│  - Verifies user 7-day trials & active subscriptions   │
│  - Sends transactional Email Alerts (ENTRY/EXIT/TP/SL) │
│  - Displays real-time signals on Chart & Admin HUD     │
└────────────────────────────────────────────────────────┘
```

---

## Quickstart & Local Test

### 1. Test Dispatcher
To test sending a sample authenticated signal to the Next.js API:

```bash
# Python:
python vps/dispatcher.py

# TypeScript:
npx tsx -e "
import { VpsSignalDispatcher } from './vps/dispatcher';
const d = new VpsSignalDispatcher('http://localhost:3000/api/internal/signals', 'stratmarket-dev-vps-hmac-shared-secret-key-2026');
d.dispatchSignal({
  sourceEventId: 'vps_test_' + Date.now(),
  strategyId: 'PS-02',
  instrument: 'XAUUSD',
  timeframe: 'M15',
  signalType: 'ENTRY',
  direction: 'LONG',
  timestamp: new Date().toISOString(),
  entryPrice: 2685.50,
  stopLoss: 2671.50,
  targetPrice: 2702.50
}).then(console.log);
"
```

### 2. Run the 24x7 VPS Supervisor
```bash
npx tsx vps/runner.ts
```

---

## 24x7 Hosting on Ubuntu VPS

### Method A: PM2 Process Manager (Recommended)
```bash
# 1. Install Node.js 20 & PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs python3 python3-pip
sudo npm install -g pm2 tsx

# 2. Clone repository & install dependencies
cd /opt/stratmarket
npm install
pip3 install -r vps/requirements.txt

# 3. Configure production environment
export VPS_API_ENDPOINT="https://stratmarket.elvariscapital.in/api/internal/signals"
export VPS_SHARED_SECRET="your-production-hmac-secret-key"

# 4. Start 24x7 daemon with PM2
pm2 start vps/ecosystem.config.js
pm2 save
pm2 startup
```

### Method B: Linux Systemd Service
```bash
# Copy systemd service file
sudo cp vps/systemd/stratmarket-vps.service /etc/systemd/system/

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable stratmarket-vps
sudo systemctl start stratmarket-vps

# Check status and live logs
sudo systemctl status stratmarket-vps
journalctl -u stratmarket-vps -f
```

### Method C: Docker Deployment
```bash
cd vps
docker compose up -d --build
```
