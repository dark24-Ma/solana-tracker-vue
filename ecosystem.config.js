module.exports = {
  apps: [
    {
      name: 'solana-tracker-frontend',
      script: 'npm',
      args: 'run serve-prod',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 6608,
        HOST: '0.0.0.0'
      }
    }
  ]
}; 