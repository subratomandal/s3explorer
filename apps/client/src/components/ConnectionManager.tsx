import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Server, ChevronDown, AlertCircle, RefreshCw, ChevronRight, Link } from 'lucide-react';
import * as api from '../api';
import type { Connection, ConnectionConfig } from '../api';
import { Modal } from './Modal';

// Provider Presets
const PROVIDERS = [
  { id: 'aws', name: 'Amazon S3', defaultRegion: 'us-east-1', defaultEndpoint: '' },
  { id: 'cloudflare', name: 'Cloudflare R2', defaultRegion: 'auto', defaultEndpoint: 'https://<accountid>.r2.cloudflarestorage.com' },
  { id: 'digitalocean', name: 'DigitalOcean Spaces', defaultRegion: 'nyc3', defaultEndpoint: 'https://nyc3.digitaloceanspaces.com' },
  { id: 'railway', name: 'Railway Volume', defaultRegion: 'us-west-1', defaultEndpoint: 'http://localhost:4444' },
  { id: 'minio', name: 'MinIO (Self-hosted)', defaultRegion: 'us-east-1', defaultEndpoint: 'http://localhost:9000' },
  { id: 'custom', name: 'Custom / Other', defaultRegion: 'us-east-1', defaultEndpoint: '' },
];

