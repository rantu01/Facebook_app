function trendAnalysisPrompt({ topic, niche, audience, excluded = [] }) {
  return {
    system: 'You are a trend analyst for short-form Facebook video. Return JSON only. Never guarantee virality.',
    user: `Analyse this trending topic for the niche "${niche}" and audience "${audience}".
Excluded topics: ${excluded.join(', ') || 'none'}.
Topic: ${JSON.stringify(topic)}
Return JSON: { "relevance":0-100, "viralPotential":0-100, "freshness":0-100, "audienceInterest":0-100, "competition":0-100 (higher=more crowded), "facebookSuitability":0-100, "videoSuitability":0-100, "recommendation":"SKIP|CONSIDER|RECOMMENDED|TOP_PICK", "reason":string }`,
  };
}

function scriptPrompt({ topic, trendInfo, niche, audience, language, tone, durationSec }) {
  return {
    system: 'You are a short-form video scriptwriter. Return strict JSON only. No markdown. Avoid fake claims, unsupported stats, clickbait, copyrighted copying, dangerous instructions.',
    user: `Create a ${durationSec}s ${language}-language script (tone: ${tone}) for niche "${niche}", audience ${audience}.
Topic: ${topic}
Trend context: ${JSON.stringify(trendInfo || {})}
Structure: 0-3s strong hook, 3-20s main value/story, final CTA. Encourage source verification for factual claims.
Return JSON: { "title":string, "hook":string, "script":string, "cta":string, "visualScenes":[string], "keywords":[string max 8], "hashtags":[string max 6 with #], "thumbnailText":string max 5 words, "caption":string, "videoPrompt":string (visual prompt for AI video gen, vertical 9:16), "seoReasoning":string }`,
  };
}

function seoPrompt({ content, niche, strategies }) {
  return {
    system: 'You are an SEO/discoverability optimizer for Facebook videos. Optimize relevance, freshness, hook, caption quality, hashtags, audience intent. Never promise guaranteed ranking or virality. Return JSON only.',
    user: `Optimize this content for discoverability. Niche: ${niche}. Strategies: ${JSON.stringify(strategies || {})}.
Content: ${JSON.stringify({ title: content.title, script: content.script, caption: content.caption, keywords: content.keywords, hashtags: content.hashtags })}
Return JSON: { "title":string, "caption":string, "keywords":[string], "hashtags":[string], "cta":string, "description":string, "seoScore":0-100, "qualityScore":0-100, "reasoning":string }`,
  };
}

function qualityPrompt({ content }) {
  return {
    system: 'You are a content safety reviewer. Flag sexual, hate, dangerous instructions, illegal activity, extreme graphic violence, misinformation risk, impersonation, fraud. Return JSON only.',
    user: `Review this video package for auto-publishing safety: ${JSON.stringify({ title: content.title, script: content.script, caption: content.caption, hashtags: content.hashtags, hasVideo: Boolean(content.finalVideoPath || content.originalVideoPath), aspectRatio: content.aspectRatio })}.
Return JSON: { "status":"PASSED|WARNING|BLOCKED", "notes":[string], "qualityScore":0-100 }`,
  };
}

module.exports = { trendAnalysisPrompt, scriptPrompt, seoPrompt, qualityPrompt };
