'use client';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { Badge } from '../../components/ui';
import { api } from '../../lib/api';

export default function StoryPage() {
  const [settings, setSettings] = useState(null);
  const [history, setHistory] = useState([]);
  const [topic, setTopic] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  async function load() {
    try {
      const s = await api.storySettings();
      setSettings(s.settings);
      const h = await api.storyHistory();
      setHistory(h.items);
    } catch (e) { setMsg(`Load failed: ${e.message}`); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setBusy('save'); setMsg('');
    try { await api.updateStorySettings(settings); setMsg('Saved. Scheduler picks it up within a minute.'); }
    catch (e) { setMsg(`Save failed: ${e.message}`); }
    finally { setBusy(''); }
  }

  async function postNow(kind) {
    setBusy(kind); setMsg('');
    try {
      if (kind === 'story') {
        const d = await api.postStoryNow();
        setMsg(`Story published! Post ID: ${d.facebookPostId}`);
      } else {
        const d = await api.postVideoNow(topic || undefined);
        setMsg(`Video queued from topic: ${d.topic} (continue it in Content Studio / Jobs)`);
        setTopic('');
      }
    } catch (e) { setMsg(`FAILED: ${e.message}`); }
    finally { setBusy(''); load(); }
  }

  if (!settings) return <Sidebar><div className="card">Loading… {msg}</div></Sidebar>;

  return (
    <Sidebar>
      <h1 className="mb-1 text-xl font-bold">Story Autopilot</h1>
      <p className="mb-4 text-sm text-slate-500">
        Gemini writes it, the system posts it on schedule. Text stories go out as <b>text posts on the Page feed</b> (Facebook offers no Stories API) — video mode queues a full video generation instead.
      </p>
      {msg && <div className="card mb-3 text-sm">{msg}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={!!settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} />
            Autopilot {settings.enabled ? <Badge tone="green">● ACTIVE</Badge> : <Badge tone="slate">○ OFF</Badge>}
          </label>

          <div className="text-sm">
            <div className="mb-1 font-medium">When active, post:</div>
            <label className="flex items-center gap-2 py-1">
              <input type="radio" checked={settings.mode === 'story'} onChange={() => setSettings({ ...settings, mode: 'story' })} />
              Text story <span className="text-xs text-slate-500">(Gemini text → Page feed post)</span>
            </label>
            <label className="flex items-center gap-2 py-1">
              <input type="radio" checked={settings.mode === 'video'} onChange={() => setSettings({ ...settings, mode: 'video' })} />
              Video <span className="text-xs text-slate-500">(top trend → script → video pipeline → publish)</span>
            </label>
          </div>

          <label className="block text-sm">Posting times (HH:mm, comma separated)
            <input className="input" value={(settings.postingTimes || []).join(', ')} onChange={(e) => setSettings({ ...settings, postingTimes: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">Timezone<input className="input" value={settings.timezone || ''} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} /></label>
            <label className="text-sm">Page ID (blank = first connected)<input className="input" value={settings.facebookPageId || ''} onChange={(e) => setSettings({ ...settings, facebookPageId: e.target.value })} /></label>
          </div>
          <label className="block text-sm">Niche override (blank = Content Settings niche)
            <input className="input" value={settings.niche || ''} onChange={(e) => setSettings({ ...settings, niche: e.target.value })} placeholder="e.g. Artificial Intelligence" />
          </label>
          <button className="btn btn-primary" disabled={busy === 'save'} onClick={save}>Save settings</button>
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold">Manual controls</h2>
          <button className="btn btn-ghost w-full justify-center" disabled={!!busy} onClick={() => postNow('story')}>
            {busy === 'story' ? 'Publishing…' : 'Post a text story now'}
          </button>
          <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Video topic (blank = use top trend)" />
          <button className="btn btn-ghost w-full justify-center" disabled={!!busy} onClick={() => postNow('video')}>
            {busy === 'video' ? 'Queueing…' : 'Queue a video now'}
          </button>
          <p className="text-xs text-slate-500">Manual buttons work even when the autopilot is OFF.</p>
        </div>
      </div>

      <div className="card mt-4">
        <h2 className="mb-2 font-semibold">History</h2>
        {!history.length && <p className="text-sm text-slate-500">Nothing posted yet.</p>}
        {history.map((h) => (
          <div key={h._id} className="border-b py-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge tone={h.status === 'PUBLISHED' ? 'green' : h.status === 'QUEUED' ? 'indigo' : 'red'}>{h.type} · {h.status}</Badge>
              <span className="text-xs text-slate-500">{new Date(h.createdAt).toLocaleString()} {h.slot && h.slot !== 'manual' ? `· slot ${h.slot}` : ''}</span>
            </div>
            <div className="mt-1 text-slate-700">{(h.text || '').slice(0, 200)}</div>
            {h.facebookPostId && <div className="font-mono text-xs text-slate-500">FB post: {h.facebookPostId}</div>}
            {h.error && <div className="text-xs text-red-600">{h.error}</div>}
          </div>
        ))}
      </div>
    </Sidebar>
  );
}
