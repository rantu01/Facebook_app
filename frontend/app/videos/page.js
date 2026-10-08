'use client';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { StatusBadge } from '../../components/ui';
import { api } from '../../lib/api';

export default function VideosPage() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.contents('?limit=24').then((d) => setItems(d.items)).catch(() => {}); }, []);
  return (
    <Sidebar>
      <h1 className="mb-4 text-xl font-bold">Video Library</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((c) => (
          <div key={c._id} className="card">
            <div className="mb-1 flex items-center justify-between"><span className="font-medium">{c.title || c.topic}</span><StatusBadge status={c.status} /></div>
            <div className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleString()} · Trend {c.trendScore} · SEO {c.seoScore} · {c.qualityStatus}</div>
            <div className="mt-2 text-sm text-slate-600">{(c.caption || '').slice(0, 120)}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(c.hashtags || []).map((h) => <span key={h} className="badge bg-slate-100 text-slate-600">{h}</span>)}
            </div>
          </div>
        ))}
      </div>
    </Sidebar>
  );
}
