module.exports = {
  POST_STATUSES: ['DRAFT', 'GENERATING', 'READY', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED', 'BLOCKED'],
  VIDEO_STATUSES: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  JOB_STATUSES: ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'],
  QUALITY_STATUSES: ['PENDING', 'PASSED', 'WARNING', 'BLOCKED'],
  QUEUES: [
    'trend-research',
    'trend-analysis',
    'script-generation',
    'video-generation',
    'voice-generation',
    'subtitle-generation',
    'video-processing',
    'seo-generation',
    'quality-check',
    'facebook-publishing',
  ],
};
