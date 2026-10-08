const TrendTopic = require('../../models/TrendTopic');
const { ContentSettings } = require('../../models/Settings');
const { GoogleNewsProvider, RssProvider, scoreTopic } = require('./providers');
const { normalizeTopic, topicHash } = require('../../utils/helpers');
const { analyseTopic } = require('../ai/aiService');
const logger = require('../../utils/logger');

async function getContentSettings() {
  let s = await ContentSettings.findOne({ key: 'default' });
  if (!s) s = await ContentSettings.create({});
  return s;
}

async function collectTrends({ limit = 25 } = {}) {
  const settings = await getContentSettings();
  const providers = [new GoogleNewsProvider(settings.primaryNiche)];
  const feeds = [
    { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', category: 'technology' },
    { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'technology' },
  ];
  providers.push(new RssProvider(feeds));
  let all = [];
  for (const p of providers) {
    const items = await p.fetch(limit);
    all = all.concat(items);
  }
  // normalize + score + dedupe + excluded filter
  const excluded = (settings.excludedKeywords || []).map((k) => String(k).toLowerCase());
  const seen = new Set();
  const out = [];
  for (const raw of all) {
    const norm = normalizeTopic(raw.title);
    if (!norm || seen.has(norm)) continue;
    const lower = `${raw.title} ${raw.description}`.toLowerCase();
    if (excluded.some((e) => e && lower.includes(e))) continue;
    seen.add(norm);
    const scored = scoreTopic(raw, settings.keywords);
    out.push({ ...scored, normalizedTopic: norm, topicHash: topicHash(raw.title) });
  }
  // skip recently used (last 30 days same hash)
  const hashes = out.map((o) => o.topicHash);
  const recent = await TrendTopic.find({ topicHash: { $in: hashes }, used: true }).select('topicHash');
  const usedSet = new Set(recent.map((r) => r.topicHash));
  const fresh = out.filter((o) => !usedSet.has(o.topicHash));
  // upsert
  let saved = 0;
  for (const t of fresh.slice(0, limit)) {
    await TrendTopic.findOneAndUpdate({ topicHash: t.topicHash }, { $set: t }, { upsert: true, new: true });
    saved++;
  }
  logger.info(`[INFO] Trend research completed: ${saved} trends collected`);
  return saved;
}

async function analyseTrends({ limit = 25 } = {}) {
  const settings = await getContentSettings();
  const pending = await TrendTopic.find({ recommendation: 'PENDING' }).sort({ trendScore: -1 }).limit(limit);
  let done = 0;
  for (const t of pending) {
    const result = await analyseTopic({ title: t.title, description: t.description, source: t.source }, {
      niche: settings.primaryNiche, audience: settings.targetAudience, excluded: settings.excludedKeywords,
    });
    t.relevance = result.relevance; t.viralPotential = result.viralPotential; t.freshness = result.freshness;
    t.audienceInterest = result.audienceInterest; t.competition = result.competition;
    t.facebookSuitability = result.facebookSuitability; t.videoSuitability = result.videoSuitability;
    t.overallScore = result.overallScore; t.recommendation = result.recommendation;
    t.analyzedAt = new Date();
    await t.save();
    done++;
  }
  logger.info(`[INFO] Trend analysis completed: ${done} topics analysed`);
  return done;
}

async function selectTopTopics(count = 2) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  return TrendTopic.find({ used: { $ne: true }, recommendation: { $in: ['RECOMMENDED', 'TOP_PICK', 'CONSIDER'] }, createdAt: { $gte: thirtyDaysAgo } })
    .sort({ overallScore: -1, trendScore: -1 }).limit(count);
}

module.exports = { collectTrends, analyseTrends, selectTopTopics, getContentSettings };
