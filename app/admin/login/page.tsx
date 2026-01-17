"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage(){
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/admin/session', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password }) });
    if (res.ok) {
      router.push('/admin');
    } else {
      setError('Invalid password');
    }
  }

  return (
    <div style={{padding:20}}>
      <h2>Admin Login</h2>
      <form onSubmit={submit}>
        <div><input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Enter host password" /></div>
        <div style={{marginTop:8}}><button type="submit">Sign in</button></div>
        {error && <div style={{color:'red'}}>{error}</div>}
      </form>
    </div>
  );
}
