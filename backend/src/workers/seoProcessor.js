const Content = require('../models/Content');
const { generateSEO, qualityCheck } = require('../services/ai/aiService');
const { getContentSettings } = require('../services/trends/trendService');
const { SEOSettings } = require('../models/Settings');
const logger = require('../utils/logger');

async function processSEO({ contentId }) {
  const content = await Content.findById(contentId);
  if (!content) throw new Error('Content not found');
  const cs = await getContentSettings();
  let seo = await SEOSettings.findOne({ key: 'default' });
  if (!seo) seo = await SEOSettings.create({});
  const res = await generateSEO({
    content: { title: content.title, script: content.script, caption: content.caption, keywords: content.keywords, hashtags: content.hashtags },
    niche: cs.primaryNiche,
    strategies: { keywordStrategy: seo.keywordStrategy, hashtagStrategy: seo.hashtagStrategy, ctaStrategy: seo.ctaStrategy },
  });
  content.title = res.title; content.caption = res.caption; content.keywords = res.keywords;
  content.hashtags = res.hashtags; content.cta = res.cta || content.cta;
  content.seoScore = res.seoScore; content.contentQualityScore = res.qualityScore;
  content.seoReasoning = res.reasoning;
  await content.save();
  logger.info(`[INFO] SEO optimization completed (score ${res.seoScore})`);
  return { contentId: String(content._id) };
}

async function processQuality({ contentId }) {
  const content = await Content.findById(contentId);
  if (!content) throw new Error('Content not found');
  const res = await qualityCheck({ content });
  content.qualityStatus = res.status;
  content.qualityNotes = res.notes;
  content.contentQualityScore = res.qualityScore;
  if (res.status === 'BLOCKED') content.status = 'BLOCKED';
  await content.save();
  logger.info(`[INFO] Quality check: ${res.status}`);
  return { contentId: String(content._id), status: res.status };
}

module.exports = { processSEO, processQuality };
