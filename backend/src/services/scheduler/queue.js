const { Queue, Worker, QueueEvents } = require('bullmq');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const { getRedisConnection } = require('../../config/redis');
const JobLog = require('../../models/JobLog');

const queues = new Map();

// In-memory fallback when Redis is unavailable: execute inline (non-blocking via setImmediate)
// so the API works locally without Redis, and enabling Redis later just works.
let memoryMode = false;

function getQueue(name) {
  if (queues.has(name)) return queues.get(name);
  if (!env.USE_QUEUE) return null;
  try {
    const connection = getRedisConnection();
    if (!connection) { memoryMode = true; return null; }
    const q = new Queue(`${env.QUEUE_PREFIX}-${name}`, { connection: connection.duplicate ? connection : undefined });
    // BullMQ needs its own connection instance; reuse URL-based creation:
    queues.set(name, q);
    return q;
  } catch (e) {
    logger.error(`[ERROR] Queue init failed (${name}): ${e.message}. Falling back to inline execution.`);
    memoryMode = true;
    return null;
  }
}

async function enqueue(queueName, payload, opts = {}) {
  const contentId = payload?.contentId || null;
  const q = getQueue(queueName);
  const jobRecord = await JobLog.create({
    jobId: `tmp-${Date.now()}`, queue: queueName, contentId,
    status: 'waiting', payload,
  }).catch(() => null);

  if (!q) {
    // inline fallback: run processor async without blocking response
    const { runProcessorInline } = require('../../workers/dispatch');
    setImmediate(() => runProcessorInline(queueName, payload, jobRecord?._id).catch((e) => logger.error(`[ERROR] inline job failed: ${e.message}`)));
    if (jobRecord) { jobRecord.jobId = `inline-${jobRecord._id}`; await jobRecord.save().catch(() => {}); }
    return { id: jobRecord ? `inline-${jobRecord._id}` : `inline-${Date.now()}`, inline: true };
  }
  let job;
  try {
    job = await q.add(queueName, payload, {
      attempts: opts.attempts ?? 3,
      backoff: { type: 'exponential', delay: opts.backoffMs ?? 5000 },
      removeOnComplete: 100, removeOnFail: 200,
      ...opts,
    });
  } catch (e) {
    // Redis went away after boot — fall back to inline so API keeps working
    logger.error(`[ERROR] Queue add failed (${queueName}), falling back to inline: ${e.message}`);
    const { runProcessorInline } = require('../../workers/dispatch');
    setImmediate(() => runProcessorInline(queueName, payload, jobRecord?._id).catch((err) => logger.error(`[ERROR] inline job failed: ${err.message}`)));
    if (jobRecord) { jobRecord.jobId = `inline-${jobRecord._id}`; await jobRecord.save().catch(() => {}); }
    return { id: jobRecord ? `inline-${jobRecord._id}` : `inline-${Date.now()}`, inline: true };
  }
  if (jobRecord) { jobRecord.jobId = String(job.id); await jobRecord.save().catch(() => {}); }
  return { id: String(job.id), inline: false };
}

module.exports = { getQueue, enqueue, queues };
