const Content = require('../models/Content');
const TrendTopic = require('../models/TrendTopic');
const ScheduledPost = require('../models/ScheduledPost');
const PublishedPost = require('../models/PublishedPost');
const JobLog = require('../models/JobLog');
const FacebookPage = require('../models/FacebookPage');
const APIUsage = require('../models/APIUsage');
const AutomationSettings = require('../models/AutomationSettings');
const env = require('../config/env');
const { ok } = require('../utils/apiResponse');

async function dashboard(req, res, next) {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [topics, generated, scheduled, published, failed, upcoming, automation, pages, aiUsageToday] = await Promise.all([
      TrendTopic.countDocuments({ createdAt: { $gte: today } }),
      Content.countDocuments({ createdAt: { $gte: today } }),
      ScheduledPost.countDocuments({ status: 'SCHEDULED' }),
      PublishedPost.countDocuments({ createdAt: { $gte: today } }),
      JobLog.countDocuments({ status: 'failed', createdAt: { $gte: today } }),
      ScheduledPost.find({ status: 'SCHEDULED' }).sort({ scheduledAt: 1 }).limit(5).populate('contentId'),
      AutomationSettings.findOne({ key: 'default' }),
      FacebookPage.find().select('-accessTokenEnc'),
      APIUsage.countDocuments({ createdAt: { $gte: today } }),
    ]);
    const series = await Content.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 14 * 86400000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return ok(res, {
      stats: { todaysTopics: topics, videosGenerated: generated, videosScheduled: scheduled, videosPublished: published, failedJobs: failed, aiRequestsToday: aiUsageToday },
      upcoming, automation: automation || { enabled: false },
      facebook: { connected: pages.some((p) => p.status === 'CONNECTED'), pages: pages.map((p) => p.toSafeJSON()) },
      gemini: { configured: Boolean(env.GEMINI_API_KEY) },
      series,
    });
  } catch (e) { return next(e); }
}

module.exports = { dashboard };
