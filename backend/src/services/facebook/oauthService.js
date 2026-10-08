const axios = require('axios');
const crypto = require('crypto');
const env = require('../../config/env');
const logger = require('../../utils/logger');

function graphBase() {
  return `https://graph.facebook.com/${env.META_GRAPH_VERSION}`;
}

function isConfigured() {
  return Boolean(env.META_APP_ID && env.META_APP_SECRET && env.META_REDIRECT_URI);
}

function loginUrl(state) {
  if (!isConfigured()) throw Object.assign(new Error('Facebook login not configured'), { status: 503, code: 'FB_NOT_CONFIGURED' });
  const params = new URLSearchParams({
    client_id: env.META_APP_ID, redirect_uri: env.META_REDIRECT_URI,
    scope: env.META_SCOPES, response_type: 'code', state,
    // Re-ask for permissions if the user unticked them last time —
    // without pages_show_list, /me/accounts returns an empty list.
    auth_type: 'rerequest',
  });
  return `https://www.facebook.com/${env.META_GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

async function exchangeCode(code) {
  const { data } = await axios.get(`${graphBase()}/oauth/access_token`, {
    params: { client_id: env.META_APP_ID, client_secret: env.META_APP_SECRET, redirect_uri: env.META_REDIRECT_URI, code },
    timeout: 30000,
  });
  return data; // { access_token, token_type, expires_in }
}

async function getLongLivedToken(shortLived) {
  const { data } = await axios.get(`${graphBase()}/oauth/access_token`, {
    params: { grant_type: 'fb_exchange_token', client_id: env.META_APP_ID, client_secret: env.META_APP_SECRET, fb_exchange_token: shortLived },
    timeout: 30000,
  });
  return data;
}

async function getPages(userToken) {
  const { data } = await axios.get(`${graphBase()}/me/accounts`, { params: { access_token: userToken, fields: 'id,name,category,access_token' }, timeout: 30000 });
  return data?.data || [];
}

function newState() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = { isConfigured, loginUrl, exchangeCode, getLongLivedToken, getPages, newState };
