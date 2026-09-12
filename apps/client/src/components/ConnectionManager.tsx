import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Check, Server, ChevronDown, AlertCircle, RefreshCw, ChevronRight, Pencil } from 'lucide-react';
import * as api from '../api';
import type { Connection, ConnectionConfig } from '../api';
import { Modal } from './Modal';
import { useEscapeKey } from '../hooks/useEscapeKey';

// Provider Presets
const PROVIDERS = [
  { id: 'aws', name: 'Amazon S3', defaultRegion: 'us-east-1', defaultEndpoint: '' },
  { id: 'gcs', name: 'Google Cloud Storage', defaultRegion: 'auto', defaultEndpoint: 'https://storage.googleapis.com' },
  { id: 'cloudflare', name: 'Cloudflare R2', defaultRegion: 'auto', defaultEndpoint: 'https://<accountid>.r2.cloudflarestorage.com' },
  { id: 'digitalocean', name: 'DigitalOcean Spaces', defaultRegion: 'nyc3', defaultEndpoint: 'https://nyc3.digitaloceanspaces.com' },
  { id: 'railway', name: 'Railway Buckets', defaultRegion: 'us-west-1', defaultEndpoint: 'http://localhost:4444' },
  { id: 'minio', name: 'MinIO (Self-hosted)', defaultRegion: 'us-east-1', defaultEndpoint: 'http://localhost:9000' },
  { id: 'custom', name: 'Custom', defaultRegion: 'us-east-1', defaultEndpoint: '' },
];

