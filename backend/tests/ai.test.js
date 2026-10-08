const { chooseCandidates } = require('../src/services/ai/geminiClient');
const { chooseHFModels } = require('../src/services/video/hfVideoService');

describe('model auto-switch selection', () => {
  const available = [
    { name: 'gemini-3.8-flash', methods: ['generateContent', 'countTokens'] },
    { name: 'gemini-3.5-flash-lite', methods: ['generateContent'] },
    { name: 'gemini-3.8-flash-tts', methods: ['generateContent'] },
    { name: 'gemini-2.5-pro-image', methods: ['generateContent'] },
  ];

  test('prefers configured order among capable models', () => {
    expect(chooseCandidates(['gemini-3.5-flash-lite', 'gemini-3.8-flash'], available)[0]).toBe('gemini-3.5-flash-lite');
  });

  test('drops dead models and appends text spares (no tts/image)', () => {
    const out = chooseCandidates(['gemini-2.0-flash'], available);
    expect(out).not.toContain('gemini-2.0-flash');
    expect(out[0]).toBe('gemini-3.8-flash');
    expect(out).not.toContain('gemini-3.8-flash-tts');
    expect(out).not.toContain('gemini-2.5-pro-image');
  });

  test('falls back to configured list when discovery is empty', () => {
    expect(chooseCandidates(['gemini-3.8-flash'], [])).toEqual(['gemini-3.8-flash']);
  });
});

describe('HF model auto-switch selection', () => {
  const available = [
    { id: 'Wan-AI/Wan2.1-T2V-1.3B', providers: ['fal-ai'] },
    { id: 'Lightricks/LTX-Video-0.9.8-13B-distilled', providers: ['replicate'] },
  ];

  test('prefers configured order among served models', () => {
    const out = chooseHFModels(['Lightricks/LTX-Video-0.9.8-13B-distilled', 'Wan-AI/Wan2.1-T2V-1.3B'], available);
    expect(out[0]).toBe('Lightricks/LTX-Video-0.9.8-13B-distilled');
  });

  test('drops unserved models, keeps served ones', () => {
    const out = chooseHFModels(['nonexistent/Model'], available);
    expect(out).not.toContain('nonexistent/Model');
    expect(out).toContain('Wan-AI/Wan2.1-T2V-1.3B');
  });

  test('falls back to defaults when discovery is empty', () => {
    expect(chooseHFModels([], []).length).toBeGreaterThan(0);
  });
});

