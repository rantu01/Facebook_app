'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try { await api.login(email, password); router.push('/dashboard'); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-3">
        <h1 className="text-xl font-bold">AI Content Autopilot</h1>
        <p className="text-sm text-slate-500">Sign in to the admin console</p>
        {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</div>}
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button className="btn btn-primary w-full justify-center" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
