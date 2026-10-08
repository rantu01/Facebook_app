'use client';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { Stat } from '../../components/ui';
import { api } from '../../lib/api';

export default function UsagePage() {
  const [data, setData] = useState(null);
  useEffect(() => { api.usage().then(setData).catch(() => {}); }, []);
  if (!data) return <Sidebar><div className="card">Loading…</div></Sidebar>;
  return (
    <Sidebar>
      <h1 className="mb-4 text-xl font-bold">API Usage</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Today" value={data.today} />
        <Stat label="This month" value={data.month} />
        <Stat label="Failed today" value={data.failedToday} />
        <Stat label="Operations" value={data.byOperation?.length || 0} />
      </div>
      <div className="card mt-4">
        {(data.byOperation || []).map((o) => <div key={o._id} className="flex justify-between border-b py-1 text-sm"><span>{o._id}</span><span>{o.count}</span></div>)}
      </div>
    </Sidebar>
  );
}
