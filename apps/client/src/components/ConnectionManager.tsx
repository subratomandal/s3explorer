import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Server, Edit2, ChevronRight, Shield } from 'lucide-react';
import * as api from '../api';
import type { Connection, ConnectionConfig } from '../api';
import { Modal } from './Modal';

// Combined regions list for the "Region" dropdown to support multiple providers
const REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-east-2', label: 'US East (Ohio)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'EU (Ireland)' },
  { value: 'eu-central-1', label: 'EU (Frankfurt)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
  { value: 'nyc3', label: 'DigitalOcean NYC3' },
  { value: 'auto', label: 'Auto (Cloudflare R2)' },
  { value: 'other', label: 'Other / Custom' }
];

interface ConnectionManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionChange: () => void;
}

export function ConnectionManager({ isOpen, onClose, onConnectionChange }: ConnectionManagerProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState<ConnectionConfig>({
    name: '',
    endpoint: '',
    accessKey: '',
    secretKey: '',
    region: 'us-east-1',
    forcePathStyle: true,
  });

  useEffect(() => {
    if (isOpen) {
      loadConnections();
      setView('list');
      setError(null);
    }
  }, [isOpen]);

  async function loadConnections() {
    setLoading(true);
    try {
      const data = await api.listConnections();
      setConnections(data);
    } catch (err: any) {
      setError('Failed to load connections');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({
      name: '',
      endpoint: '',
      accessKey: '',
      secretKey: '',
      region: 'us-east-1',
      forcePathStyle: true,
    });
    setEditingId(null);
    setView('list');
    setError(null);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      if (editingId) {
        await api.updateConnection(editingId, form);
      } else {
        await api.createConnection(form);
      }
      await loadConnections();
      onConnectionChange();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save connection');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this connection?')) return;
    try {
      await api.deleteConnection(id);
      await loadConnections();
      onConnectionChange();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleActivate(id: number) {
    try {
      await api.activateConnection(id);
      await loadConnections();
      onConnectionChange();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function startEdit(e: React.MouseEvent, conn: Connection) {
    e.stopPropagation();
    setForm({
      name: conn.name,
      endpoint: conn.endpoint,
      accessKey: '',
      secretKey: '',
      region: conn.region,
      forcePathStyle: conn.forcePathStyle,
    });
    setEditingId(conn.id);
    setView('form');
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connection Manager" size="lg">
      <div className="min-h-[400px] flex flex-col">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {error}
          </div>
        )}

        {view === 'list' ? (
          <>
            <div className="mb-6">
              <p className="text-gray-400 text-sm leading-relaxed">
                Manage your S3-compatible storage connections. Switch between staging, production, or different providers like AWS, MinIO, or Cloudflare R2.
              </p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] pr-1 custom-scrollbar">
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading connections...</div>
              ) : connections.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-800 rounded-lg bg-gray-900/30">
                  <Server className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                  <p className="text-gray-400 font-medium">No connections yet</p>
                  <p className="text-gray-500 text-sm mt-1">Add your first S3 provider to get started</p>
                </div>
              ) : (
                connections.map((conn) => (
                  <div
                    key={conn.id}
                    onClick={() => handleActivate(conn.id)}
                    className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer ${conn.isActive
                      ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_20px_-10px_rgba(168,85,247,0.3)]'
                      : 'bg-gray-900/40 border-gray-800 hover:border-gray-700 hover:bg-gray-900/80 hover:scale-[1.01] active:scale-[0.99]'
                      }`}
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${conn.isActive ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-800 text-gray-500'
                        }`}>
                        <Server className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-medium truncate ${conn.isActive ? 'text-white' : 'text-gray-300'}`}>
                            {conn.name}
                          </h3>
                          {conn.isActive && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 font-mono truncate" title={conn.endpoint}>
                          {conn.endpoint}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-2">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => startEdit(e, conn)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                          title="Edit Configuration"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, conn.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete Configuration"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {!conn.isActive && (
                        <ChevronRight className="w-4 h-4 text-gray-600 transition-opacity" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-800">
              <button
                onClick={() => { resetForm(); setView('form'); }}
                className="w-full py-3 px-4 rounded-xl border border-dashed border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800/50 transition-all active:scale-[0.99] flex items-center justify-center gap-2 font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Connection
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col">
            <h3 className="text-lg font-medium text-white mb-6">
              {editingId ? 'Edit Profile' : 'New Profile'}
            </h3>

            <div className="space-y-4 flex-1 overflow-y-auto px-1">
              {/* Profile Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Profile Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Production, Staging, Local"
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-gray-600"
                />
              </div>

              {/* Endpoint */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">S3 Endpoint</label>
                <input
                  type="text"
                  value={form.endpoint}
                  onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                  placeholder="https://s3.amazonaws.com"
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-gray-600 font-mono"
                />
              </div>

              {/* Keys Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Access Key</label>
                  <input
                    type="text"
                    value={form.accessKey}
                    onChange={(e) => setForm({ ...form, accessKey: e.target.value })}
                    placeholder="AKIA..."
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-gray-600 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Secret Key</label>
                  <input
                    type="password"
                    value={form.secretKey}
                    onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-gray-600 font-mono"
                  />
                </div>
              </div>

              {/* Region & Config */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Region</label>
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <select
                      value={form.region}
                      onChange={(e) => setForm({ ...form, region: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all appearance-none cursor-pointer"
                    >
                      {REGIONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <ChevronRight className="w-4 h-4 text-gray-500 absolute right-3 top-3 rotate-90 pointer-events-none" />
                  </div>

                  <label className="flex items-center gap-3 p-2.5 cursor-pointer group flex-shrink-0">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${form.forcePathStyle
                      ? 'bg-purple-600 border-purple-600 scale-100'
                      : 'border-gray-600 bg-transparent group-hover:border-gray-500'
                      }`}>
                      {form.forcePathStyle && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={form.forcePathStyle}
                      onChange={(e) => setForm({ ...form, forcePathStyle: e.target.checked })}
                      className="hidden"
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Path-style URLs</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={() => setView('list')}
                className="w-full px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors bg-gray-900 border border-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.endpoint}
                className="w-full px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_-5px_rgba(147,51,234,0.5)]"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
