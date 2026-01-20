"use client";

import { useState, useEffect } from "react";
import { Key, Plus, Copy, Trash2, Check, AlertCircle } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  user?: {
    name: string | null;
    email: string;
  };
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    try {
      const res = await fetch("/api/api-keys");
      const data = await res.json();
      if (data.keys) {
        setKeys(data.keys);
      }
    } catch (e) {
      console.error("Failed to fetch keys:", e);
    } finally {
      setLoading(false);
    }
  }

  async function createKey() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName || undefined }),
      });
      const data = await res.json();
      if (data.key) {
        setNewKey(data.key);
        fetchKeys();
      } else {
        setError(data.error || "Failed to create key");
      }
    } catch (e) {
      setError("Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function deleteKey(id: string) {
    if (!confirm("Are you sure you want to revoke this API key? This cannot be undone.")) {
      return;
    }
    try {
      await fetch(`/api/api-keys?id=${id}`, { method: "DELETE" });
      fetchKeys();
    } catch (e) {
      console.error("Failed to delete key:", e);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">API Keys</h1>
          <p className="mt-1 text-slate-400">
            Manage API keys for programmatic access
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true);
            setNewKey(null);
            setNewKeyName("");
          }}
          className="flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600"
        >
          <Plus className="h-4 w-4" />
          Create API Key
        </button>
      </div>

      {/* API Documentation */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-lg font-semibold text-white">Quick Start</h2>
        <p className="mt-2 text-sm text-slate-400">
          Use your API key to analyze videos programmatically. Replace{" "}
          <code className="rounded bg-slate-800 px-1 py-0.5 text-purple-400">YOUR_API_KEY</code>{" "}
          with your actual API key value.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-300">Analyze a video from URL:</p>
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-300">
{`curl -X POST https://recreated-video-sentiment-analysis-ten.vercel.app/api/v1/analyze \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "videoUrl": "https://example.com/video.mp4"
  }'`}
            </pre>
          </div>
        </div>
      </div>

      {/* Keys List */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 className="font-semibold text-white">Your API Keys</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-400">Loading...</div>
        ) : keys.length === 0 ? (
          <div className="p-12 text-center">
            <Key className="mx-auto h-12 w-12 text-slate-600" />
            <p className="mt-4 text-slate-400">No API keys yet</p>
            <p className="text-sm text-slate-500">
              Create an API key to start using the API
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
                    <Key className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{key.name}</p>
                    <p className="text-sm text-slate-400">
                      <code className="rounded bg-slate-800 px-1 py-0.5">
                        {key.prefix}...
                      </code>
                      <span className="mx-2">·</span>
                      Created {new Date(key.createdAt).toLocaleDateString()}
                      {key.lastUsedAt && (
                        <>
                          <span className="mx-2">·</span>
                          Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteKey(key.id)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6">
            {newKey ? (
              <>
                <div className="mb-4 flex items-center gap-2 text-green-400">
                  <Check className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">API Key Created</h3>
                </div>
                <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-yellow-400" />
                    <p className="text-sm text-yellow-200">
                      Copy this key now. You won&apos;t be able to see it again!
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-950 p-3">
                  <code className="flex-1 break-all text-sm text-green-400">
                    {newKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newKey)}
                    className="rounded p-2 hover:bg-slate-800"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="mt-4 w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <h3 className="mb-4 text-lg font-semibold text-white">
                  Create API Key
                </h3>
                {error && (
                  <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                    {error}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Key name (optional)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createKey}
                    disabled={creating}
                    className="flex-1 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Create Key"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
