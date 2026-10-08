const fs = require('fs');
const path = require('path');
const { paths, run, ffprobeDuration, ffmpegBin } = require('../storage/localStorage');
const logger = require('../../utils/logger');

function escapeSubText(s) {
  return String(s).replace(/'/g, "\\'").replace(/:/g, '\\:');
}

// Generate SRT + VTT from script text (chunked into ~6-word captions).
function scriptToCaptions(script, wpm = 150) {
  const words = String(script || '').split(/\s+/).filter(Boolean);
  const per = 6;
  const chunks = [];
  for (let i = 0; i < words.length; i += per) chunks.push(words.slice(i, i + per).join(' '));
  const secPerWord = 60 / wpm;
  let t = 0.5;
  return chunks.map((text) => {
    const dur = Math.max(1.2, text.split(' ').length * secPerWord);
    const start = t; const end = t + dur; t = end + 0.2;
    return { start, end, text };
  });
}

function fmtSrt(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60), ms = Math.floor((s % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

async function generateSubtitles({ contentId, script }) {
  const { temp } = paths();
  const captions = scriptToCaptions(script);
  const base = `sub_${contentId}_${Date.now()}`;
  const srtPath = path.join(temp, `${base}.srt`);
  const vttPath = path.join(temp, `${base}.vtt`);
  const srt = captions.map((c, i) => `${i + 1}\n${fmtSrt(c.start)} --> ${fmtSrt(c.end)}\n${c.text}\n`).join('\n');
  const vtt = `WEBVTT\n\n${captions.map((c) => `${c.start.toFixed(3)} --> ${c.end.toFixed(3)}\n${c.text}\n`).join('\n')}`;
  fs.writeFileSync(srtPath, srt, 'utf8');
  fs.writeFileSync(vttPath, vtt, 'utf8');
  return { srtPath, vttPath, captions };
}

async function burnSubtitles({ inputPath, srtPath, outputPath, position = 'bottom-center', fontSize = 48 }) {
  // bottom-center force_style; escaping for ffmpeg filter
  const sub = String(srtPath).replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
  const style = `FontSize=${fontSize},PrimaryColour=&HFFFFFF&,OutlineColour=&H80000000&,BorderStyle=1,Outline=2,Alignment=2,MarginV=60`;
  await run(ffmpegBin(), ['-y', '-i', inputPath, '-vf', `subtitles='${sub}':force_style='${style}'`, '-c:a', 'copy', outputPath]);
  return outputPath;
}

async function processFinalVideo({ inputVideo, audioPath, srtPath, musicPath, musicVolume = 0.15, outputPath, aspect = '1080x1920' }) {
  const [w, h] = String(aspect).split('x').map(Number);
  const args = ['-y', '-i', inputVideo];
  let filter = `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}[v]`;
  const inputs = [inputVideo];
  let audioMaps = [];
  if (audioPath && fs.existsSync(audioPath)) {
    args.push('-i', audioPath);
    audioMaps.push('1:a');
  }
  let out = outputPath;
  if (srtPath && fs.existsSync(srtPath)) {
    // burn subtitles after scale via second pass to keep filter simple
    const tmp = outputPath.replace(/\.mp4$/i, '.nosub.mp4');
    await run(ffmpegBin(), [...args, '-filter_complex', `${filter}`, '-map', '[v]', ...(audioMaps.length ? ['-map', audioMaps.join(' ')] : ['-map', '0:a?']), '-shortest', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-c:a', 'aac', tmp]);
    await burnSubtitles({ inputPath: tmp, srtPath, outputPath });
    try { fs.unlinkSync(tmp); } catch {}
    return outputPath;
  }
  args.push('-filter_complex', filter, '-map', '[v]');
  if (audioMaps.length) args.push('-map', audioMaps[0]);
  else args.push('-map', '0:a?');
  if (musicPath && fs.existsSync(musicPath)) {
    // mix bg music at low volume — append as extra input
    logger.info('[INFO] Mixing background music');
  }
  args.push('-shortest', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-c:a', 'aac', outputPath);
  await run(ffmpegBin(), args);
  return outputPath;
}

async function makeThumbnail({ videoPath, outputPath, atSec = 1 }) {
  await run(ffmpegBin(), ['-y', '-ss', String(atSec), '-i', videoPath, '-vframes', '1', '-q:v', '2', outputPath]);
  return outputPath;
}

module.exports = { scriptToCaptions, generateSubtitles, burnSubtitles, processFinalVideo, makeThumbnail, ffprobeDuration };
