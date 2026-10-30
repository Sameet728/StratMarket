// Elvaris Capital — Unified 24x7 VPS Supervisor Runner
// Runs both Pine Script and Python MT5 strategy engines continuously

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { VpsSignalDispatcher } from "./dispatcher";
import { PineStrategyRunner } from "./pine_runner/pine_evaluator";

const configPath = path.resolve(__dirname, "./config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const API_ENDPOINT = process.env.VPS_API_ENDPOINT || config.apiEndpoint || "http://localhost:3000/api/internal/signals";
const SHARED_SECRET = process.env.VPS_SHARED_SECRET || config.sharedSecret || "stratmarket-dev-vps-hmac-shared-secret-key-2026";
const POLLING_INTERVAL_MS = config.pollingIntervalMs || 15000;

console.log("================================================================================");
console.log("  ELVARIS CAPITAL — STRATMARKET 24x7 VPS STRATEGY RUNNER SERVICE");
console.log("================================================================================");
console.log(`[VPS Supervisor] Target API Endpoint: ${API_ENDPOINT}`);
console.log(`[VPS Supervisor] Polling Loop: every ${POLLING_INTERVAL_MS / 1000} seconds`);

const dispatcher = new VpsSignalDispatcher(API_ENDPOINT, SHARED_SECRET);

// 1. Initialize Pine Script Evaluator (Grandmaster, Apex, Strict 1:2 R:R, Elite)
const pineRunner = new PineStrategyRunner(dispatcher);

// 2. Start Pine Runner
pineRunner.start(POLLING_INTERVAL_MS);

// 3. Start Python MT5 Execution Runner
const pythonScriptPath = path.resolve(__dirname, "./python_runner/mt5_runner.py");
let pythonProcess: any = null;

function startPythonRunner() {
  console.log(`[VPS Supervisor] Launching Python MT5 runner (${pythonScriptPath})...`);
  pythonProcess = spawn("python", [pythonScriptPath], {
    stdio: "inherit",
    env: {
      ...process.env,
      VPS_API_ENDPOINT: API_ENDPOINT,
      VPS_SHARED_SECRET: SHARED_SECRET,
    },
  });

  pythonProcess.on("exit", (code: number) => {
    console.warn(`[VPS Supervisor] Python runner exited with code ${code}. Restarting in 5s...`);
    setTimeout(startPythonRunner, 5000);
  });

  pythonProcess.on("error", (err: any) => {
    console.warn(`[VPS Supervisor] Python launcher warning (Python might not be in PATH):`, err.message);
  });
}

startPythonRunner();

// Graceful shutdown handling
process.on("SIGINT", () => {
  console.log("\n[VPS Supervisor] Shutting down runners gracefully...");
  pineRunner.stop();
  if (pythonProcess) {
    pythonProcess.kill();
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[VPS Supervisor] Received SIGTERM, exiting...");
  pineRunner.stop();
  if (pythonProcess) {
    pythonProcess.kill();
  }
  process.exit(0);
});
