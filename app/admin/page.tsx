import React from 'react';
import SettingsEditor from '../../components/admin-settings/SettingsEditor';

async function checkAuth() {
  try {
    const res = await fetch('/api/admin/session');
    const json = await res.json();
    return json.ok;
  } catch {
    return false;
  }
}

export default async function AdminPage(){
  const isAuth = await checkAuth();
  if (!isAuth) {
    return (
      <div style={{padding:20}}>
        <h2>Protected</h2>
        <p>Please <a href="/admin/login">login</a> as host to access admin settings.</p>
      </div>
    );
  }

  return (
    <div style={{padding:20}}>
      <h1>Admin Settings</h1>
      <SettingsEditor />
    </div>
  );
}
