const fs = require('fs');
const path = require('path');
const { paths, ffprobeDuration } = require('../storage/localStorage');
const logger = require('../../utils/logger');
const APIUsage = require('../../models/APIUsage');

// Provider abstraction for future TTS vendors. Default: local placeholder that
// creates a silent audio track matching estimated narration length (so the video
// pipeline works without credentials). Real providers can be plugged in via
// VOICE_PROVIDER env + credentials without changing callers.
async function synthesizeVoice({ contentId, text, language = 'Bengali', voice = 'bn-default', speed = 1.0 }) {
  const { temp } = paths();
  const outPath = path.join(temp, `voice_${contentId}_${Date.now()}.mp3`);
  const provider = process.env.VOICE_PROVIDER || 'local-silent';
  const words = String(text || '').split(/\s+/).filter(Boolean).length;
  const duration = Math.max(5, Math.round(words / 2.5 / (speed || 1))); // ~150wpm
  if (provider === 'local-silent') {
    const { run, ffmpegBin } = require('../storage/localStorage');
    await run(ffmpegBin(), ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', String(duration), '-q:a', '9', '-acodec', 'libmp3lame', outPath]);
    await APIUsage.create({ provider: 'tts', model: 'local-silent', operation: 'synthesize', success: true });
    logger.info(`[INFO] Voice synthesized (placeholder silent track, ${duration}s): ${outPath}`);
    return { audioPath: outPath, duration, provider, voice, status: 'COMPLETED' };
  }
  throw Object.assign(new Error(`Voice provider "${provider}" not configured`), { status: 501, code: 'VOICE_NOT_CONFIGURED' });
}

module.exports = { synthesizeVoice };
