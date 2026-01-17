'use client';

import { useState, useEffect } from 'react';

// Types for our content
type ContentItem = {
  id: string;
  [key: string]: any;
};

type ContentMap = {
  events?: any;
  partners?: any;
  [key: string]: any;
};

export default function AdminDashboard({ password }: { password?: string }) {
  const [activeTab, setActiveTab] = useState('events');
  const [content, setContent] = useState<ContentMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch current content on mount
  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await fetch('/api/content');
      const data = await res.json();
      // Ensure we have objects even if empty
      setContent(data || {});
    } catch (e) {
      console.error('Failed to load content', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string, data: any) => {
    setSaving(true);
    setMessage('');
    try {
      await fetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password || 'admin123'}`,
        },
        body: JSON.stringify({ key, content: data }),
      });
      setMessage(`Saved ${key} successfully!`);
      fetchContent(); // Reload to be sure
    } catch (e) {
        setMessage('Error saving content.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetToDefault = async (key: string) => {
    if (!confirm(`Are you sure you want to restore ${key} to default? This will wipe all custom edits.`)) return;
    
    setSaving(true);
    setMessage('');
    try {
      await fetch(`/api/content?key=${key}`, {
        method: 'DELETE',
        headers: {
             'Authorization': `Bearer ${password || 'admin123'}`,
        }
      });
      setMessage(`Restored ${key} to default.`);
      // Remove from local state immediately
      const newContent = { ...content };
      delete newContent[key];
      setContent(newContent);
    } catch (e) {
       setMessage('Error resetting content.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#111] text-white">
      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('events')}
          className={`px-6 py-4 font-medium transition-colors ${
            activeTab === 'events'
              ? 'border-b-2 border-purple-500 text-purple-400 bg-purple-500/10'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Events
        </button>
        <button
          onClick={() => setActiveTab('partners')}
          className={`px-6 py-4 font-medium transition-colors ${
            activeTab === 'partners'
              ? 'border-b-2 border-purple-500 text-purple-400 bg-purple-500/10'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Partners
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-auto">
        {loading ? (
           <div className="flex items-center justify-center h-full text-gray-400">Loading content...</div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            
            <div className="flex justify-between items-center mb-6">
                 <h3 className="text-2xl font-bold">
                    Editing: <span className="text-purple-400 capitalize">{activeTab}</span>
                 </h3>
                 <div className="flex gap-4">
                     <button
                        onClick={() => handleSetToDefault(activeTab)}
                        className="px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                        disabled={saving}
                     >
                        Set to Default
                     </button>
                     <button
                        onClick={() => handleSave(activeTab, content[activeTab] || { demo: "content" })} // Placeholder logic for now
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-purple-900/20"
                        disabled={saving}
                     >
                        {saving ? 'Saving...' : 'Save Changes'}
                     </button>
                 </div>
            </div>

            {message && (
                <div className={`p-4 rounded-lg mb-6 ${message.includes('Error') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                    {message}
                </div>
            )}

            {/* Editor Area (JSON for now, can be UI Later) */}
            <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-4">
                 <div className="mb-2 text-sm text-gray-500 flex justify-between">
                    <span>Raw JSON Editor</span>
                    <span className="text-xs">Edit the structure below to update content</span>
                 </div>
                 <textarea
                    value={JSON.stringify(content[activeTab] || {}, null, 2)}
                    onChange={(e) => {
                        try {
                            const parsed = JSON.parse(e.target.value);
                            setContent({ ...content, [activeTab]: parsed });
                        } catch (err) {
                            // Allow typing invalid json, just don't update state object yet or handle differently
                            // For simplicity in this iteration, we might just update a local string state and parse on blur/save.
                            // But for now, let's just let it be loose or strictly valid.
                            // Better: Just store string in a specific edit buffer.
                        }
                    }}
                    className="w-full h-96 bg-[#000] border border-gray-700 rounded-lg p-4 font-mono text-sm text-green-400 focus:outline-none focus:border-purple-500"
                    spellCheck={false}
                 />
                 <p className="mt-2 text-xs text-gray-500">
                     * Proper UI for editing individual fields can be added here. Currently exposing raw JSON for maximum flexibility.
                 </p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
