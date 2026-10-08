const AutomationSettings = require('../models/AutomationSettings');
const AISettings = require('../models/AISettings');
const { SEOSettings, ContentSettings, SystemSettings } = require('../models/Settings');
const JobLog = require('../models/JobLog');
const APIUsage = require('../models/APIUsage');
const MusicAsset = require('../models/MusicAsset');
const { getAutomation, runDailyPipeline } = require('../services/scheduler/automation');
const { enqueue } = require('../services/scheduler/queue');
const env = require('../config/env');
const { ok, fail } = require('../utils/apiResponse');

async function getOrCreate(Model, key = 'default') {
  let s = await Model.findOne({ key });
  if (!s) s = await Model.create({ key });
  return s;
}

const automation = {
  async get(req, res, next) { try { return ok(res, { automation: await getAutomation() }); } catch (e) { return next(e); } },
  async update(req, res, next) {
    try {
      const a = await getAutomation();
      const allowed = ['enabled', 'videosPerDay', 'researchTime', 'generationStart', 'postingTimes', 'timezone'];
      for (const k of allowed) if (req.body[k] !== undefined) a[k] = req.body[k];
      await a.save();
      return ok(res, { automation: a });
    } catch (e) { return next(e); }
  },
  async runNow(req, res, next) {
    try {
      await enqueue('trend-research', {});
      return ok(res, { queued: true });
    } catch (e) { return next(e); }
  },
};

const settings = {
  async getAI(req, res, next) {
    try {
      const s = await getOrCreate(AISettings);
      // Never expose secret keys; only expose configured flag + model names
      return ok(res, { settings: { ...s.toObject(), geminiConfigured: Boolean(env.GEMINI_API_KEY) } });
    } catch (e) { return next(e); }
  },
  async updateAI(req, res, next) {
    try {
      if (req.admin.role !== 'ADMIN') return fail(res, 'Admin only', 'FORBIDDEN', 403);
      const s = await getOrCreate(AISettings);
      const allowed = ['model', 'videoModel', 'temperature', 'maxVideosPerDay', 'maxVideoGenerationsPerDay', 'maxAiRequestsPerDay'];
      for (const k of allowed) if (req.body[k] !== undefined) s[k] = req.body[k];
      await s.save();
      return ok(res, { settings: s });
    } catch (e) { return next(e); }
  },
  async getSEO(req, res, next) { try { return ok(res, { settings: await getOrCreate(SEOSettings) }); } catch (e) { return next(e); } },
  async updateSEO(req, res, next) {
    try {
      const s = await getOrCreate(SEOSettings);
      Object.assign(s, { keywordStrategy: req.body.keywordStrategy ?? s.keywordStrategy, hashtagStrategy: req.body.hashtagStrategy ?? s.hashtagStrategy, ctaStrategy: req.body.ctaStrategy ?? s.ctaStrategy });
      await s.save();
      return ok(res, { settings: s });
    } catch (e) { return next(e); }
  },
  async getContent(req, res, next) { try { return ok(res, { settings: await getOrCreate(ContentSettings) }); } catch (e) { return next(e); } },
  async updateContent(req, res, next) {
    try {
      const s = await getOrCreate(ContentSettings);
      const allowed = ['primaryNiche', 'keywords', 'excludedKeywords', 'targetAudience', 'language', 'tone', 'aspectRatio', 'defaultDurationSec'];
      for (const k of allowed) if (req.body[k] !== undefined) s[k] = req.body[k];
      await s.save();
      return ok(res, { settings: s });
    } catch (e) { return next(e); }
  },
  async getSystem(req, res, next) { try { return ok(res, { settings: await getOrCreate(SystemSettings) }); } catch (e) { return next(e); } },
  async updateSystem(req, res, next) {
    try {
      if (req.admin.role !== 'ADMIN') return fail(res, 'Admin only', 'FORBIDDEN', 403);
      const s = await getOrCreate(SystemSettings);
      Object.assign(s, req.body);
      await s.save();
      return ok(res, { settings: s });
    } catch (e) { return next(e); }
  },
};

const jobs = {
  async list(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
      const filter = {};
      if (req.query.status) filter.status = req.query.status;
      if (req.query.queue) filter.queue = req.query.queue;
      const [items, total] = await Promise.all([
        JobLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
        JobLog.countDocuments(filter),
      ]);
      return ok(res, { items, total, page, limit });
    } catch (e) { return next(e); }
  },
  async retry(req, res, next) {
    try {
      const j = await JobLog.findById(req.params.id);
      if (!j) return fail(res, 'Not found', 'NOT_FOUND', 404);
      await enqueue(j.queue, { ...(j.payload || {}), contentId: j.contentId ? String(j.contentId) : undefined });
      return ok(res, { requeued: true });
    } catch (e) { return next(e); }
  },
};

const usage = {
  async summary(req, res, next) {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
      const [todayCount, monthCount, failed, byOp] = await Promise.all([
        APIUsage.countDocuments({ createdAt: { $gte: today } }),
        APIUsage.countDocuments({ createdAt: { $gte: month } }),
        APIUsage.countDocuments({ success: false, createdAt: { $gte: today } }),
        APIUsage.aggregate([{ $group: { _id: '$operation', count: { $sum: 1 } } }]),
      ]);
      return ok(res, { today: todayCount, month: monthCount, failedToday: failed, byOperation: byOp });
    } catch (e) { return next(e); }
  },
  async list(req, res, next) {
    try {
      const items = await APIUsage.find().sort({ createdAt: -1 }).limit(100);
      return ok(res, { items });
    } catch (e) { return next(e); }
  },
};

const music = {
  async list(req, res, next) { try { return ok(res, { items: await MusicAsset.find().sort({ createdAt: -1 }) }); } catch (e) { return next(e); } },
  async create(req, res, next) {
    try {
      if (!req.file) return fail(res, 'Audio file required', 'VALIDATION_ERROR', 422);
      const m = await MusicAsset.create({
        name: req.body.name || req.file.originalname, filePath: req.file.path,
        volume: parseFloat(req.body.volume || '0.15'), category: req.body.category || 'general',
      });
      return ok(res, { music: m }, 201);
    } catch (e) { return next(e); }
  },
};

module.exports = { automation, settings, jobs, usage, music };
