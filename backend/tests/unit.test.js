const { normalizeTopic, topicHash, clamp, isTransientError, isAuthError } = require('../src/utils/helpers');
const { validateOrThrow, scriptSchema } = require('../src/services/ai/validation');
const { overallScore } = require('../src/services/ai/aiService');

describe('helpers', () => {
  test('topicHash is stable and normalized', () => {
    expect(topicHash('Hello AI!')).toBe(topicHash('hello ai'));
    expect(normalizeTopic('  ChatGPT!!! ')).toBe('chatgpt');
  });
  test('transient vs auth classification', () => {
    expect(isTransientError(new Error('429 rate limit'))).toBe(true);
    expect(isAuthError(Object.assign(new Error('invalid token'), { status: 401 }))).toBe(true);
  });
});

describe('AI validation', () => {
  test('rejects malformed script', () => {
    expect(() => validateOrThrow(scriptSchema, { title: 'x' })).toThrow();
  });
  test('accepts valid script', () => {
    const v = validateOrThrow(scriptSchema, {
      title: 'AI news', hook: 'hook here!', script: 'This is a sufficiently long script body for testing purposes.',
      caption: 'caption here', hashtags: ['#ai'],
    });
    expect(v.title).toBe('AI news');
  });
});

describe('scoring', () => {
  test('overallScore in 0-100, no virality guarantee', () => {
    const s = overallScore({ freshness: 80, relevance: 80, viralPotential: 70, videoSuitability: 80, audienceInterest: 75, competition: 30, facebookSuitability: 70 });
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});
