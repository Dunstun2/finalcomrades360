module.exports = {
  apps: [{
    name: 'comrades-backend',
    script: 'server.js',
    node_args: '--max-old-space-size=256',
    max_memory_restart: '350M',
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
