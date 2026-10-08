const Content = require('../models/Content');
const { generateSubtitles } = require('../services/video/videoPipeline');
const logger = require('../utils/logger');

async function processSubtitles({ contentId }) {
  const content = await Content.findById(contentId);
  if (!content) throw new Error('Content not found');
  const { srtPath } = await generateSubtitles({ contentId: String(content._id), script: content.script });
  content.subtitlePath = srtPath;
  await content.save();
  logger.info('[INFO] Subtitle generation completed');
  return { contentId: String(content._id), srtPath };
}

module.exports = { processSubtitles };
