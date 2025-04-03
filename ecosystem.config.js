module.exports = {
  apps: [
    {
      name: 'solana-tracker-frontend',
      script: 'npx',
      args: 'serve -s dist -l 6608 --single --debug --listen tcp://0.0.0.0:6608',
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