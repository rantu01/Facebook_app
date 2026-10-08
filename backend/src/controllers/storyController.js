const { getStorySettings, postStoryNow, postVideoNow } = require('../services/facebook/storyService');
const { StorySettings, StoryPost } = require('../models/StoryPost');
const { ok, fail } = require('../utils/apiResponse');

async function getSettings(req, res, next) {
  try {
    return ok(res, { settings: await getStorySettings() });
  } catch (e) { return next(e); }
}

async function updateSettings(req, res, next) {
  try {
    const s = await getStorySettings();
    const { enabled, mode, postingTimes, timezone, facebookPageId, niche } = req.body;
    if (enabled !== undefined) s.enabled = Boolean(enabled);
    if (mode !== undefined) {
      if (!['story', 'video'].includes(mode)) return fail(res, 'mode must be story or video', 'VALIDATION_ERROR', 422);
      s.mode = mode;
    }
    if (postingTimes !== undefined) {
      if (!Array.isArray(postingTimes) || !postingTimes.every((t) => /^\d{2}:\d{2}$/.test(t))) {
        return fail(res, 'postingTimes must be an array of HH:mm strings', 'VALIDATION_ERROR', 422);
      }
      s.postingTimes = postingTimes;
    }
    if (timezone !== undefined) s.timezone = timezone;
    if (facebookPageId !== undefined) s.facebookPageId = facebookPageId;
    if (niche !== undefined) s.niche = niche;
    await s.save();
    return ok(res, { settings: s });
  } catch (e) { return next(e); }
}

async function history(req, res, next) {
  try {
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const items = await StoryPost.find().sort({ createdAt: -1 }).limit(limit);
    return ok(res, { items });
  } catch (e) { return next(e); }
}

async function postStory(req, res, next) {
  try {
    return ok(res, await postStoryNow({ pageId: req.body?.pageId }));
  } catch (e) { return next(e); }
}

async function postVideo(req, res, next) {
  try {
    return ok(res, await postVideoNow({ topic: req.body?.topic, pageId: req.body?.pageId }));
  } catch (e) { return next(e); }
}

module.exports = { getSettings, updateSettings, history, postStory, postVideo };
