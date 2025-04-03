module.exports = {
  apps: [
    {
      name: 'solana-tracker-frontend',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 6608
      }
    }
  ]
}; 