const Content = require('../models/Content');
const ScheduledPost = require('../models/ScheduledPost');
const PublishedPost = require('../models/PublishedPost');
const { publishVideo } = require('../services/facebook/publishingService');
const { isTransientError, isAuthError } = require('../utils/helpers');
const logger = require('../utils/logger');

async function processPublish({ contentId, scheduledPostId }) {
  const content = await Content.findById(contentId);
  if (!content) throw new Error('Content not found');
  if (content.qualityStatus === 'BLOCKED') throw Object.assign(new Error('Content blocked by quality check'), { status: 400, code: 'BLOCKED' });
  const videoPath = content.finalVideoPath || content.originalVideoPath;
  if (!videoPath) throw Object.assign(new Error('No video to publish'), { status: 400 });
  const pageId = content.facebookPageId;
  if (!pageId) throw Object.assign(new Error('No Facebook page selected'), { status: 400 });

  // Idempotency: if already published for this content+schedule, return existing
  const existing = await PublishedPost.findOne({ contentId: content._id, status: 'PUBLISHED' });
  if (existing && !scheduledPostId) return { alreadyPublished: true, id: String(existing._id) };

  content.status = 'PUBLISHING';
  content.publishAttempts = (content.publishAttempts || 0) + 1;
  await content.save();

  try {
    const caption = `${content.title}\n\n${content.caption}\n\n${(content.hashtags || []).join(' ')}`.slice(0, 2200);
    const res = await publishVideo({ pageId, videoPath, caption });
    const pub = await PublishedPost.create({
      contentId: content._id, scheduledPostId: scheduledPostId || null, facebookPageId: pageId,
      facebookPostId: res.facebookPostId, facebookVideoId: res.facebookVideoId,
      caption, publishedAt: new Date(), permalink: res.permalink, status: 'PUBLISHED',
    });
    content.status = 'PUBLISHED';
    await content.save();
    if (scheduledPostId) await ScheduledPost.findByIdAndUpdate(scheduledPostId, { status: 'PUBLISHED' });
    logger.info('[INFO] Facebook publish successful');
    return { publishedPostId: String(pub._id) };
  } catch (e) {
    content.status = 'FAILED';
    content.lastError = String(e.message).slice(0, 500);
    await content.save();
    if (scheduledPostId) await ScheduledPost.findByIdAndUpdate(scheduledPostId, { status: 'FAILED', lastError: content.lastError, attempts: 1 });
    if (isAuthError(e)) {
      const err = new Error(`Facebook auth failed: ${e.message}. Reconnect the page.`);
      err.code = 'FB_AUTH_ERROR'; err.status = 401;
      throw err;
    }
    throw e;
  }
}

module.exports = { processPublish };
