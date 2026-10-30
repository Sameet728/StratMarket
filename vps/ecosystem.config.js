module.exports = {
  apps: [
    {
      name: "stratmarket-vps-supervisor",
      script: "runner.ts",
      interpreter: "/usr/bin/tsx",
      cwd: "/opt/stratmarket/vps",
      watch: false,
      autorestart: true,
      max_restarts: 50,
      restart_delay: 4000,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        VPS_API_ENDPOINT: "https://strat-market-chi.vercel.app/api/internal/signals",
        VPS_SHARED_SECRET: "stratmarket-dev-vps-hmac-shared-secret-key-2026",
      },
    },
    {
      name: "stratmarket-dashboard",
      script: "server.py",
      interpreter: "/usr/bin/python3",
      cwd: "/opt/stratmarket/vps",
      watch: false,
      autorestart: true,
      max_restarts: 50,
      restart_delay: 3000,
      max_memory_restart: "150M",
      env: {
        PORT: "8080",
        VPS_API_ENDPOINT: "https://strat-market-chi.vercel.app/api/internal/signals",
        VPS_SHARED_SECRET: "stratmarket-dev-vps-hmac-shared-secret-key-2026",
      },
    },
  ],
};
