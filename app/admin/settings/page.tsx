'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminDashboard from '@/app/components/Admin/AdminDashboard';
import { Loader2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') {
      router.push('/');
    }
  }, [status, session, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        setError('Incorrect password');
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
      return (
          <div className="flex h-screen items-center justify-center bg-[#111] text-white">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
      );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#111] text-white">
         <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#111]">
            <h1 className="text-xl font-bold text-white">Admin Settings Interface</h1>
            <button
                onClick={() => setIsAuthenticated(false)}
                className="text-gray-400 hover:text-white px-3 py-1 hover:bg-white/10 rounded"
            >
                Lock Settings
            </button>
        </div>
        <div className="h-[calc(100vh-65px)]">
            <AdminDashboard password={password} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black/90 px-4">
      <div className="bg-[#1a1a1a] p-8 rounded-xl shadow-2xl border border-gray-800 w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Admin Settings Access</h2>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Verify Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="Enter admin password"
              autoFocus
            />
          </div>
          
          {error && <div className="text-red-500 text-sm">{error}</div>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Unlock Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
