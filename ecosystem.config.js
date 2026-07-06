module.exports = {
  apps: [
    {
      name: 'netma-server',
      cwd: './server',
      script: 'node',
      args: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PORT: '3001',
        NODE_ENV: 'production',
        OPENCODE_SERVER_PASSWORD: 'netma-secret',
      },
      env_file: '.env',
      error_file: '../logs/netma-error.log',
      out_file: '../logs/netma-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_restarts: 10,
      restart_delay: 5000,
      kill_timeout: 10000,
      watch: false,
      merge_logs: true,
    },
  ],
};
