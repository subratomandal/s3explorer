import { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Database, Plus, Trash2, Server, Key, ChevronRight } from 'lucide-react';
import type { ConnectionProfile } from '../../types';

interface ConnectionManagerModalProps {
  isOpen: boolean;
  profiles: ConnectionProfile[];
  activeProfileId: string | null;
  onClose: () => void;
  onSave: (profiles: ConnectionProfile[]) => void;
  onConnect: (profileId: string) => void;
}

interface RegionOption {
  value: string;
  label: string;
}

interface RegionGroup {
  label: string;
  options: RegionOption[];
}

const REGION_GROUPS: RegionGroup[] = [
  {
    label: 'Railway',
    options: [
      { value: 'wnam', label: 'US West' },
      { value: 'enam', label: 'US East' },
      { value: 'weur', label: 'EU West' },
      { value: 'eeur', label: 'EU East' },
      { value: 'apac', label: 'Asia Pacific' },
      { value: 'oc', label: 'Oceania' },
    ]
  },
  {
    label: 'AWS',
    options: [
      { value: 'us-east-1', label: 'US East (N. Virginia)' },
      { value: 'us-east-2', label: 'US East (Ohio)' },
      { value: 'us-west-1', label: 'US West (N. California)' },
      { value: 'us-west-2', label: 'US West (Oregon)' },
      { value: 'eu-west-1', label: 'EU (Ireland)' },
      { value: 'eu-central-1', label: 'EU (Frankfurt)' },
      { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
      { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
      { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
      { value: 'sa-east-1', label: 'South America (São Paulo)' },
    ]
  },
  {
    label: 'Cloudflare R2',
    options: [
      { value: 'auto', label: 'Auto' },
      { value: 'wnam', label: 'Western North America' },
      { value: 'enam', label: 'Eastern North America' },
      { value: 'weur', label: 'Western Europe' },
      { value: 'eeur', label: 'Eastern Europe' },
      { value: 'apac', label: 'Asia Pacific' },
    ]
  },
  {
    label: 'DigitalOcean Spaces',
    options: [
      { value: 'nyc1', label: 'New York 1' },
      { value: 'nyc3', label: 'New York 3' },
      { value: 'ams3', label: 'Amsterdam 3' },
      { value: 'sgp1', label: 'Singapore 1' },
      { value: 'sfo3', label: 'San Francisco 3' },
    ]
  },
  {
    label: 'Self Hosted / Docker',
    options: [
      { value: 'auto', label: 'Auto (MinIO / Docker)' },
    ]
  }
];

const isKnownRegion = (region: string) => {
  if (!region) return false;
  return REGION_GROUPS.some(group => group.options.some(opt => opt.value === region));
};

export function ConnectionManagerModal({
  isOpen,
  profiles,
  activeProfileId,
  onClose,
  onSave,
  onConnect,
}: ConnectionManagerModalProps) {
  const [localProfiles, setLocalProfiles] = useState<ConnectionProfile[]>(profiles);
  const [editingProfile, setEditingProfile] = useState<ConnectionProfile | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isCustomRegion, setIsCustomRegion] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalProfiles(profiles);
      setEditingProfile(null);
      setShowForm(false);
    }
  }, [isOpen, profiles]);

  const createEmptyProfile = (): ConnectionProfile => ({
    id: crypto.randomUUID(),
    name: '',
    endpoint: '',
    accessKey: '',
    secretKey: '',
    region: 'us-east-1',
    forcePathStyle: true,
  });

  const handleAddNew = () => {
    const newProfile = createEmptyProfile();
    setEditingProfile(newProfile);
    setIsCustomRegion(!isKnownRegion(newProfile.region) && newProfile.region !== '');
    setShowForm(true);
  };

  const handleEdit = (profile: ConnectionProfile) => {
    setEditingProfile({ ...profile });
    setIsCustomRegion(!isKnownRegion(profile.region));
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const updated = localProfiles.filter(p => p.id !== id);
    setLocalProfiles(updated);
    onSave(updated);
  };

  const handleSaveProfile = () => {
    if (!editingProfile || !editingProfile.name.trim() || !editingProfile.endpoint.trim()) return;

    const exists = localProfiles.find(p => p.id === editingProfile.id);
    let updated: ConnectionProfile[];

    if (exists) {
      updated = localProfiles.map(p => p.id === editingProfile.id ? editingProfile : p);
    } else {
      updated = [...localProfiles, editingProfile];
    }

    setLocalProfiles(updated);
    onSave(updated);
    setEditingProfile(null);
    setShowForm(false);
  };

  const handleConnect = (profile: ConnectionProfile) => {
    onConnect(profile.id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal title="Connection Manager" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-foreground-secondary">
          Manage your S3-compatible storage connections. Switch between staging, production, or different providers.
        </p>

        {showForm && editingProfile ? (
          <div className="space-y-4 animate-fadeIn">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground-secondary mb-1.5">
                  Profile Name
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Production, Staging, Local"
                  value={editingProfile.name}
                  onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground-secondary mb-1.5">
                  S3 Endpoint
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="https://s3.amazonaws.com"
                  value={editingProfile.endpoint}
                  onChange={e => setEditingProfile({ ...editingProfile, endpoint: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-secondary mb-1.5">
                    Access Key
                  </label>
                  <input
                    type="text"
                    className="input font-mono text-sm"
                    placeholder="AKIA..."
                    value={editingProfile.accessKey}
                    onChange={e => setEditingProfile({ ...editingProfile, accessKey: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-secondary mb-1.5">
                    Secret Key
                  </label>
                  <input
                    type="password"
                    className="input font-mono text-sm"
                    placeholder="••••••••"
                    value={editingProfile.secretKey}
                    onChange={e => setEditingProfile({ ...editingProfile, secretKey: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-secondary mb-1.5">
                    Region
                  </label>
                  <select
                    className="input mb-2"
                    value={isCustomRegion ? 'custom' : editingProfile.region}
                    onChange={e => {
                      const value = e.target.value;
                      if (value === 'custom') {
                        setIsCustomRegion(true);
                        // Convert to empty or keep existing if it was already custom-ish? 
                        // Let's keep existing if it's not in the list, otherwise clear it to prompt entry
                        if (isKnownRegion(editingProfile.region)) {
                          setEditingProfile({ ...editingProfile, region: '' });
                        }
                      } else {
                        setIsCustomRegion(false);
                        setEditingProfile({ ...editingProfile, region: value });
                      }
                    }}
                  >
                    {REGION_GROUPS.map(group => (
                      <optgroup key={group.label} label={group.label}>
                        {group.options.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="custom">Custom</option>
                  </select>

                  {isCustomRegion && (
                    <input
                      type="text"
                      className="input animate-fadeIn"
                      placeholder="e.g. us-gov-west-1"
                      value={editingProfile.region}
                      onChange={e => setEditingProfile({ ...editingProfile, region: e.target.value })}
                      autoFocus
                    />
                  )}
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg hover:bg-background-hover transition-colors">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border accent-accent-pink"
                      checked={editingProfile.forcePathStyle}
                      onChange={e => setEditingProfile({ ...editingProfile, forcePathStyle: e.target.checked })}
                    />
                    <span className="text-sm text-foreground-secondary">Path-style URLs</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setShowForm(false); setEditingProfile(null); }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="btn btn-primary flex-1"
                disabled={!editingProfile.name.trim() || !editingProfile.endpoint.trim()}
              >
                Save Profile
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {localProfiles.length > 0 ? (
              <div className="space-y-2">
                {localProfiles.map((profile, index) => (
                  <div
                    key={profile.id}
                    className="group relative flex items-center gap-3 p-3 rounded-lg border border-border hover:border-border-hover bg-background-secondary hover:bg-background-tertiary transition-all cursor-pointer stagger-item"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => handleConnect(profile)}
                  >
                    {activeProfileId === profile.id && (
                      <div className="absolute -left-px top-1/2 -translate-y-1/2 w-1 h-8 bg-accent-pink rounded-r" />
                    )}

                    <div className={`flex-shrink-0 p-2 rounded-lg ${activeProfileId === profile.id ? 'bg-accent-pink/20' : 'bg-background-hover'}`}>
                      <Server className={`w-4 h-4 ${activeProfileId === profile.id ? 'text-accent-pink' : 'text-foreground-secondary'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{profile.name}</span>
                        {activeProfileId === profile.id && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-medium bg-accent-green/20 text-accent-green rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground-muted truncate">{profile.endpoint}</p>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(profile); }}
                        className="btn btn-ghost btn-icon"
                        title="Edit"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(profile.id); }}
                        className="btn btn-ghost btn-icon text-accent-red hover:bg-accent-red/10"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <ChevronRight className="flex-shrink-0 w-4 h-4 text-foreground-muted group-hover:text-foreground-secondary transition-colors" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Database className="w-10 h-10 text-foreground-muted mx-auto mb-3" />
                <p className="text-sm text-foreground-secondary">No connection profiles yet</p>
                <p className="text-xs text-foreground-muted mt-1">Add a profile to connect to your S3 buckets</p>
              </div>
            )}

            <button
              onClick={handleAddNew}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-border hover:border-accent-pink hover:bg-accent-pink/5 transition-all text-foreground-secondary hover:text-accent-pink"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add Connection</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
