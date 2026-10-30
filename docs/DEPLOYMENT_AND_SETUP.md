# StratMarket — Deployment, Setup & Production Readiness Guide
**Operated by:** Elvaris Capital ([https://elvariscapital.in](https://elvariscapital.in))  
**Product Positioning:** The Quantitative Marketplace for Institutional Trading Strategies  

---

## 1. Production Architecture Overview

The system is decoupled into two independent production tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VERCEL (Next.js Application)                    │
│                                                                        │
│  - Public Marketplace & Strategy Catalogue (/market, /strategies/[id]) │
│  - Interactive Live TradingView Charts (/chart/[id])                   │
│  - Authentication (Signup, Login, Sessions, Secure HTTP-only cookies)  │
│  - 7-Day Server-Enforced Trial Engine                                  │
│  - Signal Ingest Webhook (POST /api/internal/signals with HMAC)        │
│  - Transactional Resend Emails (Domain: elvariscapital.in)             │
│  - Standalone VPS Monitor Dashboard (/vps-dashboard.html)              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    │ HTTPS Webhook (POST /api/internal/signals)
                                    │ HMAC SHA-256 Signature Verified
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        CLOUD VPS (vps/ Folder)                         │
│                                                                        │
│  - Runs 24x7 autonomously on Linux (Ubuntu/Debian) or Windows VPS     │
│  - Pine Script Engine (@mathieuc/tradingview live candle evaluator)    │
│  - Python MT5 Engine (MetaTrader 5 live ticks & terminal automation)   │
│  - Automated HMAC SHA-256 Signer & HTTP Dispatcher                     │
│  - Managed via PM2 (ecosystem.config.js), Systemd, or Docker           │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       MONGODB ATLAS CLUSTER                            │
│                                                                        │
│  - 3-Node Replica Set: ac-ozckia6-shard-00-00.syikpx1.mongodb.net      │
│  - Collections: users, strategies, trials, signals, auditEvents        │
│  - Unique Idempotency Indexes on sourceEventId and email               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Part 1: Vercel Deployment (Next.js Marketplace)

Deploying the root Next.js repository to **Vercel**:

### Step 1: Connect Repository to Vercel
1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **Add New** -> **Project** and select your `StratMarket` repository.
3. Framework Preset: **Next.js** (automatically detected).
4. Root Directory: `./` (leave default).

### Step 2: Configure Environment Variables in Vercel
Under the **Environment Variables** tab, add the following variables:

| Variable | Recommended Production Value | Description |
| :--- | :--- | :--- |
| `MONGODB_URI` | `mongodb://sameetpisal_db_user:0op4uoeZpcVTooaP@ac-ozckia6-shard-00-00.syikpx1.mongodb.net:27017,ac-ozckia6-shard-00-01.syikpx1.mongodb.net:27017,ac-ozckia6-shard-00-02.syikpx1.mongodb.net:27017/stratmarket?ssl=true&replicaSet=atlas-11286g-shard-0&authSource=admin` | Live MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | `stratmarket` | Database name |
| `JWT_SECRET` | `stratmarket-dev-jwt-super-secret-key-2026-secure` | 32+ character HMAC secret for user sessions |
| `VPS_SHARED_SECRET` | `stratmarket-dev-vps-hmac-shared-secret-key-2026` | 32+ character secret shared with VPS dispatcher |
| `EMAIL_PROVIDER` | `resend` | Enables Resend email dispatch |
| `RESEND_API_KEY` | `re_... (Configured from Resend Dashboard)` | Resend API key |
| `EMAIL_FROM` | `StratMarket Alerts <alerts@elvariscapital.in>` | Verified domain sender |
| `SIGNAL_ALERT_RECIPIENT` | `sameetpisal@gmail.com` | Operator/Admin email for real-time signal alerts |
| `SESSION_COOKIE_NAME` | `stratmarket_session` | Session cookie identifier |
| `SESSION_MAX_AGE_SECONDS` | `604800` | Session lifetime (7 days) |

### Step 3: Deploy
- Click **Deploy**.
- Next.js will build with zero errors (`npm run build` generates 72 optimized static/dynamic routes).

---

## 3. Part 2: VPS Deployment (`vps/` Folder)

The `vps/` folder is designed to run 24x7 on any cloud VPS (Ubuntu 22.04 / 24.04 LTS or Windows Server).

### Prerequisites on VPS:
```bash
# Ubuntu / Debian:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs python3 python3-pip
sudo npm install -g pm2 tsx
```

### Setup Steps on VPS:
1. Copy the `vps/` directory to `/opt/stratmarket-vps/` on your VPS.
2. Install dependencies:
   ```bash
   cd /opt/stratmarket-vps
   npm install
   pip3 install -r requirements.txt
   ```
3. Edit `vps/config.json` with your production Vercel URL:
   ```json
   {
     "apiEndpoint": "https://your-vercel-domain.vercel.app/api/internal/signals",
     "healthEndpoint": "https://your-vercel-domain.vercel.app/api/internal/health",
     "sharedSecret": "stratmarket-dev-vps-hmac-shared-secret-key-2026",
     "pollingIntervalMs": 15000
   }
   ```
4. Start 24x7 service using PM2:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```
5. Monitor live VPS logs:
   ```bash
   pm2 logs stratmarket-vps
   ```

### Alternatively with Docker:
```bash
cd vps
docker compose up -d --build
```

---

## 4. Part 3: Transactional Resend Email Integration

Emails are sent exclusively from the verified domain: **`elvariscapital.in`**.

### Verified Endpoints & Events:
1. **User Signup / Registration:**
   - Triggered at: `POST /api/auth/register`
   - Sender: `StratMarket <alerts@elvariscapital.in>`
   - Template: Responsive dark-mode HTML welcome letter, features summary, and link to strategy catalog.

2. **User Login / Security Notification:**
   - Triggered at: `POST /api/auth/login`
   - Sender: `StratMarket <alerts@elvariscapital.in>`
   - Template: Security alert containing exact timestamp (UTC), client IP address, and browser User-Agent.

3. **Real-Time Trade Signal Generated:**
   - Triggered at: `POST /api/internal/signals` (dispatched by 24x7 VPS)
   - Sender: `StratMarket Alerts <alerts@elvariscapital.in>`
   - Template: Real-time trade badge (BUY/LONG or SELL/SHORT), pair name (e.g. XAUUSD), timeframe, Entry Price, Take Profit (TP), Stop Loss (SL), and strategy performance link.

---

## 5. Single-Page VPS Control Center

A unified standalone HTML dashboard is accessible at:
- **Local:** [http://localhost:3000/vps-dashboard.html](http://localhost:3000/vps-dashboard.html)
- **Production:** `https://your-domain.vercel.app/vps-dashboard.html`
- **File location:** `vps/dashboard.html` and `public/vps-dashboard.html`

Features:
- Live CPU & RAM gauges
- Pine Script 4-Engine cluster status
- Python MT5 2-Engine cluster status
- One-click Test Signal Dispatcher with HMAC SHA-256 calculation
- Filterable live telemetry terminal logs
