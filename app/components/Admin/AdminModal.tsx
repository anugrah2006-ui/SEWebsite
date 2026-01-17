'use client';

import { useState, useEffect } from 'react';
import AdminDashboard from './AdminDashboard';

type AdminModalProps = {
  onClose: () => void;
};

export default function AdminModal({ onClose }: AdminModalProps) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear authentication on mount (every time modal opens)
  // This satisfies "password should be required again" requirement
  useEffect(() => {
    setIsAuthenticated(false);
    setPassword('');
  }, []);

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
        // We don't store token in localStorage to ensure re-auth on refresh/tab switch
        // However, for the session of the modal being open, we keep state.
      } else {
        setError('Incorrect password');
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-[#1a1a1a] w-full max-w-4xl h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col border border-gray-800">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#111]">
            <h2 className="text-xl font-bold text-white">Admin Dashboard</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white px-3 py-1 hover:bg-white/10 rounded"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-auto p-0">
            <AdminDashboard password={password} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] p-8 rounded-xl shadow-2xl border border-gray-800 w-full max-w-md relative">
         <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-white"
          >
            ✕
          </button>
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Admin Access</h2>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Password
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
            {loading ? 'Verifying...' : 'Unlock Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
