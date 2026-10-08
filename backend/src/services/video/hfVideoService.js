const axios = require('axios');
const fs = require('fs');
const { InferenceClient } = require('@huggingface/inference');
const logger = require('../../utils/logger');
const APIUsage = require('../../models/APIUsage');

// Hugging Face Inference Providers — text-to-video with automatic
// model + provider switching (provider="auto" fails over across
// hf-inference, fal-ai, replicate, …). Free HF accounts get monthly
// credits, so cheap/fast models genuinely run without billing — unlike Veo.
const DEFAULT_MODELS = [
  'Lightricks/LTX-Video-0.9.8-13B-distilled',
  'Wan-AI/Wan2.1-T2V-1.3B',
  'tencent/HunyuanVideo',
];

let lastWorkingModel = null;
let discoveryCache = { at: 0, models: null };

function hfKey() {
  return process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY || '';
}

function isConfigured() {
  return Boolean(hfKey());
}

function preferenceList() {
  const fromEnv = String(process.env.HF_VIDEO_MODELS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return [...new Set([process.env.HF_VIDEO_MODEL, ...fromEnv].filter(Boolean))];
}

// Public Hub API (no auth): which text-to-video models are served right now.
async function listVideoModels() {
  if (discoveryCache.models && Date.now() - discoveryCache.at < 3600000) return discoveryCache.models;
  const { data } = await axios.get('https://huggingface.co/api/models', {
    params: { pipeline_tag: 'text-to-video', inference_provider: 'all', sort: 'trending_score', direction: -1, limit: 50 },
    timeout: 30000,
  });
  const models = (Array.isArray(data) ? data : []).map((m) => ({
    id: m.id,
    providers: Object.keys(m.inferenceProviderMapping || {}),
  }));
  discoveryCache = { at: Date.now(), models };
  return models;
}

// Pure function (unit-tested): preference order ∩ currently-served models,
// plus other served models as last-resort spares.
function chooseHFModels(preference, available) {
  const pref = [...new Set([...(preference || []).filter(Boolean), ...DEFAULT_MODELS])];
  if (!available || available.length === 0) return pref;
  const served = new Set(available.map((m) => m.id));
  const matched = pref.filter((p) => served.has(p));
  const spares = available.map((m) => m.id).filter((id) => !matched.includes(id)).slice(0, 5);
  const out = [...matched, ...spares];
  return out.length ? out : pref;
}

function normalizeError(e) {
  const status = e.statusCode ?? e.status ?? e.response?.status ?? e.cause?.response?.status ?? 0;
  const msg = e.response?.data?.error || e.error || e.message || 'Hugging Face request failed';
  return { status, msg: String(msg) };
}

// Auth / bad-request / out-of-credits: switching models cannot help — fail fast.
function isSwitchable({ status, msg }) {
  if ([400, 401, 402, 403].includes(status)) return false;
  const m = String(msg).toLowerCase();
  return status === 404 || status === 429 || status === 503 || status === 504 || status >= 500 || status === 0
    || /not.?supported|not.?found|no.?provider|unsupported|overload|rate.?limit|quota|unavailable|timeout|timed out|too many|busy/i.test(m);
}

async function track({ model, success, latencyMs, error = '' }) {
  try {
    await APIUsage.create({ provider: 'huggingface', model, operation: 'video-generate', success, latencyMs, error: String(error).slice(0, 500) });
  } catch { /* never break main flow */ }
}

async function generateHFVideo({ prompt, model, destPath, timeoutMs = 600000 }) {
  const key = hfKey();
  if (!key) {
    throw Object.assign(new Error('Hugging Face API not configured. Set HF_API_KEY (or HUGGINGFACE_API_KEY).'), { code: 'HF_NOT_CONFIGURED', status: 503 });
  }
  const client = new InferenceClient(key);
  if (typeof client.textToVideo !== 'function') {
    throw Object.assign(new Error('Installed @huggingface/inference SDK has no textToVideo support — run npm install to upgrade.'), { code: 'HF_SDK_ERROR', status: 500 });
  }
  let available = [];
  try {
    available = await listVideoModels();
  } catch (e) {
    logger.error(`[ERROR] HF model discovery failed, using configured list: ${e.message}`);
  }
  const pref = preferenceList();
  let candidates = chooseHFModels(pref.length ? pref : DEFAULT_MODELS, available);
  if (lastWorkingModel && candidates.includes(lastWorkingModel)) {
    candidates = [lastWorkingModel, ...candidates.filter((m) => m !== lastWorkingModel)];
  }
  let lastErr = null;
  for (const mid of candidates) {
    const started = Date.now();
    try {
      const blob = await client.textToVideo(
        { provider: 'auto', model: mid, inputs: prompt },
        { signal: AbortSignal.timeout(timeoutMs) }
      );
      const buf = Buffer.from(await blob.arrayBuffer());
      if (buf.length < 1024) throw Object.assign(new Error('Hugging Face returned an empty video'), { status: 502 });
      fs.writeFileSync(destPath, buf);
      lastWorkingModel = mid;
      await track({ model: mid, success: true, latencyMs: Date.now() - started });
      logger.info(`[INFO] Hugging Face video generated via ${mid} (${(buf.length / 1024).toFixed(0)} KB): ${destPath}`);
      return { videoPath: destPath, model: mid };
    } catch (raw) {
      const { status, msg } = normalizeError(raw);
      lastErr = Object.assign(new Error(msg), { status: status || 502 });
      await track({ model: mid, success: false, latencyMs: Date.now() - started, error: msg });
      if (!isSwitchable({ status, msg })) {
        lastErr.code = status === 402 ? 'HF_NO_CREDITS' : status === 401 || status === 403 ? 'HF_AUTH_ERROR' : 'HF_BAD_REQUEST';
        throw lastErr;
      }
      lastErr.code = 'HF_PROVIDER_ERROR';
      logger.error(`[ERROR] HF model ${mid} failed (${msg}). Trying next model…`);
    }
  }
  throw lastErr || new Error('No usable Hugging Face video model found.');
}

function getActiveHFModel() {
  return lastWorkingModel;
}

module.exports = { generateHFVideo, listVideoModels, chooseHFModels, isConfigured, hfKey, getActiveHFModel };
