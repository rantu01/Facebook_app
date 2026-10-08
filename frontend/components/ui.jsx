'use client';
export function Stat({ label, value, sub }) {
  return (
    <div className="card">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
export function Badge({ tone = 'slate', children }) {
  const tones = {
    green: 'bg-green-100 text-green-700', red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-800', slate: 'bg-slate-100 text-slate-600',
    indigo: 'bg-indigo-100 text-indigo-700',
  };
  return <span className={`badge ${tones[tone] || tones.slate}`}>{children}</span>;
}
export function StatusBadge({ status }) {
  const map = { PUBLISHED: 'green', READY: 'green', PASSED: 'green', SCHEDULED: 'indigo', GENERATING: 'amber', PUBLISHING: 'amber', WARNING: 'amber', FAILED: 'red', BLOCKED: 'red', DRAFT: 'slate' };
  return <Badge tone={map[status] || 'slate'}>{status}</Badge>;
}
