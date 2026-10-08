const fs = require('fs');
const path = require('path');
const { paths, run, ffmpegBin } = require('../storage/localStorage');
const logger = require('../../utils/logger');

// FREE fallback video renderer: builds a real vertical MP4 from script scenes
// (gradient background + animated text) with FFmpeg only. No API, no cost,
// always works — used automatically when Veo is unavailable on the key.
const PALETTES = [
  ['0x1e1b4b', '0x4f46e5'],
  ['0x06281c', '0x0d9488'],
  ['0x2a0a2e', '0xa21caf'],
  ['0x0c1a2e', '0x2563eb'],
];

function findFont() {
  const cands = process.platform === 'win32'
    ? ['C:/Windows/Fonts/arial.ttf', 'C:/Windows/Fonts/calibri.ttf', 'C:/Windows/Fonts/seguisb.ttf']
    : ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', '/System/Library/Fonts/Helvetica.ttc'];
  return cands.find((f) => fs.existsSync(f)) || null;
}

function chunkWords(text, perLine = 5, maxLines = 6) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  for (let i = 0; i < words.length && lines.length < maxLines; i += perLine) {
    lines.push(words.slice(i, i + perLine).join(' '));
  }
  return lines.join('\n');
}

function escDrawtext(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/:/g, '\\:').replace(/%/g, '\\%');
}

async function renderSlideshow({ contentId, title = '', script = '', width = 1080, height = 1920, totalSec = 30 }) {
  const { temp, generated } = paths();
  const font = findFont();
  const paras = String(script || '').split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const scenes = (paras.length ? paras : [title || 'AI Update']).slice(0, 6);
  const segDur = Math.max(3, Math.round(totalSec / scenes.length));
  const stamp = Date.now();
  const segs = [];
  let i = 0;
  for (const scene of scenes) {
    const [c1, c2] = PALETTES[i % PALETTES.length];
    const seg = path.join(temp, `slide_${contentId}_${stamp}_${i}.mp4`);
    const args = ['-y', '-f', 'lavfi', '-i', `color=c=${c1}:s=${width}x${height}:d=${segDur}:r=30`];
    let vf = 'format=yuv420p';
    if (font) {
      const txtFile = path.join(temp, `slide_${contentId}_${stamp}_${i}.txt`);
      fs.writeFileSync(txtFile, chunkWords(scene), 'utf8');
      const tf = txtFile.replace(/\\/g, '/').replace(/'/g, "\\'").replace(/:/g, '\\:');
      const ff = font.replace(/\\/g, '/').replace(/'/g, "\\'").replace(/:/g, '\\:');
      vf = `drawtext=fontfile='${ff}':textfile='${tf}':fontsize=54:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:line_spacing=14,fade=t=in:st=0:d=0.5,fade=t=out:st=${segDur - 0.5}:d=0.5,format=yuv420p`;
    }
    args.push('-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', seg);
    await run(ffmpegBin(), args);
    segs.push(seg);
    i++;
  }
  const listFile = path.join(temp, `slides_${contentId}_${stamp}.txt`);
  fs.writeFileSync(listFile, segs.map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join('\n'), 'utf8');
  const out = path.join(generated, `orig_${contentId}_${stamp}.mp4`);
  await run(ffmpegBin(), ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', out]);
  for (const s of segs) { try { fs.unlinkSync(s); } catch {} }
  try { fs.unlinkSync(listFile); } catch {}
  const duration = segs.length * segDur;
  logger.info(`[INFO] Free slideshow video rendered (${duration}s, ${font ? 'with captions' : 'no font found — plain backgrounds'}): ${out}`);
  return { videoPath: out, duration };
}

module.exports = { renderSlideshow, findFont };