// AWS S3 Regions (Complete list)
const AWS_REGIONS = [
  // US Regions
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-east-2', label: 'US East (Ohio)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  // Africa
  { value: 'af-south-1', label: 'Africa (Cape Town)' },
  // Asia Pacific
  { value: 'ap-east-1', label: 'Asia Pacific (Hong Kong)' },
  { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
  { value: 'ap-south-2', label: 'Asia Pacific (Hyderabad)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
  { value: 'ap-southeast-3', label: 'Asia Pacific (Jakarta)' },
  { value: 'ap-southeast-4', label: 'Asia Pacific (Melbourne)' },
  { value: 'ap-southeast-5', label: 'Asia Pacific (Malaysia)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
  { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)' },
  { value: 'ap-northeast-3', label: 'Asia Pacific (Osaka)' },
  // Canada
  { value: 'ca-central-1', label: 'Canada (Central)' },
  { value: 'ca-west-1', label: 'Canada West (Calgary)' },
  // Europe
  { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
  { value: 'eu-central-2', label: 'Europe (Zurich)' },
  { value: 'eu-west-1', label: 'Europe (Ireland)' },
  { value: 'eu-west-2', label: 'Europe (London)' },
  { value: 'eu-west-3', label: 'Europe (Paris)' },
  { value: 'eu-south-1', label: 'Europe (Milan)' },
  { value: 'eu-south-2', label: 'Europe (Spain)' },
  { value: 'eu-north-1', label: 'Europe (Stockholm)' },
  // Israel
  { value: 'il-central-1', label: 'Israel (Tel Aviv)' },
  // Middle East
  { value: 'me-south-1', label: 'Middle East (Bahrain)' },
  { value: 'me-central-1', label: 'Middle East (UAE)' },
  // South America
  { value: 'sa-east-1', label: 'South America (São Paulo)' },
];

// Cloudflare R2 Region
const R2_REGIONS = [
  { value: 'auto', label: 'Auto (Recommended)' },
  { value: 'wnam', label: 'Western North America' },
  { value: 'enam', label: 'Eastern North America' },
  { value: 'weur', label: 'Western Europe' },
  { value: 'eeur', label: 'Eastern Europe' },
  { value: 'apac', label: 'Asia Pacific' },
];

// Google Cloud Storage Regions
const GCS_REGIONS = [
  { value: 'auto', label: 'Auto (Recommended)' },
  { value: 'us-east1', label: 'US East (South Carolina)' },
  { value: 'us-central1', label: 'US Central (Iowa)' },
  { value: 'us-west1', label: 'US West (Oregon)' },
  { value: 'europe-west1', label: 'Europe West (Belgium)' },
  { value: 'asia-east1', label: 'Asia East (Taiwan)' },
];

// DigitalOcean Spaces Regions
const DO_REGIONS = [
  { value: 'nyc3', label: 'New York (NYC3)' },
  { value: 'sfo3', label: 'San Francisco (SFO3)' },
  { value: 'ams3', label: 'Amsterdam (AMS3)' },
  { value: 'sgp1', label: 'Singapore (SGP1)' },
  { value: 'fra1', label: 'Frankfurt (FRA1)' },
  { value: 'syd1', label: 'Sydney (SYD1)' },
  { value: 'blr1', label: 'Bangalore (BLR1)' },
];

// Generic regions for MinIO, Railway, Custom
const GENERIC_REGIONS = [
  { value: 'us-east-1', label: 'US East 1 (Default)' },
  { value: 'us-west-1', label: 'US West 1' },
  { value: 'eu-west-1', label: 'EU West 1' },
  { value: 'ap-southeast-1', label: 'AP Southeast 1' },
];

// Mirror of server-side isValidBucketName: DNS-safe S3 bucket name rules.
const BUCKET_NAME_RE = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
function validateBucketName(name: string, providerId: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return providerId === 'gcs' ? 'Required for Google Cloud Storage' : null;
  }
  if (!BUCKET_NAME_RE.test(trimmed) || trimmed.includes('..')) {
    return 'Lowercase letters, numbers, dots, hyphens; 3–63 chars';
  }
  return null;
}

// Sentinel <option> that swaps the region dropdown for a free-text input. Garage,
// Ceph, SeaweedFS and other self-hosted stacks use regions no preset list covers.
const CUSTOM_REGION = '__custom__';

// Mirror of server-side isValidRegion. SigV4 only embeds the region in the
// credential scope, so anything without slashes or whitespace is signable.
const REGION_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
function validateRegion(region: string): string | null {
  const trimmed = region.trim();
  if (!trimmed) return 'Region is required';
  if (!REGION_RE.test(trimmed)) return 'Letters, numbers, dots, hyphens; 1–64 chars';
  return null;
}

// Helper to get regions based on provider
function getRegionsForProvider(providerId: string) {
  switch (providerId) {
    case 'aws':
      return AWS_REGIONS;
    case 'gcs':
      return GCS_REGIONS;
    case 'cloudflare':
      return R2_REGIONS;
    case 'digitalocean':
      return DO_REGIONS;
    case 'minio':
    case 'railway':
    case 'custom':
    default:
      return GENERIC_REGIONS;
  }
}

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
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  useEscapeKey(() => setDeleteConfirm(null), deleteConfirm !== null);
  const [bucketTouched, setBucketTouched] = useState(false);
  const [customRegion, setCustomRegion] = useState(false);
  const [regionTouched, setRegionTouched] = useState(false);

  // Form State
  const [selectedProvider, setSelectedProvider] = useState<string>('custom');
  const [form, setForm] = useState<ConnectionConfig>({
    name: '',
    endpoint: '',
    accessKey: '',
    secretKey: '',
    region: 'us-east-1',
    forcePathStyle: true,
    bucket: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadConnections();
      setView('list');
      setError(null);
      setTestResult(null); // Reset test result when modal opens
    }
  }, [isOpen]);

  // Auto-dismiss test result after 3.5 seconds
  useEffect(() => {
    if (testResult) {
      const timer = setTimeout(() => setTestResult(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [testResult]);

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
      bucket: '',
    });
    setEditingId(null);
    setSelectedProvider('custom');
    setView('list');
    setTestResult(null);
    setError(null);
    setBucketTouched(false);
    setCustomRegion(false);
    setRegionTouched(false);
  }

  function handleProviderChange(providerId: string) {
    setSelectedProvider(providerId);
    setCustomRegion(false);
    const provider = PROVIDERS.find(p => p.id === providerId);
    if (provider) {
      setForm(prev => ({
        ...prev,
        region: provider.defaultRegion,
        endpoint: provider.defaultEndpoint,
        // Cloudflare/DO/MinIO often need path style
        forcePathStyle: providerId === 'minio' || providerId === 'railway' || providerId === 'gcs',
      }));
    }
  }

  function handleRegionChange(region: string) {
    if (region === CUSTOM_REGION) {
      setCustomRegion(true);
      setRegionTouched(false);
      setForm(prev => ({ ...prev, region: '' }));
      return;
    }
    setCustomRegion(false);
    // For DigitalOcean Spaces, update endpoint to match region
    if (selectedProvider === 'digitalocean') {
      setForm(prev => ({
        ...prev,
        region,
        endpoint: `https://${region}.digitaloceanspaces.com`,
      }));
    } else {
      setForm(prev => ({ ...prev, region }));
    }
  }

  async function handleTest() {
    setTesting(true);
    setError(null);
    setTestResult(null);
    try {
      const result = await api.testConnection({
        endpoint: form.endpoint,
        accessKey: form.accessKey,
        secretKey: form.secretKey,
        region: form.region,
        forcePathStyle: form.forcePathStyle,
        bucket: form.bucket || undefined,
      });
      setTestResult({ success: true, message: `Connection successful! Found ${result.bucketCount} bucket${result.bucketCount !== 1 ? 's' : ''}.` });
    } catch (err: any) {
      setTestResult({ success: false, message: `Connection failed: ${err.message}` });
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

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    try {
      await api.deleteConnection(deleteConfirm);
      await loadConnections();
      onConnectionChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleteConfirm(null);
    }
  }, [deleteConfirm, onConnectionChange]);

  function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    setDeleteConfirm(id);
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
      bucket: conn.bucket || '',
    });
    setEditingId(conn.id);
    setSelectedProvider('custom'); // Or try to infer from endpoint? Keeping simple for now.
    // A stored region the dropdown doesn't know (e.g. "garage") would otherwise
    // render as the first option while the form silently keeps the real value.
    setCustomRegion(!getRegionsForProvider('custom').some(r => r.value === conn.region));
    setRegionTouched(false);
    setView('form');
  }

  return (
    <>
      {/* Delete Confirmation Overlay - Full screen */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] modal-backdrop flex items-center justify-center p-4">
          <div className="bg-background-secondary border border-border rounded-lg p-5 max-w-sm w-full shadow-2xl animate-scaleIn">
            <h3 className="text-lg font-semibold text-foreground mb-3">Delete Connection</h3>
            <p className="text-sm text-foreground-secondary mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn btn-secondary flex-1"
                autoFocus
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="btn btn-danger flex-1"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={isOpen} onClose={onClose} title="Connection Manager" size="lg">
        <div className="relative flex flex-col">

          {error && (
            <div className="mb-4 p-3 bg-accent-red/15 rounded-md text-accent-red text-[13px] flex items-center gap-2 animate-fadeIn">
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
                  <div className="text-center py-6 border border-dashed border-border rounded-md bg-background hover:border-accent-purple/30 hover:bg-accent-purple/5 transition-all cursor-pointer group" onClick={() => { resetForm(); setView('form'); }}>
                    <Server className="w-8 h-8 mx-auto mb-2 text-foreground-muted group-hover:text-accent-purple transition-colors" />
                    <p className="text-foreground-secondary font-medium text-sm group-hover:text-accent-purple transition-colors">No connections</p>
                    <p className="text-foreground-muted text-xs mt-1">Click to add your first connection</p>
                  </div>
                ) : (
                  connections.map((conn) => (
                    <div
                      key={conn.id}
                      onClick={() => handleActivate(conn.id)}
                      className={`group relative flex items-center justify-between p-3 !rounded-md bg-background-tertiary transition-all cursor-pointer overflow-hidden ${conn.isActive ? 'ring-1 ring-accent-purple' : 'hover:bg-accent-purple/5'
                        }`}
                    >
                      {/* Left accent border */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg transition-colors ${conn.isActive ? 'bg-accent-purple' : 'bg-transparent group-hover:bg-accent-purple/50'}`} />

                      <div className="flex items-center gap-3 min-w-0 pl-2 flex-1">
                        <div className={`w-9 h-9 rounded-md flex-shrink-0 flex items-center justify-center transition-colors ${conn.isActive ? 'bg-accent-purple/20 text-accent-purple' : 'bg-background-hover text-foreground-muted group-hover:bg-accent-purple/10 group-hover:text-accent-purple'
                          }`}>
                          <Server className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium text-base sm:text-sm truncate transition-colors ${conn.isActive ? 'text-foreground' : 'text-foreground group-hover:text-accent-purple'}`}>
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
                            {conn.bucket && <span className="text-accent-purple"> / {conn.bucket}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => startEdit(e, conn)}
                          className="p-1.5 text-foreground-muted hover:text-accent-purple rounded transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
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
                  className="group w-full mt-3 py-2.5 px-4 rounded-md border border-dashed border-border text-foreground-secondary hover:text-accent-purple hover:border-accent-purple hover:bg-accent-purple/5 transition-all flex items-center justify-center gap-2 text-sm font-medium"
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
                  <label htmlFor="conn-provider" className="text-xs text-foreground-muted leading-none block">Provider</label>
                  <div className="relative">
                    <select
                      id="conn-provider"
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
                    <label htmlFor="conn-name" className="text-xs text-foreground-muted leading-none block">Profile Name</label>
                    <input
                      id="conn-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Production…"
                      className="input h-10 text-sm"
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between h-3">
                      <label htmlFor="conn-region" className="text-xs text-foreground-muted leading-none block">Region</label>
                      {customRegion && (
                        <button
                          type="button"
                          onClick={() => handleRegionChange(PROVIDERS.find(p => p.id === selectedProvider)?.defaultRegion || 'us-east-1')}
                          className="text-[11px] text-foreground-muted hover:text-accent-purple leading-none transition-colors"
                        >
                          Use list
                        </button>
                      )}
                    </div>
                    {customRegion ? (
                      <input
                        id="conn-region"
                        type="text"
                        value={form.region || ''}
                        onChange={(e) => { setRegionTouched(true); setForm({ ...form, region: e.target.value }); }}
                        onBlur={() => setRegionTouched(true)}
                        placeholder="e.g. garage"
                        className="input font-mono h-10 text-sm"
                        aria-invalid={!!(regionTouched && validateRegion(form.region || ''))}
                        autoFocus
                        autoComplete="off"
                        spellCheck="false"
                      />
                    ) : (
                      <div className="relative">
                        <select
                          id="conn-region"
                          value={form.region}
                          onChange={(e) => handleRegionChange(e.target.value)}
                          className="input appearance-none cursor-pointer pr-10 h-10 text-sm truncate"
                        >
                          {getRegionsForProvider(selectedProvider).map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                          <option value={CUSTOM_REGION}>Custom…</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-foreground-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    )}
                    {customRegion && regionTouched && validateRegion(form.region || '') && (
                      <p className="text-[11px] text-accent-red leading-tight">
                        {validateRegion(form.region || '')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Endpoint */}
                <div className="space-y-1.5">
                  <label htmlFor="conn-endpoint" className="text-xs text-foreground-muted leading-none block">S3 Endpoint</label>
                  <input
                    id="conn-endpoint"
                    type="url"
                    value={form.endpoint}
                    onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                    placeholder="https://s3.amazonaws.com…"
                    className="input font-mono h-9 text-sm"
                    autoComplete="off"
                    spellCheck="false"
                  />
                </div>

                {/* Bucket Name - required for single-bucket providers like GCS */}
                <div className="space-y-1.5">
                  <label htmlFor="conn-bucket" className="text-xs text-foreground-muted leading-none block">
                    Bucket Name {selectedProvider !== 'gcs' && <span className="opacity-50">(optional)</span>}
                  </label>
                  <input
                    id="conn-bucket"
                    type="text"
                    value={form.bucket || ''}
                    onChange={(e) => { setBucketTouched(true); setForm({ ...form, bucket: e.target.value }); }}
                    onBlur={() => setBucketTouched(true)}
                    placeholder={selectedProvider === 'gcs' ? 'my-bucket-name' : 'Leave empty to list all buckets'}
                    className="input h-9 text-sm"
                    aria-invalid={!!(bucketTouched && validateBucketName(form.bucket || '', selectedProvider))}
                    autoComplete="off"
                    spellCheck="false"
                  />
                  {bucketTouched && validateBucketName(form.bucket || '', selectedProvider) && (
                    <p className="text-[11px] text-accent-red leading-tight">
                      {validateBucketName(form.bucket || '', selectedProvider)}
                    </p>
                  )}
                </div>

                {/* Keys Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="conn-access-key" className="text-xs text-foreground-muted leading-none block">Access Key</label>
                    <input
                      id="conn-access-key"
                      type="text"
                      value={form.accessKey}
                      onChange={(e) => setForm({ ...form, accessKey: e.target.value })}
                      placeholder="AKIA…"
                      className="input font-mono h-10 text-sm"
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="conn-secret-key" className="text-xs text-foreground-muted leading-none block">Secret Key</label>
                    <input
                      id="conn-secret-key"
                      type="password"
                      value={form.secretKey}
                      onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
                      placeholder="••••••••"
                      className="input font-mono h-10 text-sm"
                      autoComplete="off"
                    />
                  </div>
                </div>

                {/* Path Style & Test */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${form.forcePathStyle
                        ? 'bg-accent-purple border-accent-purple'
                        : 'border-border bg-transparent group-hover:border-border-hover'
                        }`}
                      aria-hidden="true"
                    >
                      {form.forcePathStyle && <Check className="w-3 h-3 text-white" aria-hidden="true" />}
                    </span>
                    <input
                      type="checkbox"
                      checked={form.forcePathStyle}
                      onChange={(e) => setForm({ ...form, forcePathStyle: e.target.checked })}
                      className="sr-only"
                    />
                    <span className="text-xs text-foreground-muted leading-none group-hover:text-foreground transition-colors">Path-style URLs</span>
                  </label>

                  <button
                    onClick={handleTest}
                    disabled={testing || !form.endpoint || (!editingId && (!form.accessKey || !form.secretKey))}
                    className="group text-xs text-foreground-muted hover:text-accent-purple transition-colors flex items-center gap-1.5 disabled:opacity-50 px-2 py-1 rounded hover:bg-accent-purple/10"
                    aria-label="Test connection"
                  >
                    <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : 'group-hover:rotate-45'} transition-transform`} aria-hidden="true" />
                    {testing ? 'Testing…' : 'Test'}
                  </button>
                </div>

                {/* Test Result */}
                {testResult && (
                  <div
                    className={`p-3 rounded-md text-[13px] flex items-center gap-2 border border-border ${testResult.success
                      ? 'bg-accent-green/15 text-accent-green'
                      : 'bg-accent-red/15 text-accent-red'
                      }`}
                    role="status"
                    aria-live="polite"
                  >
                    {testResult.success ? (
                      <Check className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    )}
                    {testResult.message}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border">
                <button
                  onClick={() => { setView('list'); setTestResult(null); }}
                  className="py-2 px-3 rounded-md bg-background-tertiary text-foreground-secondary hover:text-foreground hover:bg-background-hover border border-border transition-all text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name || !form.endpoint || !!validateBucketName(form.bucket || '', selectedProvider) || !!validateRegion(form.region || '')}
                  className="py-2 px-3 rounded-md bg-accent-purple text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
