const dayjs = require('dayjs');
const APIUsage = require('../models/APIUsage');
const Video = require('../models/Video');
const Content = require('../models/Content');
const env = require('../config/env');

async function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function checkLimits() {
  const since = await startOfToday();
  const [videos, aiReqs, videoGens] = await Promise.all([
    Content.countDocuments({ createdAt: { $gte: since } }),
    APIUsage.countDocuments({ provider: 'gemini', createdAt: { $gte: since } }),
    APIUsage.countDocuments({ provider: 'gemini', operation: 'video-submit', createdAt: { $gte: since } }),
  ]);
  return {
    videos, aiReqs, videoGens,
    videosAllowed: videos < env.MAX_VIDEOS_PER_DAY,
    videoGenAllowed: videoGens < env.MAX_VIDEO_GENERATIONS_PER_DAY,
    aiAllowed: aiReqs < env.MAX_AI_REQUESTS_PER_DAY,
  };
}

async function isDuplicateTopic(normalizedTopic) {
  if (!normalizedTopic) return false;
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const found = await Content.findOne({ normalizedTopic, createdAt: { $gte: weekAgo } }).select('_id');
  return Boolean(found);
}

module.exports = { checkLimits, isDuplicateTopic };
