const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const logger = require('../../utils/logger');
const env = require('../../config/env');

function storageRoot() {
  const dir = env.STORAGE_DIR.startsWith('.')
    ? path.resolve(__dirname, '..', '..', '..', env.STORAGE_DIR)
    : path.resolve(env.STORAGE_DIR);
  // backend/.env.example default is ../storage relative to backend/
  // resolve relative to backend dir:
  if (env.STORAGE_DIR === '../storage') return path.resolve(__dirname, '..', '..', '..', 'storage');
  return dir;
}
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); return p; }
// FFmpeg binary resolution: explicit FFMPEG_PATH wins (e.g. a winget install
// whose folder is not on PATH), otherwise fall back to PATH lookup.
function ffmpegBin() {
  return process.env.FFMPEG_PATH || 'ffmpeg';
}
function ffprobeBin() {
  if (process.env.FFPROBE_PATH) return process.env.FFPROBE_PATH;
  if (process.env.FFMPEG_PATH) {
    const ffprobe = path.join(path.dirname(process.env.FFMPEG_PATH), process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
    try { if (fs.existsSync(ffprobe)) return ffprobe; } catch {}
  }
  return 'ffprobe';
}
function paths() {
  const root = storageRoot();
  const generated = ensureDir(path.join(root, 'generated'));
  const temp = ensureDir(path.join(root, 'temp'));
  const thumbnails = ensureDir(path.join(root, 'thumbnails'));
  const music = ensureDir(path.join(root, 'music'));
  return { root, generated, temp, thumbnails, music };
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, opts, (err, stdout, stderr) => {
      if (err) { err.stderr = String(stderr).slice(0, 2000); return reject(err); }
      resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

async function ffprobeDuration(file) {
  try {
    const { stdout } = await run(ffprobeBin(), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file]);
    return parseFloat(stdout.trim()) || 0;
  } catch { return 0; }
}

module.exports = { storageRoot, paths, run, ffprobeDuration, ffmpegBin, ffprobeBin };
