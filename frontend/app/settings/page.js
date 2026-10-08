'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { api } from '../../lib/api';

function SettingsInner() {
  const tab = useSearchParams()?.get('tab') || 'ai';
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const key = tab === 'content' ? 'content' : tab === 'seo' ? 'seo' : tab === 'system' ? 'system' : 'ai';
  useEffect(() => { api.getSettings(key).then(setData).catch((e) => setMsg(e.message)); }, [key]);
  async function save() {
    try { await api.updateSettings(key, data.settings); setMsg('Saved.'); }
    catch (e) { setMsg(e.message); }
  }
  const s = data?.settings || {};
  return (
    <>
      <h1 className="mb-4 text-xl font-bold">Settings — {key.toUpperCase()}</h1>
      {msg && <div className="card mb-3 text-sm">{msg}</div>}
      <div className="card space-y-2">
        {key === 'ai' && (<>
          <p className="text-xs text-slate-500">Secrets are never exposed. Gemini key status: {s.geminiConfigured ? 'configured' : 'NOT configured'}. Model names are configurable here (no hardcoded unavailable models).</p>
          <label className="text-sm">Model<input className="input" value={s.model || ''} onChange={(e) => setData({ settings: { ...s, model: e.target.value } })} /></label>
          <label className="text-sm">Video model<input className="input" value={s.videoModel || ''} onChange={(e) => setData({ settings: { ...s, videoModel: e.target.value } })} /></label>
          <label className="text-sm">Temperature<input className="input" type="number" step="0.1" value={s.temperature ?? 0.7} onChange={(e) => setData({ settings: { ...s, temperature: Number(e.target.value) } })} /></label>
          <label className="text-sm">Max AI requests/day<input className="input" type="number" value={s.maxAiRequestsPerDay ?? 100} onChange={(e) => setData({ settings: { ...s, maxAiRequestsPerDay: Number(e.target.value) } })} /></label>
        </>)}
        {key === 'content' && (<>
          <label className="text-sm">Primary niche<input className="input" value={s.primaryNiche || ''} onChange={(e) => setData({ settings: { ...s, primaryNiche: e.target.value } })} /></label>
          <label className="text-sm">Keywords (comma separated)<input className="input" value={(s.keywords || []).join(', ')} onChange={(e) => setData({ settings: { ...s, keywords: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) } })} /></label>
          <label className="text-sm">Excluded keywords<input className="input" value={(s.excludedKeywords || []).join(', ')} onChange={(e) => setData({ settings: { ...s, excludedKeywords: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) } })} /></label>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-sm">Audience<input className="input" value={s.targetAudience || ''} onChange={(e) => setData({ settings: { ...s, targetAudience: e.target.value } })} /></label>
            <label className="text-sm">Language<input className="input" value={s.language || ''} onChange={(e) => setData({ settings: { ...s, language: e.target.value } })} /></label>
            <label className="text-sm">Tone<input className="input" value={s.tone || ''} onChange={(e) => setData({ settings: { ...s, tone: e.target.value } })} /></label>
          </div>
        </>)}
        {key === 'seo' && (<>
          <label className="text-sm">Keyword strategy<textarea className="input" value={s.keywordStrategy || ''} onChange={(e) => setData({ settings: { ...s, keywordStrategy: e.target.value } })} /></label>
          <label className="text-sm">Hashtag strategy<textarea className="input" value={s.hashtagStrategy || ''} onChange={(e) => setData({ settings: { ...s, hashtagStrategy: e.target.value } })} /></label>
          <label className="text-sm">CTA strategy<textarea className="input" value={s.ctaStrategy || ''} onChange={(e) => setData({ settings: { ...s, ctaStrategy: e.target.value } })} /></label>
        </>)}
        {key === 'system' && (<>
          <label className="text-sm">Site name<input className="input" value={s.siteName || ''} onChange={(e) => setData({ settings: { ...s, siteName: e.target.value } })} /></label>
          <label className="text-sm">Timezone<input className="input" value={s.timezone || ''} onChange={(e) => setData({ settings: { ...s, timezone: e.target.value } })} /></label>
        </>)}
        <button className="btn btn-primary" onClick={save}>Save</button>
      </div>
      <div className="mt-3 flex gap-2 text-sm">
        <a className="btn btn-ghost" href="/settings">AI</a>
        <a className="btn btn-ghost" href="/settings?tab=content">Content</a>
        <a className="btn btn-ghost" href="/settings?tab=seo">SEO</a>
        <a className="btn btn-ghost" href="/settings?tab=system">System</a>
      </div>
    </>
  );
}

export default function SettingsPage() {
  return (
    <Sidebar>
      <Suspense fallback={<div className="card">Loading…</div>}>
        <SettingsInner />
      </Suspense>
    </Sidebar>
  );
}
