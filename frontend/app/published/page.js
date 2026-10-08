'use client';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { api } from '../../lib/api';

export default function PublishedPage() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.published().then((d) => setItems(d.items)).catch(() => {}); }, []);
  return (
    <Sidebar>
      <h1 className="mb-4 text-xl font-bold">Published Posts</h1>
      <div className="card space-y-2">
        {items.map((p) => (
          <div key={p._id} className="border-b py-2 text-sm">
            <div className="font-medium">{p.contentId?.title || p.contentId?.topic}</div>
            <div className="text-xs text-slate-500">Post {p.facebookPostId} · {p.publishedAt && new Date(p.publishedAt).toLocaleString()} {p.permalink && <a className="text-indigo-600" href={p.permalink} target="_blank">View</a>}</div>
          </div>
        ))}
        {!items.length && <p className="text-sm text-slate-500">Nothing published yet.</p>}
      </div>
    </Sidebar>
  );
}
