import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Server, Edit2, ChevronDown, Globe, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
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
      <div className="min-h-[400px] flex flex-col">
        {error && (
          <div className="mb-4 p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg text-accent-red text-sm flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {view === 'list' ? (
          <div className="animate-fadeIn">
            <p className="text-foreground-secondary text-sm mb-6">
              Manage your S3-compatible storage connections.
            </p>

            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-foreground-muted">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  Loading...
                </div>
              ) : connections.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-lg bg-background">
                  <Server className="w-10 h-10 mx-auto mb-3 text-foreground-muted" />
                  <p className="text-foreground-secondary font-medium">No connections</p>
                  <p className="text-foreground-muted text-sm mt-1">Add your first connection to get started</p>
                </div>
              ) : (
                connections.map((conn, index) => (
                  <div
                    key={conn.id}
                    onClick={() => handleActivate(conn.id)}
                    className={`group relative flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer ${
                      conn.isActive
                        ? 'bg-accent-pink/10 border-accent-pink/30'
                        : 'bg-background border-border hover:border-border-hover hover:bg-background-hover'
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center ${
                        conn.isActive ? 'bg-accent-pink/20 text-accent-pink' : 'bg-background-tertiary text-foreground-muted'
                      }`}>
                        <Server className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm truncate ${conn.isActive ? 'text-foreground' : 'text-foreground-secondary'}`}>
                            {conn.name}
                          </span>
                          {conn.isActive && (
                            <span className="px-1.5 py-0.5 rounded bg-accent-pink/20 text-accent-pink text-[10px] font-semibold uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-foreground-muted font-mono truncate mt-0.5" title={conn.endpoint}>
                          {conn.endpoint || 'AWS S3'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startEdit(e, conn)}
                        className="btn btn-ghost btn-icon"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, conn.id)}
                        className="btn btn-ghost btn-icon text-accent-red hover:bg-accent-red/10"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <button
                onClick={() => { resetForm(); setView('form'); }}
                className="btn btn-secondary w-full justify-center"
              >
                <Plus className="w-4 h-4" />
                Add Connection
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col animate-fadeIn">
            <button
              onClick={() => setView('list')}
              className="flex items-center gap-1.5 text-foreground-muted hover:text-foreground text-sm mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <h3 className="text-base font-semibold text-foreground mb-5">
              {editingId ? 'Edit Connection' : 'New Connection'}
            </h3>

            <div className="space-y-4 flex-1 overflow-y-auto">
              {/* Provider Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Provider</label>
                <div className="relative">
                  <select
                    value={selectedProvider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="input appearance-none cursor-pointer pr-10"
                  >
                    {PROVIDERS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-foreground-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Profile Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Production, Staging, etc."
                  className="input"
                />
              </div>

              {/* Endpoint */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Endpoint</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={form.endpoint}
                    onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                    placeholder="https://s3.amazonaws.com"
                    className="input pl-10 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Keys Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Access Key</label>
                  <input
                    type="text"
                    value={form.accessKey}
                    onChange={(e) => setForm({ ...form, accessKey: e.target.value })}
                    placeholder="AKIA..."
                    className="input font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Secret Key</label>
                  <input
                    type="password"
                    value={form.secretKey}
                    onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
                    placeholder="••••••••"
                    className="input font-mono text-sm"
                  />
                </div>
              </div>

              {/* Region & Config */}
              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Region</label>
                  {selectedProvider === 'aws' ? (
                    <div className="relative">
                      <select
                        value={form.region}
                        onChange={(e) => setForm({ ...form, region: e.target.value })}
                        className="input appearance-none cursor-pointer pr-10"
                      >
                        {AWS_REGIONS.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-foreground-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={form.region}
                      onChange={(e) => setForm({ ...form, region: e.target.value })}
                      placeholder="us-east-1"
                      className="input"
                    />
                  )}
                </div>

                <label className="flex items-center gap-2.5 py-2.5 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                    form.forcePathStyle
                      ? 'bg-accent-pink border-accent-pink'
                      : 'border-border bg-transparent group-hover:border-border-hover'
                  }`}>
                    {form.forcePathStyle && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={form.forcePathStyle}
                    onChange={(e) => setForm({ ...form, forcePathStyle: e.target.checked })}
                    className="hidden"
                  />
                  <span className="text-sm text-foreground-secondary group-hover:text-foreground transition-colors">Path-style</span>
                </label>
              </div>
            </div>

            <div className="mt-6 pt-4 flex items-center justify-between border-t border-border">
              <button
                onClick={handleTest}
                disabled={testing || !form.endpoint || (!editingId && (!form.accessKey || !form.secretKey))}
                className="btn btn-ghost"
              >
                <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                Test
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setView('list')}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name || !form.endpoint}
                  className="btn btn-primary"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
