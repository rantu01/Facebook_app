module.exports = {
  apps: [
    { name: 'ai-content-backend', cwd: './backend', script: 'src/server.js', env: { NODE_ENV: 'production' } },
    { name: 'ai-content-frontend', cwd: './frontend', script: 'node_modules/.bin/next', args: 'start -p 3000', env: { NODE_ENV: 'production' } },
  ],
};
