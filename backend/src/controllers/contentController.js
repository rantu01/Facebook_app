const Joi = require('joi');
const Content = require('../models/Content');
const ContentVersion = require('../models/ContentVersion');
const ScheduledPost = require('../models/ScheduledPost');
const { enqueue } = require('../services/scheduler/queue');
const { normalizeTopic, topicHash } = require('../utils/helpers');
const { getContentSettings } = require('../services/trends/trendService');
const { checkLimits, isDuplicateTopic } = require('../utils/guardrails');
const { ok, fail } = require('../utils/apiResponse');

const createSchema = Joi.object({
  topic: Joi.string().min(3).max(300).required(),
  language: Joi.string().max(40).optional(),
  tone: Joi.string().max(40).optional(),
  durationSec: Joi.number().min(5).max(180).optional(),
  aspectRatio: Joi.string().valid('9:16', '16:9', '1:1').optional(),
  voice: Joi.string().max(60).optional(),
  videoStyle: Joi.string().max(60).optional(),
});

async function list(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, parseInt(req.query.limit || '12', 10));
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const [items, total] = await Promise.all([
      Content.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Content.countDocuments(filter),
    ]);
    return ok(res, { items, total, page, limit });
  } catch (e) { return next(e); }
}

async function getOne(req, res, next) {
  try {
    const c = await Content.findById(req.params.id);
    if (!c) return fail(res, 'Not found', 'NOT_FOUND', 404);
    const versions = await ContentVersion.find({ contentId: c._id }).sort({ createdAt: -1 }).limit(20);
    return ok(res, { content: c, versions });
  } catch (e) { return next(e); }
}

async function create(req, res, next) {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error) return fail(res, 'Validation failed', 'VALIDATION_ERROR', 422, error.details.map((d) => d.message));
    const settings = await getContentSettings();
    const norm = normalizeTopic(value.topic);
    if (await isDuplicateTopic(norm)) return fail(res, 'Similar topic was already generated recently', 'DUPLICATE_TOPIC', 409);
    const c = await Content.create({
      topic: value.topic, topicHash: topicHash(value.topic), normalizedTopic: norm,
      language: value.language || settings.language, tone: value.tone || settings.tone,
      durationSec: value.durationSec || settings.defaultDurationSec || 30,
      aspectRatio: value.aspectRatio || settings.aspectRatio || '9:16',
      voice: value.voice || 'bn-default', videoStyle: value.videoStyle || 'ai-generated',
      status: 'DRAFT',
    });
    return ok(res, { content: c }, 201);
  } catch (e) { return next(e); }
}

async function update(req, res, next) {
  try {
    const c = await Content.findById(req.params.id);
    if (!c) return fail(res, 'Not found', 'NOT_FOUND', 404);
    const allowed = ['topic', 'title', 'caption', 'hashtags', 'keywords', 'cta', 'script', 'scheduledAt', 'facebookPageId', 'aspectRatio', 'status'];
    for (const k of allowed) if (req.body[k] !== undefined) c[k] = req.body[k];
    await c.save();
    return ok(res, { content: c });
  } catch (e) { return next(e); }
}

async function remove(req, res, next) {
  try {
    await Content.findByIdAndDelete(req.params.id);
    return ok(res, { deleted: true });
  } catch (e) { return next(e); }
}

// Stage triggers — each enqueues only that stage (independent regeneration)
function trigger(stage) {
  return async (req, res, next) => {
    try {
      const c = await Content.findById(req.params.id);
      if (!c) return fail(res, 'Not found', 'NOT_FOUND', 404);
      if (stage === 'video-generation') {
        const limits = await checkLimits();
        if (!limits.videoGenAllowed) return fail(res, 'Daily video generation limit reached', 'LIMIT_REACHED', 429);
      }
      await enqueue(stage, { contentId: String(c._id) });
      c.status = c.status === 'DRAFT' ? 'GENERATING' : c.status;
      await c.save();
      return ok(res, { queued: stage, contentId: String(c._id) });
    } catch (e) { return next(e); }
  };
}

async function schedule(req, res, next) {
  try {
    const c = await Content.findById(req.params.id);
    if (!c) return fail(res, 'Not found', 'NOT_FOUND', 404);
    const { scheduledAt, facebookPageId } = req.body;
    if (!scheduledAt) return fail(res, 'scheduledAt required', 'VALIDATION_ERROR', 422);
    if (facebookPageId) c.facebookPageId = facebookPageId;
    c.scheduledAt = new Date(scheduledAt);
    c.status = 'SCHEDULED';
    await c.save();
    const s = await ScheduledPost.create({
      contentId: c._id, facebookPageId: c.facebookPageId, scheduledAt: c.scheduledAt, caption: c.caption, status: 'SCHEDULED',
    });
    return ok(res, { content: c, scheduledPost: s });
  } catch (e) { return next(e); }
}

async function publishNow(req, res, next) {
  try {
    const c = await Content.findById(req.params.id);
    if (!c) return fail(res, 'Not found', 'NOT_FOUND', 404);
    await enqueue('facebook-publishing', { contentId: String(c._id) });
    return ok(res, { queued: true });
  } catch (e) { return next(e); }
}

module.exports = {
  list, getOne, create, update, remove, schedule, publishNow,
  genScript: trigger('script-generation'),
  genVideo: trigger('video-generation'),
  genVoice: trigger('voice-generation'),
  genSubtitles: trigger('subtitle-generation'),
  process: trigger('video-processing'),
  genSeo: trigger('seo-generation'),
  quality: trigger('quality-check'),
};
