const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { execFile } = require('child_process');
const env = require('../config/env');
const { ok, fail } = require('../utils/apiResponse');
const { isConfigured: geminiConfigured } = require('../services/ai/geminiClient');
const { generateScript } = require('../services/ai/aiService');
const { getVideoProvider } = require('../services/video/videoProvider');
const { publishVideo } = require('../services/facebook/publishingService');
const { getContentSettings } = require('../services/trends/trendService');
const { decryptToken } = require('../utils/encryption');
const FacebookPage = require('../models/FacebookPage');

function ffmpegAvailable() {
  return new Promise((resolve) => {
    const { ffmpegBin } = require('../services/storage/localStorage');
    execFile(ffmpegBin(), ['-version'], { timeout: 8000 }, (err) => resolve(!err));
  });
}

function tempDir() {
  const dir = env.STORAGE_DIR === '../storage'
    ? path.resolve(__dirname, '..', '..', '..', 'storage', 'temp')
    : path.join(path.resolve(env.STORAGE_DIR), 'temp');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// GET /api/test/status — quick health of every integration (all real checks)
async function status(req, res, next) {
  try {
    const pages = await FacebookPage.find();
    const ffmpeg = await ffmpegAvailable();
    const { getActiveModel } = require('../services/ai/geminiClient');
    const { isConfigured: hfConfigured, getActiveHFModel } = require('../services/video/hfVideoService');
    return ok(res, {
      backend: 'up',
      mode: env.USE_QUEUE ? 'queue (BullMQ + worker process)' : 'inline (all in backend, no worker needed)',
      gemini: { configured: geminiConfigured(), model: env.GEMINI_MODEL, activeModel: getActiveModel(), videoModel: env.GEMINI_VIDEO_MODEL, videoProvider: String(process.env.VIDEO_PROVIDER || 'auto') },
      huggingface: { configured: hfConfigured(), model: process.env.HF_VIDEO_MODEL || 'Lightricks/LTX-Video-0.9.8-13B-distilled', activeModel: getActiveHFModel() },
      facebook: { configured: Boolean(env.META_APP_ID), pages: pages.map((p) => p.toSafeJSON()) },
      ffmpeg,
      timezone: env.TIMEZONE,
    });
  } catch (e) { return next(e); }
}

// POST /api/test/script — real Gemini script generation with a sample topic
async function testScript(req, res, next) {
  try {
    const topic = req.body?.topic || 'How AI is changing mobile photography';
    const cs = await getContentSettings();
    const result = await generateScript({
      topic, trendInfo: {}, niche: cs.primaryNiche, audience: cs.targetAudience,
      language: cs.language || 'Bengali', tone: cs.tone || 'Informative', durationSec: 30,
    });
    return ok(res, { result });
  } catch (e) { return next(e); }
}

// POST /api/test/photo (multipart: file + pageId + caption) — real photo post to the Page
async function testPhoto(req, res, next) {
  try {
    const { pageId, caption } = req.body;
    if (!pageId) return fail(res, 'pageId required', 'VALIDATION_ERROR', 422);
    if (!req.file) return fail(res, 'Image file required (field name: file)', 'VALIDATION_ERROR', 422);
    const page = await FacebookPage.findOne({ pageId }).select('+accessTokenEnc');
    if (!page) return fail(res, 'Page not connected', 'PAGE_NOT_CONNECTED', 400);
    const token = decryptToken(page.accessTokenEnc);
    const form = new FormData();
    form.append('access_token', token);
    form.append('caption', caption || 'Test photo from AI Content Autopilot');
    form.append('source', req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });
    const { data } = await axios.post(
      `https://graph.facebook.com/${env.META_GRAPH_VERSION}/${pageId}/photos`,
      form, { headers: form.getHeaders(), timeout: 120000, maxBodyLength: Infinity }
    );
    return ok(res, { facebookPostId: data.post_id || data.id });
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    return fail(res, `Facebook photo publish failed: ${msg}`, 'FB_PUBLISH_ERROR', 502);
  }
}

// POST /api/test/video (multipart: file + pageId + caption) — real video upload to the Page
async function testVideo(req, res, next) {
  try {
    const { pageId, caption } = req.body;
    if (!pageId) return fail(res, 'pageId required', 'VALIDATION_ERROR', 422);
    if (!req.file) return fail(res, 'Video file required (field name: file, mp4)', 'VALIDATION_ERROR', 422);
    const dest = path.join(tempDir(), `test_${Date.now()}_${String(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_')}`);
    fs.writeFileSync(dest, req.file.buffer);
    try {
      const result = await publishVideo({ pageId, videoPath: dest, caption: caption || 'Test video from AI Content Autopilot' });
      return ok(res, result);
    } finally {
      try { fs.unlinkSync(dest); } catch {}
    }
  } catch (e) { return next(e); }
}

