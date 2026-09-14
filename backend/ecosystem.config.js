module.exports = {
  apps: [
    {
      name: 'comrades360',
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
    },
    {
      name: 'comrades-whatsapp',
      script: 'whatsapp-worker.js',
      // Baileys uses memory for crypto operations - expose GC and limit heap
      node_args: '--max-old-space-size=150 --expose-gc',
      max_memory_restart: '220M',
      autorestart: true,
      max_restarts: 15,
      restart_delay: 5000,
      // Give it time to reconnect before PM2 considers it failed
      min_uptime: '30s',
      env: {
        NODE_ENV: 'production',
        WHATSAPP_WORKER_PORT: 5005
      }
    }
  ]
};
