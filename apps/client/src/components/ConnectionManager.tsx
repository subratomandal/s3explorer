import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Database, Edit2, X, RefreshCw } from 'lucide-react';
import * as api from '../api';
import type { Connection, ConnectionConfig } from '../api';
import { Modal } from './Modal';

interface ConnectionManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionChange: () => void;
}

export function ConnectionManager({ isOpen, onClose, onConnectionChange }: ConnectionManagerProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);

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
    }
  }, [isOpen]);

  async function loadConnections() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listConnections();
      setConnections(data);
    } catch (err: any) {
      setError(err.message);
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
    setShowAddForm(false);
    setEditingId(null);
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
      setError(err.message);
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setError(null);
    try {
      if (editingId) {
        await api.updateConnection(editingId, form);
      } else {
        await api.createConnection(form);
      }
      resetForm();
      loadConnections();
      onConnectionChange();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this connection?')) return;
    try {
      await api.deleteConnection(id);
      loadConnections();
      onConnectionChange();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleActivate(id: number) {
    try {
      await api.activateConnection(id);
      loadConnections();
      onConnectionChange();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDisconnect() {
    try {
      await api.disconnectConnection();
      loadConnections();
      onConnectionChange();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function startEdit(conn: Connection) {
    setForm({
      name: conn.name,
      endpoint: conn.endpoint,
      accessKey: '',
      secretKey: '',
      region: conn.region,
      forcePathStyle: conn.forcePathStyle,
    });
    setEditingId(conn.id);
    setShowAddForm(true);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="S3 Connections" size="lg">
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {!showAddForm && (
          <>
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Connection
              </button>
              
              {connections.some(c => c.isActive) && (
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                >
                  Disconnect
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : connections.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No connections configured</p>
                <p className="text-sm">Add your first S3 connection</p>
              </div>
            ) : (
              <div className="space-y-2">
                {connections.map(conn => (
                  <div
                    key={conn.id}
                    className={`p-4 rounded-lg border ${
                      conn.isActive
                        ? 'bg-green-900/20 border-green-700'
                        : 'bg-gray-800 border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {conn.isActive && (
                          <Check className="w-5 h-5 text-green-500" />
                        )}
                        <div>
                          <h3 className="font-medium text-white">{conn.name}</h3>
                          <p className="text-sm text-gray-400">{conn.endpoint}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!conn.isActive && (
                          <button
                            onClick={() => handleActivate(conn.id)}
                            className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-green-400"
                            title="Activate"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(conn)}
                          className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(conn.id)}
                          className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {showAddForm && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white">
                {editingId ? 'Edit Connection' : 'New Connection'}
              </h3>
              <button
                onClick={resetForm}
                className="p-1 hover:bg-gray-700 rounded text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="My S3 Connection"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Endpoint</label>
                <input
                  type="text"
                  value={form.endpoint}
                  onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="https://s3.amazonaws.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Access Key</label>
                  <input
                    type="text"
                    value={form.accessKey}
                    onChange={(e) => setForm({ ...form, accessKey: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder={editingId ? '(unchanged)' : 'AKIA...'}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Secret Key</label>
                  <input
                    type="password"
                    value={form.secretKey}
                    onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder={editingId ? '(unchanged)' : 'Secret key'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Region</label>
                  <input
                    type="text"
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="us-east-1"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.forcePathStyle}
                      onChange={(e) => setForm({ ...form, forcePathStyle: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700"
                    />
                    <span className="ml-2 text-sm text-gray-300">Path-style URLs</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleTest}
                disabled={testing || !form.endpoint || (!editingId && (!form.accessKey || !form.secretKey))}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg"
              >
                <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                Test
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name || !form.endpoint || (!editingId && (!form.accessKey || !form.secretKey))}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg"
              >
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