// POST /api/test/video-submit — submit a real Veo generation (returns fast with operationId)
async function testVideoSubmit(req, res, next) {
  try {
    const provider = getVideoProvider();
    const { prompt, aspectRatio, durationSec } = req.body;
    const r = await provider.submit({
      prompt: prompt || 'A robot hand holding a glowing smartphone, cinematic, vertical video',
      aspectRatio: aspectRatio || '9:16',
      durationSec: Math.min(Number(durationSec) || 8, 60),
    });
    return ok(res, {
      operationId: r.operationId,
      note: 'Generation takes minutes. Poll GET /api/test/video-status?operationId=... from the Test Lab page — never hold one HTTP request open.',
    });
  } catch (e) { return next(e); }
}

// GET /api/test/video-status?operationId= — single poll, no waiting
async function testVideoStatus(req, res, next) {
  try {
    const { operationId } = req.query;
    if (!operationId) return fail(res, 'operationId required', 'VALIDATION_ERROR', 422);
    const provider = getVideoProvider();
    const r = await provider.poll(operationId);
    return ok(res, { state: r.state, videoUri: r.videoUri || null, error: r.error || null });
  } catch (e) { return next(e); }
}

// GET /api/test/gemini-models — what this key can actually use (drives auto-switch)
async function geminiModels(req, res, next) {
  try {
    const { listModels, getActiveModel, chooseCandidates } = require('../services/ai/geminiClient');
    const models = await listModels();
    const textModels = models.filter((m) => m.methods.includes('generateContent')).map((m) => m.name);
    return ok(res, { activeModel: getActiveModel(), generateContentModels: textModels, all: models });
  } catch (e) { return next(e); }
}

// POST /api/test/slideshow — renders the FREE local fallback video (no Veo, no billing)
async function testSlideshow(req, res, next) {
  try {
    const { renderSlideshow } = require('../services/video/slideshowService');
    const { title, script, aspectRatio } = req.body;
    const dims = aspectRatio === '16:9' ? [1280, 720] : aspectRatio === '1:1' ? [1080, 1080] : [1080, 1920];
    const { videoPath, duration } = await renderSlideshow({
      contentId: 'test', title: title || 'Test video',
      script: script || title || 'Hello from AI Content Autopilot',
      width: dims[0], height: dims[1], totalSec: 15,
    });
    return ok(res, { file: path.basename(videoPath), duration, url: `/storage/generated/${path.basename(videoPath)}` });
  } catch (e) { return next(e); }
}

// POST /api/test/hf-video — real Hugging Face video generation (free credits, takes minutes)
async function testHFVideo(req, res, next) {
  try {
    const { generateHFVideo } = require('../services/video/hfVideoService');
    const { prompt } = req.body;
    if (!prompt) return fail(res, 'prompt required', 'VALIDATION_ERROR', 422);
    const dest = path.join(tempDir(), `hf_test_${Date.now()}.mp4`);
    const { model } = await generateHFVideo({ prompt, destPath: dest });
    // move into generated/ so it is servable + reusable
    const final = path.join(path.dirname(tempDir()), 'generated', `hf_test_${Date.now()}.mp4`);
    fs.renameSync(dest, final);
    return ok(res, { file: path.basename(final), model, url: `/storage/generated/${path.basename(final)}` });
  } catch (e) {
    if (['HF_NOT_CONFIGURED', 'HF_AUTH_ERROR', 'HF_BAD_REQUEST'].includes(e.code)) return fail(res, e.message, e.code, e.status || 400);
    return next(e);
  }
}

// GET /api/test/hf-video-models — which text-to-video models are servable right now
async function hfVideoModels(req, res, next) {
  try {
    const { listVideoModels, getActiveHFModel } = require('../services/video/hfVideoService');
    const models = await listVideoModels();
    return ok(res, { activeModel: getActiveHFModel(), models });
  } catch (e) { return next(e); }
}

module.exports = { status, geminiModels, hfVideoModels, testScript, testPhoto, testVideo, testVideoSubmit, testVideoStatus, testSlideshow, testHFVideo };
