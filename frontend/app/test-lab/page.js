'use client';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { Badge } from '../../components/ui';
import { api } from '../../lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function upload(path, file, fields = {}) {
  const fd = new FormData();
  if (file) fd.append('file', file);
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v ?? ''));
  const res = await fetch(`${API}${path}`, { method: 'POST', credentials: 'include', body: fd });
  const json = await res.json().catch(() => ({ success: false, message: 'Bad response' }));
  if (!res.ok || json.success === false) throw new Error(json.message || `Failed (${res.status})`);
  return json.data;
}

function Section({ title, desc, children }) {
  return (
    <div className="card space-y-2">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-xs text-slate-500">{desc}</p>
      {children}
    </div>
  );
}

export default function TestLabPage() {
  const [status, setStatus] = useState(null);
  const [topic, setTopic] = useState('How AI is changing mobile photography');
  const [script, setScript] = useState(null);
  const [pageId, setPageId] = useState('');
  const [caption, setCaption] = useState('Test post from AI Content Autopilot');
  const [photoFile, setPhotoFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [veoPrompt, setVeoPrompt] = useState('A robot hand holding a glowing smartphone, cinematic, vertical video');
  const [opId, setOpId] = useState('');
  const [opState, setOpState] = useState(null);
  const [slideUrl, setSlideUrl] = useState('');
  const [hfModels, setHfModels] = useState(null);
  const [models, setModels] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  async function load() {
    try { const d = await api.testStatus(); setStatus(d); if (!pageId && d.facebook.pages?.length) setPageId(d.facebook.pages[0].pageId); }
    catch (e) { setMsg(`Status failed: ${e.message}`); }
  }
  useEffect(() => { load(); }, []);

  async function run(key, fn) {
    setBusy(key); setMsg('');
    try { const out = await fn(); setMsg(typeof out === 'string' ? out : JSON.stringify(out).slice(0, 500)); }
    catch (e) { setMsg(`FAILED: ${e.message}`); }
    finally { setBusy(''); load(); }
  }

  return (
    <Sidebar>
      <h1 className="mb-1 text-xl font-bold">Test Lab</h1>
      <p className="mb-4 text-sm text-slate-500">Every button below hits a real integration — nothing is mocked. Use it to verify generation and posting end-to-end.</p>
      {msg && <div className="card mb-3 text-sm">{msg}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="1. Integration status" desc="Real checks: Gemini key, connected Pages, FFmpeg binary.">
          {!status && <p className="text-sm text-slate-500">Loading…</p>}
          {status && (
            <ul className="space-y-1 text-sm">
              <li>Backend: <Badge tone="green">up</Badge> <span className="text-xs text-slate-500">({status.mode})</span></li>
              <li>Gemini: {status.gemini.configured ? <Badge tone="green">✓ {status.gemini.activeModel || status.gemini.model} (auto-switch on)</Badge> : <Badge tone="red">not configured</Badge>}</li>
              <li>Video: <span className="text-xs text-slate-500">provider {status.gemini.videoProvider} — Veo if billing exists, else free local slideshow</span></li>
              <li>Hugging Face: {status.huggingface?.configured ? <Badge tone="green">✓ {status.huggingface.model}</Badge> : <Badge tone="amber">no key (slideshow fallback only)</Badge>}</li>
              <li>Facebook: {status.facebook.pages?.length ? <Badge tone="green">✓ {status.facebook.pages.length} page(s)</Badge> : <Badge tone="amber">no pages</Badge>}</li>
              <li>FFmpeg: {status.ffmpeg ? <Badge tone="green">✓ available</Badge> : <Badge tone="red">missing (voice/video processing needs it)</Badge>}</li>
            </ul>
          )}
          <button className="btn btn-ghost" onClick={load}>Refresh</button>
          <button className="btn btn-ghost" onClick={() => run('models', async () => { const d = await api.testGeminiModels(); setModels(d.generateContentModels); return `Key supports ${d.generateContentModels.length} text models. Active: ${d.activeModel || 'none yet'}`; })}>
            {busy === 'models' ? 'Listing…' : 'List available models'}
          </button>
          {models && <p className="break-all text-xs text-slate-600">{models.join(', ')}</p>}
        </Section>

        <Section title="2. Gemini script generation" desc="Real Gemini text call. Fails honestly if the key is missing/invalid.">
          <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Test topic" />
          <button className="btn btn-primary" disabled={busy} onClick={() => run('script', async () => { const d = await api.testScript(topic); setScript(d.result); return `Script generated: ${d.result.title}`; })}>
            {busy === 'script' ? 'Generating…' : 'Generate test script'}
          </button>
          {script && <pre className="max-h-64 overflow-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(script, null, 2)}</pre>}
        </Section>

        <Section title="3. Photo post test" desc="Uploads a real photo post to your Page. Proves posting + token work.">
          <input className="input" value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="Page ID" />
          <input className="input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption" />
          <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
          <button className="btn btn-primary" disabled={busy || !photoFile} onClick={() => run('photo', async () => { const d = await upload('/api/test/photo', photoFile, { pageId, caption }); return `Photo published! Post ID: ${d.facebookPostId}`; })}>
            {busy === 'photo' ? 'Publishing…' : 'Publish test photo'}
          </button>
        </Section>

        <Section title="4. Video post test" desc="Uploads a real mp4 to your Page. Proves the video publishing path.">
          <input className="input" value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="Page ID" />
          <input type="file" accept="video/mp4,video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
          <button className="btn btn-primary" disabled={busy || !videoFile} onClick={() => run('video', async () => { const d = await upload('/api/test/video', videoFile, { pageId, caption }); return `Video published! Post ID: ${d.facebookPostId}`; })}>
            {busy === 'video' ? 'Uploading…' : 'Publish test video'}
          </button>
        </Section>

        <Section title="5. Veo video generation (needs paid Gemini)" desc="Submit returns instantly with an operation ID; poll until COMPLETED. On free keys this falls back to the free local slideshow video in the real pipeline — Test Lab shows the raw Veo error honestly.">
          <input className="input" value={veoPrompt} onChange={(e) => setVeoPrompt(e.target.value)} placeholder="Video prompt" />
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={busy} onClick={() => run('veo', async () => { const d = await api.testVeoSubmit(veoPrompt); setOpId(d.operationId); return `Submitted. Operation: ${d.operationId}`; })}>
              {busy === 'veo' ? 'Submitting…' : 'Submit generation'}
            </button>
            <button className="btn btn-ghost" disabled={!opId} onClick={() => run('poll', async () => { const d = await api.testVeoStatus(opId); setOpState(d); return `State: ${d.state}`; })}>
              Poll status
            </button>
          </div>
          {opId && <p className="break-all font-mono text-xs">op: {opId}</p>}
          {opState && <pre className="max-h-40 overflow-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(opState, null, 2)}</pre>}
          <button className="btn btn-ghost" disabled={busy} onClick={() => run('slide', async () => { const d = await api.testSlideshow({ title: topic, script: script?.script || veoPrompt }); setSlideUrl(`${API}${d.url}`); return `Free slideshow rendered (${d.duration}s). Preview below.`; })}>
            {busy === 'slide' ? 'Rendering…' : 'Render free slideshow instead (no billing)'}
          </button>
          <button className="btn btn-primary" disabled={busy} onClick={() => run('hf', async () => { const d = await api.testHFVideo(veoPrompt); setSlideUrl(`${API}${d.url}`); return `HF video generated (${d.model}). Preview below.`; })}>
            {busy === 'hf' ? 'Generating (takes minutes)…' : 'Generate AI video via Hugging Face (free credits)'}
          </button>
          <button className="btn btn-ghost" onClick={() => run('hfmodels', async () => { const d = await api.testHFVideoModels(); setHfModels(d.models); return `${d.models.length} servable video models. Active: ${d.activeModel || 'none yet'}`; })}>
            {busy === 'hfmodels' ? 'Listing…' : 'List servable video models'}
          </button>
          {hfModels && <pre className="max-h-40 overflow-auto rounded bg-slate-50 p-2 text-xs">{hfModels.map((m) => `${m.id} [${m.providers.join(', ') || 'no provider'}]`).join('\n')}</pre>}
          {slideUrl && <video controls src={slideUrl} className="max-h-80 w-full rounded-lg bg-black" />}
        </Section>

        <Section title="Full pipeline" desc="For the complete flow (trend → script → voice → subtitles → FFmpeg → schedule → publish), use Content Studio + Automation. Each stage runs inline in the backend — no worker process needed.">
          <a className="btn btn-ghost" href="/studio">Open Content Studio</a>
        </Section>
      </div>
    </Sidebar>
  );
}
