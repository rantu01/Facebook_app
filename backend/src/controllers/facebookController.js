const axios = require('axios');
const FacebookPage = require('../models/FacebookPage');
const { isConfigured, loginUrl, exchangeCode, getLongLivedToken, getPages, newState } = require('../services/facebook/oauthService');
const { encryptToken } = require('../utils/encryption');
const { ok, fail } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const env = require('../config/env');

// In-memory state store (use Redis in multi-instance prod; fine for single VPS)
const states = new Map();

async function status(req, res, next) {
  try {
    const pages = await FacebookPage.find();
    return ok(res, {
      configured: isConfigured(),
      pages: pages.map((p) => p.toSafeJSON()),
    });
  } catch (e) { return next(e); }
}

async function connect(req, res, next) {
  try {
    // Optional manual fallback: allow pasting a Page token explicitly (documented fallback)
    if (req.body?.pageId && req.body?.accessToken) {
      if (req.admin.role !== 'ADMIN') return fail(res, 'Admin only', 'FORBIDDEN', 403);
      const enc = encryptToken(req.body.accessToken);
      const page = await FacebookPage.findOneAndUpdate(
        { pageId: req.body.pageId },
        { $set: { pageName: req.body.pageName || req.body.pageId, accessTokenEnc: enc, status: 'CONNECTED', connectedBy: req.admin.id } },
        { upsert: true, new: true }
      );
      return ok(res, { page: page.toSafeJSON(), fallback: true });
    }
    const state = newState();
    states.set(state, { adminId: req.admin.id, createdAt: Date.now() });
    setTimeout(() => states.delete(state), 10 * 60 * 1000);
    return ok(res, { url: loginUrl(state), state });
  } catch (e) { return next(e); }
}

// Server-side OAuth callback (GET from Meta). Validates state, exchanges code.
// All failures redirect back to the dashboard with a structured ?error= code
// so the UI can explain what to do (instead of a raw text page).
function failRedirect(reason) {
  return `${env.FRONTEND_URL}/pages-fb?error=${encodeURIComponent(reason)}`;
}

async function callback(req, res, next) {
  try {
    // User pressed "Cancel" on the Meta dialog
    if (req.query.error) {
      return res.redirect(failRedirect('access_denied'));
    }
    const { code, state } = req.query;
    if (!code || !state || !states.has(String(state))) {
      return res.redirect(failRedirect('session_expired'));
    }
    states.delete(String(state));
    const short = await exchangeCode(code);
    let userToken = short.access_token;
    try {
      const long = await getLongLivedToken(userToken);
      if (long.access_token) userToken = long.access_token;
    } catch {}
    const pages = await getPages(userToken);
    if (!pages.length) {
      // Diagnose WHY: check which permissions Facebook actually granted.
      // Dev-mode apps only grant page permissions to accounts with an app role —
      // everyone else silently gets an empty page list.
      let granted = [];
      try {
        const { data } = await axios.get(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/me/permissions`, {
          params: { access_token: userToken }, timeout: 15000,
        });
        granted = (data?.data || []).filter((p) => p.status === 'granted').map((p) => p.permission);
      } catch {}
      logger.info(`[INFO] FB connect: 0 pages, granted scopes: ${granted.join(',') || 'none'}`);
      const hasPagePerms = granted.includes('pages_show_list') || granted.includes('pages_manage_posts');
      return res.redirect(failRedirect(hasPagePerms ? 'no_pages' : 'permissions_missing'));
    }
    // Store first page (or all pages the user manages)
    for (const p of pages) {
      const pageToken = p.access_token || userToken;
      await FacebookPage.findOneAndUpdate(
        { pageId: p.id },
        { $set: { pageName: p.name, category: p.category || '', accessTokenEnc: encryptToken(pageToken), status: 'CONNECTED', tokenExpiresAt: new Date(Date.now() + 50 * 86400000) } },
        { upsert: true, new: true }
      );
    }
    return res.redirect(`${env.FRONTEND_URL}/pages-fb?connected=1&count=${pages.length}`);
  } catch (e) {
    return res.redirect(failRedirect('connect_failed'));
  }
}

async function disconnect(req, res, next) {
  try {
    await FacebookPage.findByIdAndUpdate(req.params.id, { status: 'DISCONNECTED' });
    return ok(res, { disconnected: true });
  } catch (e) { return next(e); }
}

async function refresh(req, res, next) {
  try {
    const page = await FacebookPage.findById(req.params.id);
    if (!page) return fail(res, 'Not found', 'NOT_FOUND', 404);
    page.status = 'CONNECTED';
    await page.save();
    return ok(res, { page: page.toSafeJSON() });
  } catch (e) { return next(e); }
}

module.exports = { status, connect, callback, disconnect, refresh };
