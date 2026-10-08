'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Flame, Clapperboard, Video, CalendarClock, CheckCircle2, Facebook, Settings, Bot, Search, Cog, ListChecks, BarChart3, LogOut, Menu, FlaskConical, Newspaper } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/trends', label: 'Trending Topics', icon: Flame },
  { href: '/studio', label: 'Content Studio', icon: Clapperboard },
  { href: '/videos', label: 'Videos', icon: Video },
  { href: '/scheduled', label: 'Scheduled Posts', icon: CalendarClock },
  { href: '/published', label: 'Published Posts', icon: CheckCircle2 },
  { href: '/pages-fb', label: 'Facebook Pages', icon: Facebook },
  { href: '/settings', label: 'AI Settings', icon: Bot },
  { href: '/settings?tab=content', label: 'Content Settings', icon: Settings },
  { href: '/settings?tab=seo', label: 'SEO Settings', icon: Search },
  { href: '/automation', label: 'Automation', icon: Cog },
  { href: '/story', label: 'Story Autopilot', icon: Newspaper },
  { href: '/jobs', label: 'Job Logs', icon: ListChecks },
  { href: '/usage', label: 'API Usage', icon: BarChart3 },
  { href: '/test-lab', label: 'Test Lab', icon: FlaskConical },
];

export default function Sidebar({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  async function logout() {
    try { await api.logout(); } catch {}
    router.push('/login');
  }
  return (
    <div className="min-h-screen lg:flex">
      <aside className={`fixed z-40 h-full w-64 border-r border-slate-200 bg-white p-4 transition-transform lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">AI</div>
          <div><div className="font-semibold">AI Content Autopilot</div><div className="text-xs text-slate-500">Admin console</div></div>
        </div>
        <nav className="space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = pathname === n.href.split('?')[0] && (n.href === '/dashboard' ? pathname === '/dashboard' : true);
            return <Link key={n.href + n.label} href={n.href} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${pathname.startsWith(n.href.split('?')[0]) && n.label !== 'Dashboard' || pathname === n.href ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><Icon size={16} />{n.label}</Link>;
          })}
        </nav>
        <button onClick={logout} className="btn btn-ghost mt-6 w-full justify-center"><LogOut size={16} /> Logout</button>
      </aside>
      <div className="flex-1">
        <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200 bg-white/80 p-3 backdrop-blur lg:hidden">
          <button className="btn btn-ghost" onClick={() => setOpen(!open)}><Menu size={18} /></button>
          <span className="font-semibold">AI Content Autopilot</span>
        </div>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
