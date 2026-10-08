require('dotenv').config();

function required(name, fallback = undefined) {
  if (process.env[name] !== undefined && process.env[name] !== '') return process.env[name];
  return fallback;
}

const env = {
  NODE_ENV: required('NODE_ENV', 'development'),
  PORT: parseInt(required('PORT', '5000'), 10),
  TIMEZONE: required('APP_TIMEZONE', 'Asia/Dhaka'),
  FRONTEND_URL: required('FRONTEND_URL', 'http://localhost:3000'),
  MONGODB_URI: required('MONGODB_URI', 'mongodb://localhost:27017/autopilot'),
  JWT_SECRET: required('JWT_SECRET', 'dev-secret-change-me-min-32-chars-please'),
  JWT_EXPIRES_IN: required('JWT_EXPIRES_IN', '7d'),
  ADMIN_EMAIL: required('ADMIN_EMAIL', 'admin@example.com'),
  ADMIN_PASSWORD: required('ADMIN_PASSWORD', 'Admin123!'),
  TOKEN_ENCRYPTION_KEY: required('TOKEN_ENCRYPTION_KEY', 'dev-32-byte-encryption-key-12345678'),
  GEMINI_API_KEY: required('GEMINI_API_KEY', ''),
  GEMINI_MODEL: required('GEMINI_MODEL', 'gemini-3.8-flash'),
  GEMINI_MODELS: required('GEMINI_MODELS', 'gemini-3.8-flash,gemini-3.5-flash-lite,gemini-3.5-flash'),
  GEMINI_VIDEO_MODEL: required('GEMINI_VIDEO_MODEL', 'veo-3.0-generate-001'),
  VIDEO_PROVIDER: required('VIDEO_PROVIDER', 'auto'),
  GEMINI_TEMPERATURE: parseFloat(required('GEMINI_TEMPERATURE', '0.7')),
  META_APP_ID: required('META_APP_ID', ''),
  META_APP_SECRET: required('META_APP_SECRET', ''),
  META_REDIRECT_URI: required('META_REDIRECT_URI', 'http://localhost:5000/api/facebook/oauth/callback'),
  META_GRAPH_VERSION: required('META_GRAPH_VERSION', 'v21.0'),
  META_SCOPES: required('META_SCOPES', 'pages_manage_posts,pages_read_engagement,pages_show_list'),
  REDIS_URL: required('REDIS_URL', 'redis://localhost:6379'),
  QUEUE_PREFIX: required('QUEUE_PREFIX', 'autopilot'),
  USE_QUEUE: String(required('USE_QUEUE', 'false')).toLowerCase() === 'true',
  STORAGE_PROVIDER: required('STORAGE_PROVIDER', 'local'),
  STORAGE_DIR: required('STORAGE_DIR', '../storage'),
  STORAGE_BUCKET: required('STORAGE_BUCKET', ''),
  STORAGE_REGION: required('STORAGE_REGION', ''),
  STORAGE_ENDPOINT: required('STORAGE_ENDPOINT', ''),
  STORAGE_ACCESS_KEY: required('STORAGE_ACCESS_KEY', ''),
  STORAGE_SECRET_KEY: required('STORAGE_SECRET_KEY', ''),
  MAX_VIDEOS_PER_DAY: parseInt(required('MAX_VIDEOS_PER_DAY', '2'), 10),
  MAX_VIDEO_GENERATIONS_PER_DAY: parseInt(required('MAX_VIDEO_GENERATIONS_PER_DAY', '4'), 10),
  MAX_AI_REQUESTS_PER_DAY: parseInt(required('MAX_AI_REQUESTS_PER_DAY', '100'), 10),
  isProd: (required('NODE_ENV', 'development') === 'production'),
};

module.exports = env;
