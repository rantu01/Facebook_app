const logger = require('../utils/logger');
const JobLog = require('../models/JobLog');

// Central dispatch: maps queue -> processor. Used by both HTTP inline fallback
// and the dedicated worker process (worker/src/index.js).
const processors = {
  'trend-research': () => require('../services/trends/trendService').collectTrends({}),
  'trend-analysis': () => require('../services/trends/trendService').analyseTrends({}),
};

async function runProcessorInline(queueName, payload, jobLogId) {
  const started = new Date();
  try {
    if (jobLogId) await JobLog.findByIdAndUpdate(jobLogId, { status: 'active', startedAt: started, attempts: 1 }).catch(() => {});
    const handler = getHandler(queueName);
    const result = await handler(payload);
    if (jobLogId) await JobLog.findByIdAndUpdate(jobLogId, { status: 'completed', completedAt: new Date() }).catch(() => {});
    return result;
  } catch (e) {
    if (jobLogId) await JobLog.findByIdAndUpdate(jobLogId, { status: 'failed', completedAt: new Date(), error: String(e.message).slice(0, 1000) }).catch(() => {});
    throw e;
  }
}

function getHandler(queueName) {
  // Lazy-load heavy processors to keep boot fast
  switch (queueName) {
    case 'trend-research':
      return async () => require('../services/trends/trendService').collectTrends({});
    case 'trend-analysis':
      return async () => require('../services/trends/trendService').analyseTrends({});
    case 'script-generation':
      return async (p) => require('./scriptProcessor').processScript(p);
    case 'video-generation':
      return async (p) => require('./videoProcessor').processVideo(p);
    case 'voice-generation':
      return async (p) => require('./voiceProcessor').processVoice(p);
    case 'subtitle-generation':
      return async (p) => require('./subtitleProcessor').processSubtitles(p);
    case 'video-processing':
      return async (p) => require('./finalizeProcessor').processFinal(p);
    case 'seo-generation':
      return async (p) => require('./seoProcessor').processSEO(p);
    case 'quality-check':
      return async (p) => require('./qualityProcessor').processQuality(p);
    case 'facebook-publishing':
      return async (p) => require('./publishProcessor').processPublish(p);
    default:
      return async () => { logger.info(`[INFO] No processor for ${queueName}`); };
  }
}

module.exports = { runProcessorInline, getHandler };
