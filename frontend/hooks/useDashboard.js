'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function useDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);
  return { data, error, loading };
}
