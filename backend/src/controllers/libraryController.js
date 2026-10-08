const ScheduledPost = require('../models/ScheduledPost');
const PublishedPost = require('../models/PublishedPost');
const Content = require('../models/Content');
const Video = require('../models/Video');
const { ok, fail } = require('../utils/apiResponse');

async function listVideos(req, res, next) {
  try {
    const items = await Video.find().sort({ createdAt: -1 }).limit(50);
    return ok(res, { items });
  } catch (e) { return next(e); }
}

async function listScheduled(req, res, next) {
  try {
    const items = await ScheduledPost.find().sort({ scheduledAt: 1 }).limit(100).populate('contentId');
    return ok(res, { items });
  } catch (e) { return next(e); }
}

async function updateScheduled(req, res, next) {
  try {
    const s = await ScheduledPost.findById(req.params.id);
    if (!s) return fail(res, 'Not found', 'NOT_FOUND', 404);
    if (req.body.scheduledAt) s.scheduledAt = new Date(req.body.scheduledAt);
    if (req.body.caption !== undefined) s.caption = req.body.caption;
    if (req.body.status && ['SCHEDULED', 'CANCELLED'].includes(req.body.status)) {
      s.status = req.body.status;
      if (req.body.status === 'CANCELLED') await Content.findByIdAndUpdate(s.contentId, { status: 'CANCELLED' });
    }
    await s.save();
    return ok(res, { scheduledPost: s });
  } catch (e) { return next(e); }
}

async function listPublished(req, res, next) {
  try {
    const items = await PublishedPost.find().sort({ publishedAt: -1 }).limit(100).populate('contentId');
    return ok(res, { items });
  } catch (e) { return next(e); }
}

module.exports = { listVideos, listScheduled, updateScheduled, listPublished };
