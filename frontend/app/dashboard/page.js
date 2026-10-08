'use client';
import Sidebar from '../../components/Sidebar';
import { Stat, Badge } from '../../components/ui';
import { useDashboard } from '../../hooks/useDashboard';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function DashboardPage() {
  const { data, loading, error } = useDashboard();
  if (loading) return <Sidebar><div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map((i) => <div key={i} className="card h-24 animate-pulse" />)}</div></Sidebar>;
  if (error) return <Sidebar><div className="card text-red-600">Failed to load: {error}. Is the backend running?</div></Sidebar>;
  const s = data.stats;
  return (
    <Sidebar>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">AI Content Autopilot</h1>
        <Badge tone={data.automation?.enabled ? 'green' : 'slate'}>Automation: {data.automation?.enabled ? '● Running' : '○ Paused'}</Badge>
        <Badge tone={data.facebook?.connected ? 'green' : 'amber'}>Facebook: {data.facebook?.connected ? '✓ Connected' : 'Not connected'}</Badge>
        <Badge tone={data.gemini?.configured ? 'green' : 'amber'}>Gemini: {data.gemini?.configured ? '✓ Connected' : 'Not configured'}</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Today's Topics" value={s.todaysTopics} />
        <Stat label="Videos Generated" value={s.videosGenerated} />
        <Stat label="Videos Scheduled" value={s.videosScheduled} />
        <Stat label="Videos Published" value={s.videosPublished} />
        <Stat label="Failed Jobs" value={s.failedJobs} />
        <Stat label="AI Requests Today" value={s.aiRequestsToday} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-semibold">Generated videos (14 days)</h2>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h2 className="mb-2 font-semibold">Upcoming Posts</h2>
          {!data.upcoming?.length && <p className="text-sm text-slate-500">Nothing scheduled.</p>}
          <ul className="space-y-2">
            {(data.upcoming || []).map((u) => (
              <li key={u._id} className="flex items-center justify-between text-sm">
                <span>{u.contentId?.title || u.contentId?.topic || u.contentId}</span>
                <span className="text-slate-500">{new Date(u.scheduledAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Sidebar>
  );
}
