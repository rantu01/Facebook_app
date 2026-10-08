const cron = require('node-cron');
const AutomationSettings = require('../../models/AutomationSettings');
const FacebookPage = require('../../models/FacebookPage');
const Content = require('../../models/Content');
const ScheduledPost = require('../../models/ScheduledPost');
const { collectTrends, analyseTrends, selectTopTopics, getContentSettings } = require('../trends/trendService');
const { enqueue } = require('./queue');
const { normalizeTopic, topicHash } = require('../../utils/helpers');
const { checkLimits, isDuplicateTopic } = require('../../utils/guardrails');
const logger = require('../../utils/logger');

async function getAutomation() {
  let a = await AutomationSettings.findOne({ key: 'default' });
  if (!a) a = await AutomationSettings.create({ key: 'default' });
  return a;
}

// Daily pipeline: research -> analyse -> select -> create content jobs -> schedule
async function runDailyPipeline() {
  const auto = await getAutomation();
  if (!auto.enabled) { logger.info('[INFO] Automation is OFF, skipping pipeline'); return { skipped: true }; }
  logger.info('[INFO] Automation pipeline started: research');
  await collectTrends({ limit: 25 });
  await analyseTrends({ limit: 25 });
  const topics = await selectTopTopics(auto.videosPerDay || 2);
  const settings = await getContentSettings();
  const page = await FacebookPage.findOne({ status: 'CONNECTED' });
  const limits = await checkLimits();
  let created = 0;
  for (const t of topics) {
    if (!limits.videosAllowed && created >= (auto.videosPerDay || 2)) break;
    const norm = normalizeTopic(t.title);
    if (await isDuplicateTopic(norm)) continue;
    const content = await Content.create({
      topic: t.title, trendTopicId: t._id, topicHash: topicHash(t.title), normalizedTopic: norm,
      language: settings.language, tone: settings.tone, durationSec: settings.defaultDurationSec || 30,
      aspectRatio: settings.aspectRatio || '9:16', status: 'GENERATING', trendScore: t.overallScore || t.trendScore,
      facebookPageId: page ? page.pageId : '',
    });
    t.used = true;
    await t.save();
    // Chain each stage as separate jobs (each retryable independently)
    await enqueue('script-generation', { contentId: String(content._id) });
    created++;
    logger.info(`[INFO] Topic selected: ${t.title}`);
  }
  auto.lastResearchAt = new Date();
  auto.status = `Last run created ${created} contents`;
  await auto.save();
  return { created };
}

// Publish due scheduled posts every minute
async function publishDuePosts() {
  const now = new Date();
  const due = await ScheduledPost.find({ status: 'SCHEDULED', scheduledAt: { $lte: now } }).limit(10);
  for (const s of due) {
    s.status = 'PUBLISHING';
    await s.save();
    await enqueue('facebook-publishing', { contentId: String(s.contentId), scheduledPostId: String(s._id) });
  }
  return { due: due.length };
}

function startSchedulers() {
  // Research daily at 06:00 Asia/Dhaka approx -> use server TZ-aware cron via dayjs? node-cron supports timezone.
  cron.schedule('0 6 * * *', () => runDailyPipeline().catch((e) => logger.error(`[ERROR] pipeline: ${e.message}`)), { timezone: 'Asia/Dhaka' });
  cron.schedule('* * * * *', () => publishDuePosts().catch((e) => logger.error(`[ERROR] due posts: ${e.message}`)));
  cron.schedule('* * * * *', () => checkStoryDue().catch((e) => logger.error(`[ERROR] story autopilot: ${e.message}`)));
  logger.info('[INFO] Schedulers started (research 06:00 Asia/Dhaka, due-posts every minute, story autopilot every minute)');
}

// Story Autopilot: at each configured HH:mm (in settings.timezone), post once per slot.
// mode 'story' -> Gemini text post to Page feed; mode 'video' -> queue a video generation.
function dhakaNow(timezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit', hour12: false }).format(new Date());
    // "08/10/2026, 14:35" -> slot "2026-10-08 14:35"
    const [dmy, hm] = parts.split(', ');
    const [dd, mm, yyyy] = dmy.split('/');
    return { slot: `${yyyy}-${mm}-${dd} ${hm}`, hm };
  } catch {
    const n = new Date();
    const p = (x) => String(x).padStart(2, '0');
    return { slot: `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())} ${p(n.getHours())}:${p(n.getMinutes())}`, hm: `${p(n.getHours())}:${p(n.getMinutes())}` };
  }
}

async function checkStoryDue() {
  const { StorySettings, StoryPost } = require('../../models/StoryPost');
  const { postStoryNow, postVideoNow } = require('../facebook/storyService');
  let s = await StorySettings.findOne({ key: 'default' });
  if (!s || !s.enabled) return { skipped: true };
  const { slot, hm } = dhakaNow(s.timezone || 'Asia/Dhaka');
  if (!(s.postingTimes || []).includes(hm)) return { skipped: true, hm };
  const already = await StoryPost.findOne({ slot, status: { $in: ['PUBLISHED', 'QUEUED'] } });
  if (already) return { skipped: true, slot, reason: 'already posted' };
  try {
    if (s.mode === 'video') {
      const r = await postVideoNow({ slot });
      logger.info(`[INFO] Story autopilot (video) queued for slot ${slot}`);
      return r;
    }
    const r = await postStoryNow({ slot });
    logger.info(`[INFO] Story autopilot (story) published for slot ${slot}`);
    return r;
  } catch (e) {
    await StoryPost.create({ type: s.mode, text: '', slot, status: 'FAILED', error: String(e.message).slice(0, 500) }).catch(() => {});
    throw e;
  }
}

module.exports = { getAutomation, runDailyPipeline, publishDuePosts, checkStoryDue, startSchedulers };
