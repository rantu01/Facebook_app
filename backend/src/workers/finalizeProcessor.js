const path = require('path');
const Content = require('../models/Content');
const { processFinalVideo, makeThumbnail } = require('../services/video/videoPipeline');
const { paths } = require('../services/storage/localStorage');
const logger = require('../utils/logger');

async function processFinal({ contentId }) {
  const content = await Content.findById(contentId);
  if (!content) throw new Error('Content not found');
  if (!content.originalVideoPath) throw Object.assign(new Error('No source video to process'), { status: 400 });
  const { generated, thumbnails } = paths();
  const out = path.join(generated, `final_${contentId}_${Date.now()}.mp4`);
  const dims = content.aspectRatio === '16:9' ? '1280x720' : content.aspectRatio === '1:1' ? '1080x1080' : '1080x1920';
  await processFinalVideo({
    inputVideo: content.originalVideoPath, audioPath: content.audioPath || null,
    srtPath: content.subtitlePath || null, musicPath: null, outputPath: out, aspect: dims,
  });
  content.finalVideoPath = out;
  const thumb = path.join(thumbnails, `thumb_${contentId}_${Date.now()}.jpg`);
  try { await makeThumbnail({ videoPath: out, outputPath: thumb }); content.thumbnailPath = thumb; } catch {}
  content.status = 'READY';
  await content.save();
  logger.info('[INFO] Final video processing completed');
  return { contentId: String(content._id), finalPath: out };
}

module.exports = { processFinal };
