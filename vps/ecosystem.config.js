module.exports = {
  apps: [
    {
      name: "stratmarket-vps-supervisor",
      script: "npx",
      args: "tsx vps/runner.ts",
      cwd: "./",
      watch: false,
      autorestart: true,
      max_restarts: 50,
      restart_delay: 4000,
      env: {
        NODE_ENV: "production",
        VPS_API_ENDPOINT: "https://stratmarket.elvariscapital.in/api/internal/signals",
        VPS_SHARED_SECRET: "stratmarket-dev-vps-hmac-shared-secret-key-2026",
      },
    },
  ],
};
