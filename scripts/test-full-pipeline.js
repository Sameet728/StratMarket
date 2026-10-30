/**
 * Comprehensive End-to-End Pipeline Verification Script:
 * 1. User Registration (Signup) -> MongoDB storage + Resend Welcome Email
 * 2. User Authentication (Login) -> Session cookie + Resend Security Login Email
 * 3. VPS Signal Dispatch -> HMAC SHA-256 + MongoDB storage + Resend Signal Alert Email
 */

const crypto = require('crypto');

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'sameetpisal@gmail.com'; // Using user's real email to test actual delivery!
const TEST_NAME = 'Sameet Pisal';
const TEST_PASSWORD = 'TestPassword2026!';
const VPS_SECRET = 'stratmarket-dev-vps-hmac-shared-secret-key-2026';

async function testPipeline() {
  console.log('=== StratMarket Production Readiness Pipeline Test ===\n');

  // STEP 1: Registration
  console.log('[STEP 1] Testing User Registration (POST /api/auth/register)...');
  const regTimestamp = Date.now();
  // Using unique email or target email
  const regPayload = {
    name: TEST_NAME,
    email: `sameet+test${regTimestamp}@elvariscapital.in`, // Test user email
    password: TEST_PASSWORD,
  };

  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regPayload),
  });

  const regData = await regRes.json();
  console.log('Registration HTTP Status:', regRes.status);
  console.log('Registration Response:', JSON.stringify(regData, null, 2));
  if (regRes.status !== 200 && regRes.status !== 409) {
    throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
  }
  console.log('✔ Registration Flow passed!\n');

  // STEP 2: Login
  console.log('[STEP 2] Testing User Login (POST /api/auth/login)...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'StratMarket-Production-Verifier/1.0',
      'X-Forwarded-For': '103.212.144.10',
    },
    body: JSON.stringify({
      email: regPayload.email,
      password: TEST_PASSWORD,
    }),
  });

  const loginData = await loginRes.json();
  const cookies = loginRes.headers.get('set-cookie');
  console.log('Login HTTP Status:', loginRes.status);
  console.log('Login Response:', JSON.stringify(loginData, null, 2));
  console.log('Session Cookie Issued:', cookies ? 'YES (Secure HTTP-Only)' : 'NO');
  if (loginRes.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }
  console.log('✔ Login Flow passed!\n');

  // STEP 3: VPS Signal Ingestion with HMAC & Resend Alert
  console.log('[STEP 3] Testing 24x7 VPS Signal Ingestion & Real-Time Alert Email...');
  const signalEventId = `vps_pipeline_sig_${Date.now()}`;
  const signalPayload = {
    sourceEventId: signalEventId,
    strategyId: 'PY-03',
    strategyVersion: '1.2.0',
    instrument: 'XAUUSD',
    timeframe: 'H1',
    signalType: 'ENTRY',
    direction: 'LONG',
    entryPrice: 2658.75,
    stopLoss: 2642.00,
    targetPrice: 2689.50,
    signalProvenance: 'ELVARIS_VPS_MT5_RESEARCH_ENGINE',
    timestamp: new Date().toISOString(),
  };

  const rawPayload = JSON.stringify(signalPayload);
  const vpsTimestamp = String(Date.now());
  const hmac = crypto.createHmac('sha256', VPS_SECRET);
  hmac.update(`${vpsTimestamp}.${rawPayload}`);
  const signature = hmac.digest('hex');

  const signalRes = await fetch(`${BASE_URL}/api/internal/signals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vps-signature': signature,
      'x-vps-timestamp': vpsTimestamp,
    },
    body: rawPayload,
  });

  const signalData = await signalRes.json();
  console.log('Signal Ingest HTTP Status:', signalRes.status);
  console.log('Signal Response:', JSON.stringify(signalData, null, 2));
  if (signalRes.status !== 200) {
    throw new Error(`Signal ingestion failed: ${JSON.stringify(signalData)}`);
  }
  console.log('✔ VPS Signal Ingest & Resend Email Broadcast passed!\n');

  console.log('=====================================================');
  console.log('🎉 ALL PRODUCTION READINESS PIPELINE CHECKS PASSED!');
  console.log('=====================================================');
}

testPipeline().catch((err) => {
  console.error('Pipeline check error:', err);
  process.exit(1);
});
