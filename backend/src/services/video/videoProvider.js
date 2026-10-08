const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const APIUsage = require('../../models/APIUsage');
const Video = require('../../models/Video');

// Provider abstraction for Gemini/Veo-style long-running video generation.
class GeminiVeoProvider {
  constructor() {
    this.name = 'gemini-veo';
  }
  capabilities() {
    return { aspectRatios: ['9:16', '16:9', '1:1'], maxDurationSec: 60, resolutions: ['720x1280', '1080x1920'], pollingIntervalMs: 15000 };
  }
  get model() { return env.GEMINI_VIDEO_MODEL; }

  async submit({ prompt, aspectRatio = '9:16', durationSec = 8 }) {
    if (!env.GEMINI_API_KEY) {
      const err = new Error('Gemini API not configured. Set GEMINI_API_KEY.');
      err.code = 'AI_NOT_CONFIGURED'; err.status = 503;
      throw err;
    }
    // Real Veo endpoint via Gemini API (predictLongRunning). Operation may vary by model availability;
    // we implement against the documented generateVideos REST shape and poll the operation.
    const started = Date.now();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:predictLongRunning?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
      const { data } = await axios.post(url, {
        instances: [{ prompt }],
        parameters: { aspectRatio, durationSeconds: durationSec, sampleCount: 1 },
      }, { timeout: 60000 });
      await APIUsage.create({ provider: 'gemini', model: this.model, operation: 'video-submit', success: true, latencyMs: Date.now() - started });
      const operationId = data?.name || data?.operation?.name || data?.operations?.[0]?.name;
      if (!operationId) throw new Error('Video provider did not return an operation ID');
      return { operationId, raw: data };
    } catch (e) {
      const msg = e.response?.data?.error?.message || e.message;
      const status = e.response?.status || 0;
      await APIUsage.create({ provider: 'gemini', model: this.model, operation: 'video-submit', success: false, latencyMs: Date.now() - started, error: String(msg).slice(0, 500) });
      logger.error(`[ERROR] Video submit failed: ${msg}`);
      const err = new Error(msg);
      err.status = status || 502;
      // Free keys / unsupported models: let the caller fall back to the free local renderer
      // instead of failing the whole pipeline.
      err.code = (status === 404 || /not found|not supported|predictLongRunning/i.test(String(msg))) ? 'VIDEO_MODEL_UNSUPPORTED' : 'VIDEO_PROVIDER_ERROR';
      throw err;
    }
  }

  async poll(operationId) {
    const url = `https://generativelanguage.googleapis.com/v1beta/${encodeURIComponent(operationId)}?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
    const { data } = await axios.get(url, { timeout: 30000 });
    if (data?.done) {
      const err = data?.error;
      if (err) return { state: 'FAILED', error: err.message || 'Generation failed', raw: data };
      const uri = data?.response?.generatedSamples?.[0]?.video?.uri || data?.response?.videos?.[0]?.gcsUri || data?.response?.videos?.[0]?.uri;
      return { state: 'COMPLETED', videoUri: uri, raw: data };
    }
    return { state: 'PROCESSING', raw: data };
  }

  async downloadToFile(videoUri, destPath) {
    const fs = require('fs');
    const writer = fs.createWriteStream(destPath);
    const url = videoUri.includes('?') ? `${videoUri}&key=${encodeURIComponent(env.GEMINI_API_KEY)}` : videoUri;
    const res = await axios.get(url, { responseType: 'stream', timeout: 120000 });
    await new Promise((resolve, reject) => {
      res.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    return destPath;
  }
}

function getVideoProvider() {
  return new GeminiVeoProvider();
}

module.exports = { getVideoProvider, GeminiVeoProvider };
