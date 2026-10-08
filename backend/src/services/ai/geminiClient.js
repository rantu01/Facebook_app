const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const APIUsage = require('../../models/APIUsage');

// Auto-switching Gemini client:
// 1. Discovers which models the CURRENT key can actually use (models.list).
// 2. Tries them in preference order, switching on 404/429/5xx/overload.
// 3. Never loops on key/prompt problems (400/401/403) — those need human action.
let discoveryCache = { at: 0, models: null };
let lastWorkingModel = null;

function isConfigured() {
  return Boolean(env.GEMINI_API_KEY);
}

function preferenceList() {
  const fromEnv = String(env.GEMINI_MODELS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return [...new Set([env.GEMINI_MODEL, ...fromEnv].filter(Boolean))];
}

async function listModels() {
  if (!isConfigured()) {
    const err = new Error('Gemini API not configured. Set GEMINI_API_KEY.');
    err.code = 'AI_NOT_CONFIGURED';
    err.status = 503;
    throw err;
  }
  if (discoveryCache.models && Date.now() - discoveryCache.at < 3600000) return discoveryCache.models;
  const { data } = await axios.get('https://generativelanguage.googleapis.com/v1beta/models', {
    params: { key: env.GEMINI_API_KEY, pageSize: 100 },
    timeout: 30000,
  });
  const models = (data?.models || []).map((m) => ({
    name: String(m.name || '').replace(/^models\//, ''),
    methods: m.supportedGenerationMethods || [],
  }));
  discoveryCache = { at: Date.now(), models };
  return models;
}

// Pure function (unit-tested): preference order ∩ actually-capable models,
// plus other text-capable models as last-resort spares (no TTS/image/live).
function chooseCandidates(preference, available) {
  const pref = [...new Set((preference || []).filter(Boolean))];
  if (!available || available.length === 0) return pref;
  const textCapable = available.filter((m) => (m.methods || []).includes('generateContent'));
  const capable = new Set(textCapable.map((m) => m.name));
  const matched = pref.filter((p) => capable.has(p));
  const spares = textCapable
    .map((m) => m.name)
    .filter((n) => !matched.includes(n) && !/live|tts|image|transcribe|translate|deep-research|antigravity|embedding|aqa/i.test(n));
  const out = [...matched, ...spares].slice(0, 8);
  return out.length ? out : pref;
}

async function resolveCandidates() {
  let available = [];
  try {
    available = await listModels();
  } catch (e) {
    logger.error(`[ERROR] Gemini model discovery failed, using configured list: ${e.message}`);
  }
  let dbModel = null;
  try {
    const AISettings = require('../../models/AISettings');
    const s = await AISettings.findOne({ key: 'default' }).select('model').lean();
    if (s?.model) dbModel = s.model;
  } catch { /* settings optional */ }
  const pref = [...new Set([dbModel, ...preferenceList()].filter(Boolean))];
  let candidates = chooseCandidates(pref, available);
  if (lastWorkingModel && candidates.includes(lastWorkingModel)) {
    candidates = [lastWorkingModel, ...candidates.filter((m) => m !== lastWorkingModel)];
  }
  return candidates;
}

function isSwitchable(err) {
  const status = err.status || err.response?.status;
  // Key / prompt / region problems: switching models cannot help — fail fast with the real message.
  if (status === 400 || status === 401 || status === 403) return false;
  const msg = String(err.message || '').toLowerCase();
  return status === 404 || status === 408 || status === 429 || (status >= 500 && status < 600)
    || /not.?found|not.?available|unsupported|overload|rate.?limit|quota|unavailable|internal/i.test(msg);
}

async function callModel(model, { prompt, systemInstruction, jsonMode, temperature }) {
  const started = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
  const body = {
    system_instruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: temperature ?? env.GEMINI_TEMPERATURE,
      responseMimeType: jsonMode ? 'application/json' : 'text/plain',
    },
  };
  try {
    const { data } = await axios.post(url, body, { timeout: 90000 });
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    const tokens = data?.usageMetadata?.totalTokenCount || 0;
    await trackUsage({ model, operation: 'generateText', tokens, success: true, latencyMs: Date.now() - started });
    return { text, raw: data, tokens, model };
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    await trackUsage({ model, operation: 'generateText', success: false, latencyMs: Date.now() - started, error: String(msg).slice(0, 500) });
    const err = new Error(msg);
    err.status = e.response?.status || 502;
    err.code = 'GEMINI_ERROR';
    throw err;
  }
}

async function generateText({ prompt, systemInstruction = '', jsonMode = true, temperature }) {
  if (!isConfigured()) {
    const err = new Error('Gemini API not configured. Set GEMINI_API_KEY.');
    err.code = 'AI_NOT_CONFIGURED';
    err.status = 503;
    throw err;
  }
  const candidates = await resolveCandidates();
  if (!candidates.length) {
    throw Object.assign(new Error('No usable Gemini model found for this API key.'), { code: 'GEMINI_ERROR', status: 502 });
  }
  let lastErr = null;
  for (const model of candidates) {
    try {
      const out = await callModel(model, { prompt, systemInstruction, jsonMode, temperature });
      lastWorkingModel = model;
      return out;
    } catch (e) {
      lastErr = e;
      if (!isSwitchable(e)) throw e;
      logger.error(`[ERROR] Gemini model ${model} failed (${e.message}). Trying next model…`);
    }
  }
  throw lastErr;
}

function getActiveModel() {
  return lastWorkingModel;
}

async function trackUsage({ model, operation, tokens = 0, success = true, latencyMs = 0, error = '' }) {
  try {
    await APIUsage.create({ provider: 'gemini', model, operation, tokens, success, latencyMs, error: String(error).slice(0, 500) });
  } catch { /* never break main flow */ }
}

function extractJSON(text) {
  if (!text) throw new Error('Empty AI response');
  const tries = [text.trim()];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) tries.push(fenced[1].trim());
  const span = text.match(/\{[\s\S]*\}/);
  if (span) tries.push(span[0]);
  for (const t of tries) {
    try { return JSON.parse(t); } catch { /* next */ }
  }
  throw new Error('AI returned malformed JSON');
}

module.exports = { isConfigured, generateText, extractJSON, listModels, chooseCandidates, getActiveModel };