const AWS_REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-east-2', label: 'US East (Ohio)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'EU (Ireland)' },
  { value: 'eu-central-1', label: 'EU (Frankfurt)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
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
  const [testing, setTesting] = useState(false);

  // Form State
  const [selectedProvider, setSelectedProvider] = useState<string>('custom');
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
    setSelectedProvider('custom');
    setView('list');
    setError(null);
  }

  function handleProviderChange(providerId: string) {
    setSelectedProvider(providerId);
    const provider = PROVIDERS.find(p => p.id === providerId);
    if (provider) {
      setForm(prev => ({
        ...prev,
        region: provider.defaultRegion,
        endpoint: provider.defaultEndpoint,
        // Cloudflare/DO/MinIO often need path style
        forcePathStyle: providerId === 'minio' || providerId === 'railway',
      }));
    }
  }

  async function handleTest() {
    setTesting(true);
    setError(null);
    try {
      const result = await api.testConnection({
        endpoint: form.endpoint,
        accessKey: form.accessKey,
        secretKey: form.secretKey,
        region: form.region,
        forcePathStyle: form.forcePathStyle,
      });
      alert(`Connection successful! Found ${result.bucketCount} buckets.`);
    } catch (err: any) {
      alert(`Connection failed: ${err.message}`);
    } finally {
      setTesting(false);
    }
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
      onClose(); // Close modal after activating connection
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
    setSelectedProvider('custom'); // Or try to infer from endpoint? Keeping simple for now.
    setView('form');
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connection Manager" size="lg">
      <div className="flex flex-col">
        {error && (
          <div className="mb-4 p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg text-accent-red text-sm flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {view === 'list' ? (
          <div className="animate-fadeIn">
            <div className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-foreground-muted">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  Loading...
                </div>
              ) : connections.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border rounded-lg bg-background hover:border-accent-purple/30 hover:bg-accent-purple/5 transition-all cursor-pointer group" onClick={() => { resetForm(); setView('form'); }}>
                  <Server className="w-8 h-8 mx-auto mb-2 text-foreground-muted group-hover:text-accent-purple transition-colors" />
                  <p className="text-foreground-secondary font-medium text-sm group-hover:text-accent-purple transition-colors">No connections</p>
                  <p className="text-foreground-muted text-xs mt-1">Click to add your first connection</p>
                </div>
              ) : (
                connections.map((conn) => (
                  <div
                    key={conn.id}
                    onClick={() => handleActivate(conn.id)}
                    className={`group relative flex items-center justify-between p-3 rounded-lg bg-background-tertiary border border-dashed transition-all cursor-pointer overflow-hidden ${
                      conn.isActive ? 'border-accent-purple/50' : 'border-border hover:border-accent-purple/30 hover:bg-accent-purple/5'
                    }`}
                  >
                    {/* Left accent border */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg transition-colors ${conn.isActive ? 'bg-accent-purple' : 'bg-transparent group-hover:bg-accent-purple/50'}`} />

                    <div className="flex items-center gap-3 min-w-0 pl-2 flex-1">
                      <div className={`w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center transition-colors ${
                        conn.isActive ? 'bg-accent-purple/20 text-accent-purple' : 'bg-background-hover text-foreground-muted group-hover:bg-accent-purple/10 group-hover:text-accent-purple'
                      }`}>
                        <Server className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm truncate transition-colors ${conn.isActive ? 'text-foreground' : 'text-foreground group-hover:text-accent-purple'}`}>
                            {conn.name}
                          </span>
                          {conn.isActive && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-green/20 text-accent-green">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-foreground-muted font-mono truncate mt-0.5" title={conn.endpoint}>
                          {conn.endpoint || 'https://s3.amazonaws.com'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => startEdit(e, conn)}
                        className="p-1.5 text-foreground-muted hover:text-accent-purple rounded transition-colors"
                        title="Edit"
                      >
                        <Link className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, conn.id)}
                        className="p-1.5 text-foreground-muted hover:text-accent-red rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-foreground-muted group-hover:text-accent-purple group-hover:translate-x-0.5 transition-all ml-1" />
                    </div>
                  </div>
                ))
              )}
            </div>

            {connections.length > 0 && (
              <button
                onClick={() => { resetForm(); setView('form'); }}
                className="group w-full mt-3 py-2.5 px-4 rounded-lg border border-dashed border-border text-foreground-secondary hover:text-accent-purple hover:border-accent-purple/30 hover:bg-accent-purple/5 transition-all flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Add Connection
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="space-y-3">
              {/* Provider Selector */}
              <div className="space-y-1.5">
                <label className="text-xs text-foreground-muted leading-none block">Provider</label>
                <div className="relative">
                  <select
                    value={selectedProvider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="input appearance-none cursor-pointer pr-10 h-10 text-sm"
                  >
                    {PROVIDERS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-foreground-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Profile Name & Region Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-foreground-muted leading-none block">Profile Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Production"
                    className="input h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <label className="text-xs text-foreground-muted leading-none block">Region</label>
                  <div className="relative">
                    <select
                      value={form.region}
                      onChange={(e) => setForm({ ...form, region: e.target.value })}
                      className="input appearance-none cursor-pointer pr-10 h-10 text-sm truncate"
                    >
                      {AWS_REGIONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-foreground-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Endpoint */}
              <div className="space-y-1.5">
                <label className="text-xs text-foreground-muted leading-none block">S3 Endpoint</label>
                <input
                  type="text"
                  value={form.endpoint}
                  onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                  placeholder="https://s3.amazonaws.com"
                  className="input font-mono h-9 text-sm"
                />
              </div>

              {/* Keys Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-foreground-muted leading-none block">Access Key</label>
                  <input
                    type="text"
                    value={form.accessKey}
                    onChange={(e) => setForm({ ...form, accessKey: e.target.value })}
                    placeholder="AKIA..."
                    className="input font-mono h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-foreground-muted leading-none block">Secret Key</label>
                  <input
                    type="password"
                    value={form.secretKey}
                    onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
                    placeholder="••••••••"
                    className="input font-mono h-10 text-sm"
                  />
                </div>
              </div>

              {/* Path Style & Test */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    form.forcePathStyle
                      ? 'bg-accent-purple border-accent-purple'
                      : 'border-border bg-transparent group-hover:border-border-hover'
                  }`}>
                    {form.forcePathStyle && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={form.forcePathStyle}
                    onChange={(e) => setForm({ ...form, forcePathStyle: e.target.checked })}
                    className="hidden"
                  />
                  <span className="text-xs text-foreground-muted leading-none group-hover:text-foreground transition-colors">Path-style URLs</span>
                </label>

                <button
                  onClick={handleTest}
                  disabled={testing || !form.endpoint || (!editingId && (!form.accessKey || !form.secretKey))}
                  className="group text-xs text-foreground-muted hover:text-accent-purple transition-colors flex items-center gap-1.5 disabled:opacity-50 px-2 py-1 rounded hover:bg-accent-purple/10"
                >
                  <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : 'group-hover:rotate-45'} transition-transform`} />
                  Test
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border">
              <button
                onClick={() => setView('list')}
                className="py-2 px-3 rounded-lg bg-background-tertiary text-foreground-secondary hover:text-foreground hover:bg-background-hover border border-border transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.endpoint}
                className="py-2 px-3 rounded-lg bg-accent-purple text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
