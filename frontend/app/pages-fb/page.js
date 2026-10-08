'use client';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { api } from '../../lib/api';

const ERROR_HELP = {
  no_pages: 'Facebook granted page permissions but this account admins no Pages. Create one at facebook.com/pages/create (same account), then Connect Page again.',
  permissions_missing: 'Facebook did NOT grant page permissions. Fix: developers.facebook.com → your app → App Roles → Roles → add this Facebook account as Admin/Developer/Tester (required while the app is in Development mode), then Connect Page again and grant everything.',
  access_denied: 'You cancelled the Facebook authorization. Click Connect Page and press Continue to grant access.',
  session_expired: 'The connect session expired. Click Connect Page again.',
  connect_failed: 'Facebook connection failed. Check META_APP_ID / META_APP_SECRET / META_REDIRECT_URI on the backend and try again.',
};

export default function PagesPage() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [notice, setNotice] = useState('');
  async function load() { try { setData(await api.fbStatus()); } catch (e) { setMsg(e.message); } }
  useEffect(() => {
    load();
    const q = new URLSearchParams(window.location.search);
    if (q.get('connected')) setNotice(`Successfully connected ${q.get('count') || ''} page(s).`);
    if (q.get('error')) setNotice(ERROR_HELP[q.get('error')] || q.get('error'));
    // Clean the URL so refresh doesn't re-show the notice
    if (q.get('connected') || q.get('error')) window.history.replaceState({}, '', '/pages-fb');
  }, []);
  async function connect() {
    try {
      const d = await api.fbConnect();
      if (d.url) window.location.href = d.url;
      else { setMsg('Connected (fallback).'); load(); }
    } catch (e) { setMsg(e.message); }
  }
  return (
    <Sidebar>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Facebook Pages</h1>
        <button className="btn btn-primary" onClick={connect}>Connect Page</button>
      </div>
      {msg && <div className="card mb-3 text-sm">{msg}</div>}
      {notice && <div className="card mb-3 text-sm">{notice}</div>}
      {!data?.configured && <div className="card mb-3 text-sm text-amber-700">Meta app not configured. Set META_APP_ID / META_APP_SECRET / META_REDIRECT_URI on the backend.</div>}
      <div className="card space-y-2">
        {(data?.pages || []).map((p) => (
          <div key={p.id} className="flex items-center justify-between border-b py-2 text-sm">
            <span>{p.pageName} ({p.pageId}) · {p.status}</span>
            <div className="flex gap-2">
              <button className="btn btn-ghost" onClick={() => api.fbDisconnect(p.id).then(load)}>Disconnect</button>
            </div>
          </div>
        ))}
        {!data?.pages?.length && <p className="text-sm text-slate-500">No pages connected.</p>}
      </div>
    </Sidebar>
  );
}
