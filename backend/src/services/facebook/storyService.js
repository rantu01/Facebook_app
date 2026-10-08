const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const { decryptToken } = require('../../utils/encryption');
const { generateText } = require('../ai/geminiClient');
const { getContentSettings, selectTopTopics } = require('../trends/trendService');
const { enqueue } = require('../scheduler/queue');
const { normalizeTopic, topicHash } = require('../../utils/helpers');
const FacebookPage = require('../../models/FacebookPage');
const Content = require('../../models/Content');
const { StorySettings, StoryPost } = require('../../models/StoryPost');

async function getStorySettings() {
  let s = await StorySettings.findOne({ key: 'default' });
  if (!s) s = await StorySettings.create({ key: 'default' });
  return s;
}

// NOTE: Facebook has no public API for Stories. Text "stories" are published
// as regular text posts on the Page feed — labelled honestly everywhere.
async function generateStoryText({ niche, language = 'Bengali', tone = 'Informative' }) {
  const prompt = `Write ONE short engaging Facebook Page text post (${language}, tone: ${tone}) for the niche "${niche}".
Rules: max 400 characters, open with a hook, one useful/fun idea only, end with a short CTA and 2-4 niche hashtags. No fake claims, no unsupported statistics, no clickbait, no hashtags stuffing.
Return plain post text only, no JSON, no quotes around it.`;
  const { text, model } = await generateText({
    prompt,
    systemInstruction: 'You write short social media posts. Plain text only.',
    jsonMode: false,
  });
  const clean = String(text || '').trim().slice(0, 1000);
  if (clean.length < 10) throw Object.assign(new Error('Gemini returned an empty story'), { status: 502, code: 'GEMINI_ERROR' });
  return { text: clean, model };
}

async function publishTextPost({ pageId, message }) {
  const page = await FacebookPage.findOne({ pageId }).select('+accessTokenEnc');
  if (!page) throw Object.assign(new Error('Facebook page not connected'), { status: 400, code: 'PAGE_NOT_CONNECTED' });
  const token = decryptToken(page.accessTokenEnc);
  try {
    const { data } = await axios.post(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/${pageId}/feed`, null, {
      params: { message, access_token: token },
      timeout: 60000,
    });
    page.lastPublishedAt = new Date();
    await page.save().catch(() => {});
    logger.info('[INFO] Story text post published');
    return { facebookPostId: data.id };
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    throw Object.assign(new Error(msg), { status: e.response?.status || 502, code: 'FB_PUBLISH_ERROR' });
  }
}

async function resolvePageId(settings) {
  if (settings.facebookPageId) return settings.facebookPageId;
  const page = await FacebookPage.findOne({ status: 'CONNECTED' });
  if (!page) throw Object.assign(new Error('No Facebook Page connected'), { status: 400, code: 'PAGE_NOT_CONNECTED' });
  return page.pageId;
}

async function postStoryNow({ pageId, slot = 'manual' } = {}) {
  const settings = await getStorySettings();
  const cs = await getContentSettings();
  const targetPageId = pageId || settings.facebookPageId || await resolvePageId(settings);
  const { text, model } = await generateStoryText({
    niche: settings.niche || cs.primaryNiche, language: cs.language, tone: cs.tone,
  });
  const { facebookPostId } = await publishTextPost({ pageId: targetPageId, message: text });
  const record = await StoryPost.create({
    type: 'story', text, facebookPageId: targetPageId, facebookPostId, slot, status: 'PUBLISHED',
  });
  return { storyPostId: String(record._id), facebookPostId, text, model };
}

async function postVideoNow({ topic, pageId, slot = 'manual' } = {}) {
  const settings = await getStorySettings();
  const cs = await getContentSettings();
  const targetPageId = pageId || settings.facebookPageId || await resolvePageId(settings);
  let finalTopic = topic;
  if (!finalTopic) {
    const [top] = await selectTopTopics(1);
    if (!top) throw Object.assign(new Error('No analysed trend available — run Trend research + Analyse first, or pass a topic.'), { status: 400, code: 'NO_TOPIC' });
    finalTopic = top.title;
    top.used = true;
    await top.save().catch(() => {});
  }
  const content = await Content.create({
    topic: finalTopic, topicHash: topicHash(finalTopic), normalizedTopic: normalizeTopic(finalTopic),
    language: cs.language, tone: cs.tone, durationSec: cs.defaultDurationSec || 30,
    aspectRatio: cs.aspectRatio || '9:16', status: 'GENERATING', facebookPageId: targetPageId,
  });
  await enqueue('script-generation', { contentId: String(content._id) });
  const record = await StoryPost.create({
    type: 'video', text: finalTopic, contentId: content._id,
    facebookPageId: targetPageId, slot, status: 'QUEUED',
  });
  logger.info(`[INFO] Story-autopilot video queued: ${finalTopic}`);
  return { storyPostId: String(record._id), contentId: String(content._id), topic: finalTopic };
}

module.exports = { getStorySettings, generateStoryText, publishTextPost, postStoryNow, postVideoNow };
