'use client';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { api } from '../../lib/api';

export default function JobsPage() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState('');
  async function load() { try { const d = await api.jobs('?limit=50'); setItems(d.items); } catch (e) { setMsg(e.message); } }
  useEffect(() => { load(); }, []);
  return (
    <Sidebar>
      <h1 className="mb-4 text-xl font-bold">Job Logs</h1>
      {msg && <div className="card mb-3 text-sm">{msg}</div>}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="p-2">Job ID</th><th className="p-2">Type</th><th className="p-2">Status</th><th className="p-2">Attempts</th><th className="p-2">Error</th><th className="p-2">Actions</th></tr></thead>
          <tbody>
            {items.map((j) => (
              <tr key={j._id} className="border-t">
                <td className="p-2 font-mono text-xs">{j.jobId}</td>
                <td className="p-2">{j.queue}</td>
                <td className="p-2">{j.status}</td>
                <td className="p-2">{j.attempts}</td>
                <td className="p-2 text-xs text-red-600">{(j.error || '').slice(0, 120)}</td>
                <td className="p-2"><button className="btn btn-ghost" onClick={() => api.retryJob(j._id).then(load)}>Retry</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Sidebar>
  );
}
