'use client';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { Badge } from '../../components/ui';
import { api } from '../../lib/api';

export default function TrendsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  async function load() {
    setLoading(true);
    try { const d = await api.trends('?limit=30'); setItems(d.items); } catch (e) { setMsg(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function act(fn, label) {
    setMsg(`${label}…`);
    try { await fn(); setMsg(`${label} queued.`); load(); } catch (e) { setMsg(e.message); }
  }
  return (
    <Sidebar>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Trending Topics</h1>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={() => act(api.research, 'Research')}>Research now</button>
          <button className="btn btn-primary" onClick={() => act(api.analyse, 'Analysis')}>Analyse</button>
        </div>
      </div>
      {msg && <div className="card mb-3 text-sm">{msg}</div>}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="p-2">Topic</th><th className="p-2">Trend</th><th className="p-2">Overall</th><th className="p-2">Viral</th><th className="p-2">Fresh</th><th className="p-2">Comp.</th><th className="p-2">Recommendation</th></tr></thead>
          <tbody>
            {items.map((t) => (
              <tr key={t._id} className="border-t">
                <td className="p-2"><div className="font-medium">{t.title}</div><div className="text-xs text-slate-500">{t.source}</div></td>
                <td className="p-2">{t.trendScore}</td>
                <td className="p-2 font-semibold">{t.overallScore}</td>
                <td className="p-2">{t.viralPotential}</td>
                <td className="p-2">{t.freshness}</td>
                <td className="p-2">{t.competition}</td>
                <td className="p-2"><Badge tone={t.recommendation === 'TOP_PICK' ? 'green' : t.recommendation === 'SKIP' ? 'red' : 'indigo'}>{t.recommendation}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="p-3 text-sm text-slate-500">Loading…</p>}
      </div>
    </Sidebar>
  );
}
