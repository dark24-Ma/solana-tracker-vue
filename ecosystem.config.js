module.exports = {
  apps: [
    {
      name: 'solana-tracker-frontend',
      script: 'serve',
      args: '-s dist -l 6608',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PM2_SERVE_PATH: 'dist',
        PM2_SERVE_PORT: 6608,
        PM2_SERVE_SPA: 'true'
      }
    }
  ]
}; 