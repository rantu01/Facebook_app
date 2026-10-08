'use client';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { api } from '../../lib/api';

export default function AutomationPage() {
  const [a, setA] = useState(null);
  const [msg, setMsg] = useState('');
  async function load() { try { const d = await api.automation(); setA(d.automation); } catch (e) { setMsg(e.message); } }
  useEffect(() => { load(); }, []);
  async function save() { try { await api.updateAutomation(a); setMsg('Saved.'); } catch (e) { setMsg(e.message); } }
  if (!a) return <Sidebar><div className="card">Loading… {msg}</div></Sidebar>;
  return (
    <Sidebar>
      <h1 className="mb-4 text-xl font-bold">Automation</h1>
      {msg && <div className="card mb-3 text-sm">{msg}</div>}
      <div className="card max-w-xl space-y-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!a.enabled} onChange={(e) => setA({ ...a, enabled: e.target.checked })} /> Automation ON</label>
        <label className="text-sm">Videos per day (1-10)<input className="input" type="number" min="1" max="10" value={a.videosPerDay} onChange={(e) => setA({ ...a, videosPerDay: Number(e.target.value) })} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">Research time<input className="input" value={a.researchTime} onChange={(e) => setA({ ...a, researchTime: e.target.value })} /></label>
          <label className="text-sm">Generation start<input className="input" value={a.generationStart} onChange={(e) => setA({ ...a, generationStart: e.target.value })} /></label>
        </div>
        <label className="text-sm">Posting times (comma separated)<input className="input" value={(a.postingTimes || []).join(', ')} onChange={(e) => setA({ ...a, postingTimes: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></label>
        <label className="text-sm">Timezone<input className="input" value={a.timezone} onChange={(e) => setA({ ...a, timezone: e.target.value })} /></label>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={save}>Save</button>
          <button className="btn btn-ghost" onClick={() => api.runAutomation().then(() => setMsg('Pipeline queued.'))}>Run research now</button>
        </div>
        <p className="text-xs text-slate-500">Pipeline: Research → Analyse → Select → Script → Video → Voice → Subtitle → Process → Quality → SEO → Schedule → Publish. Each step is a separate retryable job.</p>
      </div>
    </Sidebar>
  );
}
