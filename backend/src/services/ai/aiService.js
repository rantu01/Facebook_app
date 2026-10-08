const { generateText, extractJSON } = require('./geminiClient');
const prompts = require('./prompts');
const { scriptSchema, seoSchema, analysisSchema, validateOrThrow } = require('./validation');
const { clamp } = require('../../utils/helpers');

function overallScore(a) {
  // freshness + relevance + viralPotential + videoSuitability + audienceInterest, minus competition penalty; normalized 0-100
  const raw = (a.freshness || 0) + (a.relevance || 0) + (a.viralPotential || 0) + (a.videoSuitability || 0) + (a.audienceInterest || 0);
  const penalty = (a.competition || 0) * 0.4;
  const withFb = raw * 0.2 + (a.facebookSuitability || 0) * 0.0; // keep simple linear model
  return clamp(Math.round(raw / 5 - penalty * 0.1 + (a.facebookSuitability || 0) * 0.0), 0, 100);
}

async function analyseTopic(topic, ctx) {
  const p = prompts.trendAnalysisPrompt({ topic, niche: ctx.niche, audience: ctx.audience, excluded: ctx.excluded });
  try {
    const { text } = await generateText({ prompt: p.user, systemInstruction: p.system, jsonMode: true });
    const parsed = validateOrThrow(analysisSchema, repairHashtags(extractJSON(text)));
    return { ...parsed, overallScore: overallScore(parsed) };
  } catch (e) {
    // Fallback heuristic scoring (no fake AI claim) so pipeline can continue
    return heuristicScore(topic, ctx);
  }
}

function heuristicScore(topic) {
  const freshness = topic.publishedAt ? Math.max(0, 100 - (Date.now() - new Date(topic.publishedAt).getTime()) / 86400000 * 8) : 40;
  const base = {
    relevance: 55, viralPotential: 50, freshness: Math.round(freshness),
    audienceInterest: 55, competition: 40, facebookSuitability: 60, videoSuitability: 65,
    recommendation: 'CONSIDER', reason: 'Heuristic fallback: Gemini unavailable.',
  };
  return { ...base, overallScore: overallScore(base) };
}

async function generateScript({ topic, trendInfo, niche, audience, language, tone, durationSec }) {
  const p = prompts.scriptPrompt({ topic, trendInfo, niche, audience, language, tone, durationSec });
  const { text } = await generateText({ prompt: p.user, systemInstruction: p.system, jsonMode: true });
  let parsed;
  try {
    parsed = extractJSON(text);
  } catch {
    throw Object.assign(new Error('AI returned malformed output (script)'), { code: 'AI_VALIDATION_ERROR', status: 502 });
  }
  // one repair attempt: trim + normalize hashtag prefix
  parsed = repairHashtags(parsed);
  return validateOrThrow(scriptSchema, parsed);
}

async function generateSEO({ content, niche, strategies }) {
  const p = prompts.seoPrompt({ content, niche, strategies });
  const { text } = await generateText({ prompt: p.user, systemInstruction: p.system, jsonMode: true });
  const parsed = repairHashtags(extractJSON(text));
  const v = validateOrThrow(seoSchema, parsed);
  v.keywords = dedupeKeywords(v.keywords).slice(0, 8);
  v.hashtags = normalizeTags(v.hashtags).slice(0, 6);
  return v;
}

async function qualityCheck({ content }) {
  const p = prompts.qualityPrompt({ content });
  try {
    const { text } = await generateText({ prompt: p.user, systemInstruction: p.system, jsonMode: true });
    const parsed = extractJSON(text);
    const status = ['PASSED', 'WARNING', 'BLOCKED'].includes(parsed.status) ? parsed.status : 'WARNING';
    // Hard rules override AI
    const notes = Array.isArray(parsed.notes) ? parsed.notes.map(String) : [];
    if (!content.finalVideoPath && !content.originalVideoPath) notes.push('Missing video');
    if (!content.caption) notes.push('Missing caption');
    if (!['9:16', '16:9', '1:1'].includes(content.aspectRatio)) notes.push('Invalid aspect ratio');
    const blockedByRules = /sexual|hate|illegal|terror|child/i.test(`${content.title} ${content.script}`);
    return { status: blockedByRules ? 'BLOCKED' : status, notes, qualityScore: clamp(Number(parsed.qualityScore) || 70, 0, 100) };
  } catch {
    return { status: 'WARNING', notes: ['Quality AI unavailable - manual review advised'], qualityScore: 50 };
  }
}

function repairHashtags(obj) {
  if (obj && Array.isArray(obj.hashtags)) obj.hashtags = normalizeTags(obj.hashtags);
  return obj;
}
function normalizeTags(tags) {
  return [...new Set((tags || []).map((t) => {
    let s = String(t).trim().replace(/\s+/g, '');
    if (!s.startsWith('#')) s = `#${s}`;
    return s.slice(0, 60);
  }).filter((t) => t.length > 1))];
}
function dedupeKeywords(kw) {
  return [...new Set((kw || []).map((k) => String(k).trim()).filter(Boolean))];
}

module.exports = { analyseTopic, generateScript, generateSEO, qualityCheck, overallScore };
