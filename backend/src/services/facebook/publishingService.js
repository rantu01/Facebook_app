const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const { decryptToken } = require('../../utils/encryption');
const FacebookPage = require('../../models/FacebookPage');
const PublishedPost = require('../../models/PublishedPost');
const APIUsage = require('../../models/APIUsage');

function graphBase() { return `https://graph.facebook.com/${env.META_GRAPH_VERSION}`; }

async function getPageToken(pageDoc) {
  const full = await FacebookPage.findById(pageDoc._id || pageDoc.id).select('+accessTokenEnc');
  if (!full) throw Object.assign(new Error('Page not found'), { status: 404 });
  return decryptToken(full.accessTokenEnc);
}

// Official API: POST /{page-id}/videos with file upload. Do not mark published until FB confirms.
async function publishVideo({ pageId, videoPath, caption }) {
  const started = Date.now();
  const page = await FacebookPage.findOne({ pageId });
  if (!page) throw Object.assign(new Error('Facebook page not connected'), { status: 400, code: 'PAGE_NOT_CONNECTED' });
  const token = await getPageToken(page);
  if (!fs.existsSync(videoPath)) throw Object.assign(new Error(`Video file not found: ${videoPath}`), { status: 400 });

  const form = new FormData();
  form.append('access_token', token);
  form.append('description', caption || '');
  form.append('source', fs.createReadStream(videoPath));

  try {
    logger.info('[INFO] Facebook publish started');
    const { data } = await axios.post(`${graphBase()}/${pageId}/videos`, form, {
      headers: form.getHeaders(), timeout: 300000, maxBodyLength: Infinity, maxContentLength: Infinity,
    });
    // data: { id } (video id). Fetch permalink for post id.
    let permalink = '';
    try {
      const v = await axios.get(`${graphBase()}/${data.id}`, { params: { access_token: token, fields: 'permalink_url,post_id' }, timeout: 30000 });
      permalink = v.data?.permalink_url || '';
      var postId = v.data?.post_id || '';
    } catch { var postId = ''; }
    await APIUsage.create({ provider: 'facebook', model: 'graph-api', operation: 'publish-video', success: true, latencyMs: Date.now() - started });
    page.lastPublishedAt = new Date();
    await page.save();
    logger.info('[INFO] Facebook publish successful');
    return { facebookVideoId: data.id, facebookPostId: postId || data.id, permalink };
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    const code = e.response?.data?.error?.code;
    await APIUsage.create({ provider: 'facebook', model: 'graph-api', operation: 'publish-video', success: false, latencyMs: Date.now() - started, error: String(msg).slice(0, 500) });
    logger.error(`[ERROR] Facebook publish failed: ${msg}`);
    const err = new Error(msg);
    err.status = e.response?.status || 502;
    err.code = code === 190 ? 'FB_AUTH_ERROR' : 'FB_PUBLISH_ERROR';
    err.fbCode = code;
    throw err;
  }
}

async function getPublishStatus({ facebookVideoId, pageId }) {
  const page = await FacebookPage.findOne({ pageId });
  const token = await getPageToken(page);
  const { data } = await axios.get(`${graphBase()}/${facebookVideoId}`, {
    params: { access_token: token, fields: 'status,length,permalink_url' }, timeout: 30000,
  });
  return data;
}

module.exports = { publishVideo, getPublishStatus };
