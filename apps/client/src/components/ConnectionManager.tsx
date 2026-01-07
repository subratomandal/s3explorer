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
            <p className="text-foreground-secondary text-sm mb-4 sm:mb-5 leading-relaxed hidden sm:block">
              Manage your S3-compatible storage connections. Switch between staging, production, or different providers.
            </p>

            <div className="space-y-2 sm:space-y-3 max-h-[50vh] sm:max-h-[300px] overflow-y-auto -mx-1 px-1">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-foreground-muted">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  Loading...
                </div>
              ) : connections.length === 0 ? (
                <div className="text-center py-6 sm:py-8 border border-dashed border-border rounded-lg bg-background">
                  <Server className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-3 text-foreground-muted" />
                  <p className="text-foreground-secondary font-medium text-sm">No connections</p>
                  <p className="text-foreground-muted text-xs sm:text-sm mt-1">Add your first connection to get started</p>
                </div>
              ) : (
                connections.map((conn) => (
                  <div
                    key={conn.id}
                    onClick={() => handleActivate(conn.id)}
                    className={`group relative flex items-center justify-between p-3 sm:pr-4 rounded-lg bg-background-tertiary border border-dashed transition-all cursor-pointer overflow-hidden min-h-[60px] ${
                      conn.isActive ? 'border-accent-purple/50' : 'border-border hover:border-accent-purple/30'
                    }`}
                  >
                    {/* Left accent border */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${conn.isActive ? 'bg-accent-purple' : 'bg-transparent'}`} />

                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 pl-2 flex-1">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${
                        conn.isActive ? 'bg-accent-purple/20 text-accent-purple' : 'bg-background-hover text-foreground-muted'
                      }`}>
                        <Server className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground truncate max-w-[120px] sm:max-w-none">
                            {conn.name}
                          </span>
                          {conn.isActive && (
                            <span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium bg-accent-green/20 text-accent-green">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] sm:text-xs text-foreground-muted font-mono truncate mt-0.5 max-w-[140px] sm:max-w-none" title={conn.endpoint}>
                          {conn.endpoint || 'https://s3.amazonaws.com'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => startEdit(e, conn)}
                        className="p-2 sm:p-2 text-foreground-muted hover:text-accent-purple hover:bg-accent-purple/10 rounded-lg border border-dashed border-transparent hover:border-accent-purple/30 transition-colors"
                        title="Edit"
                      >
                        <Link className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, conn.id)}
                        className="p-2 sm:p-2 text-foreground-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg border border-dashed border-transparent hover:border-accent-red/30 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-foreground-muted ml-0.5 sm:ml-1 hidden sm:block" />
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => { resetForm(); setView('form'); }}
              className="w-full mt-3 sm:mt-4 py-3 px-4 rounded-lg border border-dashed border-border text-foreground-secondary hover:text-accent-purple hover:border-accent-purple/30 hover:bg-accent-purple/5 transition-all flex items-center justify-center gap-2 text-sm font-medium min-h-[48px]"
            >
              <Plus className="w-4 h-4" />
              Add Connection
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col animate-fadeIn">
            <p className="text-foreground-secondary text-sm mb-4 sm:mb-6 leading-relaxed hidden sm:block">
              Manage your S3-compatible storage connections. Switch between staging, production, or different providers.
            </p>

            <div className="space-y-3 sm:space-y-4 flex-1 overflow-y-auto max-h-[60vh] sm:max-h-none -mx-1 px-1">
              {/* Provider Selector */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-sm text-foreground-secondary">Storage Provider</label>
                <div className="relative">
                  <select
                    value={selectedProvider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="input appearance-none cursor-pointer pr-10 h-11 sm:h-auto text-base sm:text-sm"
                  >
                    {PROVIDERS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-foreground-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Profile Name */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-sm text-foreground-secondary">Profile Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Production, Staging, Local"
                  className="input h-11 sm:h-auto text-base sm:text-sm"
                />
              </div>

              {/* Endpoint */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-sm text-foreground-secondary">S3 Endpoint</label>
                <input
                  type="text"
                  value={form.endpoint}
                  onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                  placeholder="https://s3.amazonaws.com"
                  className="input font-mono h-11 sm:h-auto text-base sm:text-sm"
                />
              </div>

              {/* Keys Row - stacked on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-sm text-foreground-secondary">Access Key</label>
                  <input
                    type="text"
                    value={form.accessKey}
                    onChange={(e) => setForm({ ...form, accessKey: e.target.value })}
                    placeholder="AKIA..."
                    className="input font-mono h-11 sm:h-auto text-base sm:text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-sm text-foreground-secondary">Secret Key</label>
                  <input
                    type="password"
                    value={form.secretKey}
                    onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
                    placeholder="••••••••"
                    className="input font-mono h-11 sm:h-auto text-base sm:text-sm"
                  />
                </div>
              </div>

              {/* Region & Config - stacked on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 sm:items-end">
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-sm text-foreground-secondary">Region</label>
                  <div className="relative">
                    <select
                      value={form.region}
                      onChange={(e) => setForm({ ...form, region: e.target.value })}
                      className="input appearance-none cursor-pointer pr-10 h-11 sm:h-auto text-base sm:text-sm"
                    >
                      {AWS_REGIONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-foreground-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 min-h-[44px] sm:h-[42px] cursor-pointer group">
                  <div className={`w-6 h-6 sm:w-5 sm:h-5 rounded border flex items-center justify-center transition-all ${
                    form.forcePathStyle
                      ? 'bg-accent-purple border-accent-purple'
                      : 'border-border bg-transparent group-hover:border-border-hover'
                  }`}>
                    {form.forcePathStyle && <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={form.forcePathStyle}
                    onChange={(e) => setForm({ ...form, forcePathStyle: e.target.checked })}
                    className="hidden"
                  />
                  <span className="text-sm text-foreground-secondary group-hover:text-foreground transition-colors">Path-style URLs</span>
                </label>
              </div>

              {/* Test Connection */}
              <button
                onClick={handleTest}
                disabled={testing || !form.endpoint || (!editingId && (!form.accessKey || !form.secretKey))}
                className="text-sm text-foreground-muted hover:text-foreground transition-colors flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
              >
                <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                Test Connection
              </button>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 border-t border-border">
              <button
                onClick={() => setView('list')}
                className="py-3 px-3 sm:px-4 rounded-lg bg-background-tertiary text-foreground-secondary hover:text-foreground hover:bg-background-hover border border-border transition-all text-sm font-medium min-h-[48px]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.endpoint}
                className="py-3 px-3 sm:px-4 rounded-lg bg-accent-purple text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium min-h-[48px]"
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
