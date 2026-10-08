const Content = require('../models/Content');
const Audio = require('../models/Audio');
const { synthesizeVoice } = require('../services/video/voiceService');
const logger = require('../utils/logger');

async function processVoice({ contentId }) {
  const content = await Content.findById(contentId);
  if (!content) throw new Error('Content not found');
  logger.info('[INFO] Voice generation started');
  const res = await synthesizeVoice({ contentId: String(content._id), text: content.script, language: content.language, voice: content.voice });
  await Audio.create({ contentId: content._id, provider: res.provider, voice: content.voice, language: content.language, text: content.script, audioPath: res.audioPath, duration: res.duration, status: 'COMPLETED' });
  content.audioPath = res.audioPath;
  await content.save();
  logger.info('[INFO] Voice generation completed');
  return { contentId: String(content._id), audioPath: res.audioPath };
}

module.exports = { processVoice };
