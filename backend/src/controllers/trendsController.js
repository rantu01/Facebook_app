const TrendTopic = require('../models/TrendTopic');
const { collectTrends, analyseTrends } = require('../services/trends/trendService');
const { enqueue } = require('../services/scheduler/queue');
const { ok } = require('../utils/apiResponse');

async function list(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const sort = req.query.sort === 'trendScore' ? { trendScore: -1 } : { overallScore: -1, createdAt: -1 };
    const filter = {};
    if (req.query.recommendation) filter.recommendation = req.query.recommendation;
    const [items, total] = await Promise.all([
      TrendTopic.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
      TrendTopic.countDocuments(filter),
    ]);
    return ok(res, { items, total, page, limit });
  } catch (e) { return next(e); }
}

async function research(req, res, next) {
  try {
    await enqueue('trend-research', {});
    return ok(res, { queued: true });
  } catch (e) { return next(e); }
}

async function analyse(req, res, next) {
  try {
    await enqueue('trend-analysis', {});
    return ok(res, { queued: true });
  } catch (e) { return next(e); }
}

module.exports = { list, research, analyse };
