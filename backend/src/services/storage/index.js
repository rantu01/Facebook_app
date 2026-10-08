// Storage abstraction: local today, S3-compatible later.
const { paths } = require('./localStorage');

function getStorage() {
  const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
  if (provider !== 'local') {
    throw Object.assign(new Error(`Storage provider "${provider}" not yet configured. Set STORAGE_PROVIDER=local or add S3 credentials.`), { status: 501, code: 'STORAGE_NOT_CONFIGURED' });
  }
  return {
    provider: 'local',
    paths: paths(),
    publicUrl(filePath) { return `/storage/${String(filePath).split('storage').pop().replace(/\\/g, '/')}`; },
  };
}

module.exports = { getStorage };
