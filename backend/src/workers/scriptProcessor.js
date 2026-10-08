const Content = require('../models/Content');
const ContentVersion = require('../models/ContentVersion');
const { generateScript } = require('../services/ai/aiService');
const { getContentSettings } = require('../services/trends/trendService');
const { topicHash, normalizeTopic } = require('../utils/helpers');
const logger = require('../utils/logger');

async function saveVersion(contentId, version, field, snapshot, note = '') {
  await ContentVersion.create({ contentId, version, field, snapshot, note });
}

async function processScript({ contentId }) {
  const content = await Content.findById(contentId);
  if (!content) throw new Error('Content not found');
  const settings = await getContentSettings();
  content.status = 'GENERATING';
  await content.save();
  logger.info(`[INFO] Script generation started for ${contentId}`);
  const result = await generateScript({
    topic: content.topic, trendInfo: { keywords: content.keywords },
    niche: settings.primaryNiche, audience: settings.targetAudience,
    language: content.language || settings.language, tone: content.tone || settings.tone,
    durationSec: content.durationSec,
  });
  await saveVersion(contentId, content.version, 'script', content.toObject(), 'before script regen');
  Object.assign(content, {
    title: result.title, hook: result.hook, script: result.script, cta: result.cta,
    visualScenes: result.visualScenes, keywords: result.keywords, hashtags: result.hashtags,
    thumbnailText: result.thumbnailText, caption: result.caption, videoPrompt: result.videoPrompt,
    seoReasoning: result.seoReasoning, status: 'GENERATING', version: content.version + 1, lastError: '',
  });
  await content.save();
  logger.info('[INFO] Script generation completed');
  return { contentId: String(content._id) };
}

module.exports = { processScript };
