'use client';
import { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { api } from '../../lib/api';

const STAGES = [['script', 'Generate Script'], ['video', 'Generate Video'], ['voice', 'Generate Voice'], ['subtitles', 'Generate Subtitles'], ['process', 'Process Video'], ['seo', 'Generate SEO'], ['quality', 'Quality Check']];

export default function StudioPage() {
  const [form, setForm] = useState({ topic: '', language: 'Bengali', tone: 'Informative', durationSec: 30, aspectRatio: '9:16', voice: 'bn-default', videoStyle: 'ai-generated' });
  const [content, setContent] = useState(null);
  const [msg, setMsg] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  async function create() {
    setMsg('Creating…');
    try { const d = await api.createContent(form); setContent(d.content); setMsg('Created. Now run stages.'); }
    catch (e) { setMsg(e.message); }
  }
  async function stage(s) {
    if (!content) return;
    setMsg(`${s} queued…`);
    try { await api.stage(content._id, s); setMsg(`${s} queued. Poll Jobs / Content for status.`); const d = await api.content(content._id); setContent(d.content); }
    catch (e) { setMsg(e.message); }
  }
  async function schedulePublish(scheduleIt) {
    if (!content) return;
    try {
      if (scheduleIt) {
        const at = prompt('Schedule at (ISO, e.g. 2026-01-02T10:00:00+06:00):');
        if (!at) return;
        await api.schedule(content._id, { scheduledAt: at, facebookPageId: content.facebookPageId });
        setMsg('Scheduled.');
      } else { await api.publishNow(content._id); setMsg('Publish queued.'); }
    } catch (e) { setMsg(e.message); }
  }
  return (
    <Sidebar>
      <h1 className="mb-4 text-xl font-bold">Content Studio</h1>
      {msg && <div className="card mb-3 text-sm">{msg}</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-2">
          <label className="text-sm">Topic<input className="input" value={form.topic} onChange={(e) => set('topic', e.target.value)} placeholder="e.g. Gemini AI new feature" /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">Language<input className="input" value={form.language} onChange={(e) => set('language', e.target.value)} /></label>
            <label className="text-sm">Tone<input className="input" value={form.tone} onChange={(e) => set('tone', e.target.value)} /></label>
            <label className="text-sm">Duration (s)<input className="input" type="number" value={form.durationSec} onChange={(e) => set('durationSec', Number(e.target.value))} /></label>
            <label className="text-sm">Aspect<select className="input" value={form.aspectRatio} onChange={(e) => set('aspectRatio', e.target.value)}><option>9:16</option><option>16:9</option><option>1:1</option></select></label>
          </div>
          <button className="btn btn-primary" onClick={create}>Create content</button>
        </div>
        <div className="card space-y-2">
          <h2 className="font-semibold">Pipeline (each stage regenerable independently)</h2>
          {!content && <p className="text-sm text-slate-500">Create content first.</p>}
          {content && <p className="text-sm">ID: {content._id} · Status: {content.status} · SEO: {content.seoScore} · Quality: {content.qualityStatus}</p>}
          <div className="flex flex-wrap gap-2">
            {STAGES.map(([s, label]) => <button key={s} disabled={!content} className="btn btn-ghost" onClick={() => stage(s)}>{label}</button>)}
          </div>
          <div className="flex gap-2">
            <button disabled={!content} className="btn btn-ghost" onClick={() => schedulePublish(true)}>Schedule</button>
            <button disabled={!content} className="btn btn-primary" onClick={() => schedulePublish(false)}>Publish now</button>
          </div>
          {content?.script && <pre className="max-h-64 overflow-auto rounded bg-slate-50 p-2 text-xs">{content.script}</pre>}
        </div>
      </div>
    </Sidebar>
  );
}
