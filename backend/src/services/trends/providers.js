const RSSParser = require('rss-parser');
const axios = require('axios');
const logger = require('../../utils/logger');

const parser = new RSSParser({ timeout: 15000 });

// Base interface: each provider returns normalized topics.
class BaseTrendProvider {
  constructor(name) { this.name = name; }
  async fetch() { throw new Error('Not implemented'); }
  normalize(item) { return item; }
}

function normalize({ title, description, source, sourceUrl, publishedAt, category, keywords }) {
  return {
    title: String(title || '').slice(0, 300),
    description: String(description || '').slice(0, 2000),
    source: String(source || 'unknown'),
    sourceUrl: String(sourceUrl || ''),
    publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
    category: String(category || 'general'),
    keywords: Array.isArray(keywords) ? keywords.slice(0, 12) : [],
    trendScore: 0,
  };
}

// Google News RSS (compliant RSS, no scraping)
class GoogleNewsProvider extends BaseTrendProvider {
  constructor(niche = 'Artificial Intelligence') { super('google-news'); this.niche = niche; }
  async fetch(limit = 20) {
    const q = encodeURIComponent(this.niche);
    const url = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
    try {
      const feed = await parser.parseURL(url);
      return feed.items.slice(0, limit).map((i) => normalize({
        title: i.title, description: i.contentSnippet || i.content || '',
        source: i.source || 'Google News', sourceUrl: i.link, publishedAt: i.pubDate,
        category: 'news', keywords: [this.niche],
      }));
    } catch (e) {
      logger.error(`[ERROR] GoogleNews provider failed: ${e.message}`);
      return [];
    }
  }
}

// Generic RSS provider — admin configurable feed list
class RssProvider extends BaseTrendProvider {
  constructor(feeds = []) { super('rss'); this.feeds = feeds; }
  async fetch(limit = 20) {
    const out = [];
    for (const f of this.feeds) {
      try {
        const feed = await parser.parseURL(f.url);
        for (const i of feed.items.slice(0, Math.ceil(limit / Math.max(1, this.feeds.length)))) {
          out.push(normalize({
            title: i.title, description: i.contentSnippet || '',
            source: f.name || 'RSS', sourceUrl: i.link, publishedAt: i.pubDate,
            category: f.category || 'general', keywords: (i.categories || []).slice(0, 8),
          }));
        }
      } catch (e) { logger.error(`[ERROR] RSS feed ${f.url} failed: ${e.message}`); }
    }
    return out.slice(0, limit);
  }
}

// Placeholder for future providers (YouTube/Reddit/etc. via official APIs)
class ExternalProviderStub extends BaseTrendProvider {
  constructor() { super('external'); }
  async fetch() { return []; }
}

function scoreFreshness(publishedAt) {
  if (!publishedAt) return 40;
  const hours = (Date.now() - new Date(publishedAt).getTime()) / 3600000;
  if (hours < 6) return 95; if (hours < 24) return 80; if (hours < 72) return 60; return 35;
}

function scoreTopic(t, nicheKeywords = []) {
  const text = `${t.title} ${t.description}`.toLowerCase();
  const hits = nicheKeywords.filter((k) => text.includes(String(k).toLowerCase())).length;
  const relevance = Math.min(100, 30 + hits * 18);
  const freshness = scoreFreshness(t.publishedAt);
  const trendScore = Math.round(relevance * 0.5 + freshness * 0.3 + (t.sourceCredibility || 50) * 0.2);
  return { ...t, trendScore };
}

module.exports = { BaseTrendProvider, GoogleNewsProvider, RssProvider, ExternalProviderStub, normalize, scoreTopic, scoreFreshness };
