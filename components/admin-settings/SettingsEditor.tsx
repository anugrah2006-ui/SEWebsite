"use client";
import React, { useEffect, useState } from 'react';

export default function SettingsEditor() {
  const [settings, setSettings] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(data => { setSettings(data); setLoading(false); }).catch(()=>setLoading(false));

    const es = new EventSource('/api/admin/subscribe');
    es.onmessage = (e) => {
      try { const d = JSON.parse(e.data); setSettings(d); setStatus('Received live update'); setTimeout(()=>setStatus(null),2000); } catch (e){}
    };
    return () => es.close();
  }, []);

  if (loading) return <div>Loading settings…</div>;
  if (!settings) return <div>Failed to load settings.</div>;

  function updateField(path: string, value: any) {
    const parts = path.split('.');
    const copy = JSON.parse(JSON.stringify(settings));
    let cur: any = copy;
    for (let i=0;i<parts.length-1;i++) cur = cur[parts[i]] = cur[parts[i]] || {};
    cur[parts[parts.length-1]] = value;
    setSettings(copy);
  }

  async function save() {
    setStatus('Saving...');
    const res = await fetch('/api/admin/settings', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(settings) });
    if (res.ok) setStatus('Saved'); else setStatus('Save failed');
    setTimeout(()=>setStatus(null),2000);
  }

  async function resetDefaults() {
    setStatus('Resetting...');
    const res = await fetch('/api/admin/settings', { method: 'DELETE' });
    if (res.ok) setStatus('Reset to defaults'); else setStatus('Reset failed');
    setTimeout(()=>setStatus(null),2000);
  }

  return (
    <div style={{padding:20}}>
      <h2>Site Settings</h2>
      <div style={{marginBottom:8}}><strong>Title:</strong>
        <input style={{marginLeft:8}} value={settings.siteTitle||''} onChange={(e)=>updateField('siteTitle', e.target.value)} />
      </div>
      <div style={{marginBottom:8}}><strong>Description:</strong>
        <input style={{marginLeft:8, width:'60%'}} value={settings.siteDescription||''} onChange={(e)=>updateField('siteDescription', e.target.value)} />
      </div>

      <h3>Pages</h3>
      {Object.entries(settings.pages||{}).map(([pageKey, page]:any)=> (
        <div key={pageKey} style={{border:'1px solid #ddd', padding:10, marginBottom:10}}>
          <strong>{pageKey} — {page.title}</strong>
          <div style={{marginTop:8}}>
            <div>Page Title: <input value={page.title||''} onChange={(e)=>updateField(`pages.${pageKey}.title`, e.target.value)} /></div>
            <div style={{marginTop:8}}>
              <strong>Sections</strong>
              {Object.entries(page.sections||{}).map(([secKey, sec]:any)=> (
                <div key={secKey} style={{marginTop:8, padding:8, background:'#fafafa'}}>
                  <div><em>{secKey}</em></div>
                  {typeof sec === 'object' && !Array.isArray(sec) ? (
                    Object.entries(sec).map(([k,v])=> (
                      <div key={k} style={{marginTop:4}}>
                        <label>{k}: </label>
                        <input value={String(v||'')} onChange={(e)=>updateField(`pages.${pageKey}.sections.${secKey}.${k}`, e.target.value)} />
                      </div>
                    ))
                  ) : (
                    <div>
                      <input value={String(sec||'')} onChange={(e)=>updateField(`pages.${pageKey}.sections.${secKey}`, e.target.value)} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <div style={{display:'flex', gap:8}}>
        <button onClick={save} style={{padding:'8px 12px'}}>Update Changes</button>
        <button onClick={resetDefaults} style={{padding:'8px 12px', background:'#f8d7da'}}>Reset To Default</button>
        {status && <div style={{alignSelf:'center'}}>{status}</div>}
      </div>
    </div>
  );
}
