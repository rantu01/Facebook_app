const fs = require('fs');
const path = require('path');
const Content = require('../models/Content');
const Video = require('../models/Video');
const { getVideoProvider } = require('../services/video/videoProvider');
const { paths } = require('../services/storage/localStorage');
const { sleep } = require('../utils/helpers');
const logger = require('../utils/logger');

const VIDEO_MODE = String(process.env.VIDEO_PROVIDER || 'auto').toLowerCase(); // auto | veo | hf | local

async function renderHFVideo(content, prompt) {
  const { generateHFVideo } = require('../services/video/hfVideoService');
  const dest = require('path').join(require('../services/storage/localStorage').paths().generated, `orig_${content._id}_${Date.now()}.mp4`);
  const { model } = await generateHFVideo({ prompt, destPath: dest });
  await Video.create({
    contentId: content._id, provider: `huggingface:${model}`, prompt, aspectRatio: content.aspectRatio,
    durationSec: content.durationSec, status: 'COMPLETED', originalPath: dest,
  });
  content.originalVideoPath = dest;
  await content.save();
  logger.info('[INFO] Hugging Face video ready — pipeline continues');
  return { contentId: String(content._id), videoPath: dest, provider: 'huggingface' };
}

async function renderLocalVideo(content) {
  const { renderSlideshow } = require('../services/video/slideshowService');
  const dims = content.aspectRatio === '16:9' ? [1280, 720] : content.aspectRatio === '1:1' ? [1080, 1080] : [1080, 1920];
  const { videoPath, duration } = await renderSlideshow({
    contentId: String(content._id), title: content.title || content.topic,
    script: `${content.hook || ''}\n${content.script || ''}\n${content.cta || ''}`,
    width: dims[0], height: dims[1], totalSec: Math.min(content.durationSec || 30, 60),
  });
  await Video.create({
    contentId: content._id, provider: 'local-slideshow', prompt: content.videoPrompt || '',
    aspectRatio: content.aspectRatio, durationSec: content.durationSec, status: 'COMPLETED',
    originalPath: videoPath, durationActual: duration,
  });
  content.originalVideoPath = videoPath;
  await content.save();
  logger.info('[INFO] Free local video ready (Veo unavailable on this key — pipeline continues)');
  return { contentId: String(content._id), videoPath, provider: 'local-slideshow' };
}

async function processVideo({ contentId, videoId }) {
  const content = await Content.findById(contentId);
  if (!content) throw new Error('Content not found');
  if (VIDEO_MODE === 'local') return renderLocalVideo(content);
  if (VIDEO_MODE === 'hf') {
    const prompt = content.videoPrompt || `${content.title}. ${content.script}`.slice(0, 1000);
    return renderHFVideo(content, prompt);
  }
  const provider = getVideoProvider();
  const caps = provider.capabilities();
  if (!caps.aspectRatios.includes(content.aspectRatio)) {
    throw Object.assign(new Error(`Aspect ratio ${content.aspectRatio} not supported by provider`), { status: 400, code: 'VALIDATION_ERROR' });
  }
  const prompt = content.videoPrompt || `${content.title}. ${content.script}`.slice(0, 1000);
  logger.info('[INFO] Video generation submitted');
  let operationId;
  try {
    ({ operationId } = await provider.submit({ prompt, aspectRatio: content.aspectRatio, durationSec: Math.min(content.durationSec || 8, caps.maxDurationSec) }));
  } catch (e) {
    // Free keys can't reach Veo — try Hugging Face (free credits), then local slideshow.
    if (e.code === 'VIDEO_MODEL_UNSUPPORTED') {
      try {
        return await renderHFVideo(content, prompt);
      } catch (hfErr) {
        if (hfErr.code === 'HF_NOT_CONFIGURED') {
          logger.error('[ERROR] No HF key either — using free local slideshow.');
          return renderLocalVideo(content);
        }
        logger.error(`[ERROR] Hugging Face failed (${hfErr.message}) — using free local slideshow.`);
        return renderLocalVideo(content);
      }
    }
    throw e;
  }
  const video = await Video.create({
    contentId: content._id, provider: provider.name, prompt, aspectRatio: content.aspectRatio,
    durationSec: content.durationSec, operationId, status: 'PROCESSING',
  });
  content.status = 'GENERATING';
  await content.save();

  // Poll (worker context — never blocks HTTP)
  for (let i = 0; i < 120; i++) {
    await sleep(provider.capabilities().pollingIntervalMs || 15000);
    const res = await provider.poll(operationId);
    if (res.state === 'COMPLETED') {
      const { generated } = paths();
      const dest = path.join(generated, `orig_${contentId}_${Date.now()}.mp4`);
      if (res.videoUri) await provider.downloadToFile(res.videoUri, dest);
      else throw new Error('Provider completed but returned no video URI');
      video.status = 'COMPLETED'; video.originalPath = dest;
      await video.save();
      content.originalVideoPath = dest;
      await content.save();
      logger.info('[INFO] Video generation completed');
      return { contentId: String(content._id), videoPath: dest };
    }
    if (res.state === 'FAILED') {
      video.status = 'FAILED'; video.error = res.error || 'failed';
      await video.save();
      content.status = 'FAILED'; content.lastError = video.error;
      await content.save();
      throw new Error(video.error);
    }
  }
  video.status = 'FAILED'; video.error = 'Polling timed out';
  await video.save();
  throw new Error('Video generation timed out');
}

module.exports = { processVideo };
