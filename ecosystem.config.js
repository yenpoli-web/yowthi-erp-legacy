module.exports = {
  apps: [
    {
      name: 'yowthi-backend',
      script: 'dist/src/main.js',
      cwd: '/var/www/yowthi-erp/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
