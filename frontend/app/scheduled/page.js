'use client';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { api } from '../../lib/api';

export default function ScheduledPage() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState('');
  async function load() { try { const d = await api.scheduled(); setItems(d.items); } catch (e) { setMsg(e.message); } }
  useEffect(() => { load(); }, []);
  async function cancel(id) { await api.updateScheduled(id, { status: 'CANCELLED' }); load(); }
  return (
    <Sidebar>
      <h1 className="mb-4 text-xl font-bold">Scheduled Posts</h1>
      {msg && <div className="card mb-3 text-sm">{msg}</div>}
      <div className="card space-y-2">
        {items.map((s) => (
          <div key={s._id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm">
            <span>{s.contentId?.title || s.contentId?.topic} · {new Date(s.scheduledAt).toLocaleString()} · {s.status}</span>
            <div className="flex gap-2">
              <button className="btn btn-ghost" onClick={() => { const v = prompt('New time (ISO):', s.scheduledAt); if (v) api.updateScheduled(s._id, { scheduledAt: v }).then(load); }}>Reschedule</button>
              <button className="btn btn-ghost" onClick={() => cancel(s._id)}>Cancel</button>
            </div>
          </div>
        ))}
        {!items.length && <p className="text-sm text-slate-500">Nothing scheduled.</p>}
      </div>
    </Sidebar>
  );
}
