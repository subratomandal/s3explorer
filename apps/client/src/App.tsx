import { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Folder, Database, Download, Edit3, Trash2, Heart, X } from 'lucide-react';
import * as api from './api';
import type { Bucket, S3Object, ToastState, ContextMenuState, ConnectionProfile } from './types';
import { getFileName } from './utils/fileUtils';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { FileTable } from './components/FileTable';
import { EmptyState } from './components/EmptyState';
import { Toast } from './components/Toast';
import { ContextMenu, ContextMenuItem } from './components/ContextMenu';
import { UploadProgress } from './components/UploadProgress';
import { DropOverlay } from './components/DropOverlay';
import { ErrorBanner } from './components/ErrorBanner';
import { CreateBucketModal } from './components/modals/CreateBucketModal';
import { CreateFolderModal } from './components/modals/CreateFolderModal';
import { RenameModal } from './components/modals/RenameModal';
import { DeleteModal } from './components/modals/DeleteModal';
import { DeleteBucketModal } from './components/modals/DeleteBucketModal';
import { ConnectionManagerModal } from './components/modals/ConnectionManagerModal';
import { CommandPalette } from './components/CommandPalette';

const STORAGE_KEYS = {
  PROFILES: 'railway-bucket-explorer-profiles',
  ACTIVE_PROFILE: 'railway-bucket-explorer-active-profile',
  THEME: 'railway-bucket-explorer-theme',
  WELCOME_SHOWN: 'railway-bucket-explorer-welcome-shown',
};

export default function App() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showNewBucket, setShowNewBucket] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showRename, setShowRename] = useState<S3Object | null>(null);
  const [showDelete, setShowDelete] = useState<S3Object | null>(null);
  const [showDeleteBucket, setShowDeleteBucket] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const [showConnectionManager, setShowConnectionManager] = useState(false);
  const [connectionProfiles, setConnectionProfiles] = useState<ConnectionProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE);
  });

  const [folderCache, setFolderCache] = useState<Record<string, S3Object[]>>({});

  const getCacheKey = (bucket: string, path: string) => `${bucket}:${path}`;

  const invalidateCache = useCallback((bucket: string, path: string) => {
    setFolderCache(prev => {
      const next = { ...prev };
      delete next[getCacheKey(bucket, path)];
      return next;
    });
  }, []);

  const [theme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem(STORAGE_KEYS.WELCOME_SHOWN);
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem(STORAGE_KEYS.WELCOME_SHOWN, 'true');
  };

  const openConnectionsFromWelcome = () => {
    dismissWelcome();
    setShowConnectionManager(true);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  const saveProfiles = useCallback((profiles: ConnectionProfile[]) => {
    setConnectionProfiles(profiles);
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  }, []);

  const handleConnectProfile = useCallback(async (profileId: string) => {
    const profile = connectionProfiles.find(p => p.id === profileId);
    if (!profile) return;

    try {
      await api.connectToS3({
        endpoint: profile.endpoint,
        accessKey: profile.accessKey,
        secretKey: profile.secretKey,
        region: profile.region,
        forcePathStyle: profile.forcePathStyle,
      });

      setActiveProfileId(profileId);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, profileId);

      setSelectedBucket(null);
      setObjects([]);
      setCurrentPath('');
      await loadBuckets();

      showToast(`Connected to ${profile.name}`);
    } catch (err: any) {
      showToast(`Connection failed: ${err.message}`, 'error');
    }
  }, [connectionProfiles]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setShowConnectionManager(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadBuckets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listBuckets();
      setBuckets(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadObjects = useCallback(async (refresh = false) => {
    if (!selectedBucket) return;
    const cacheKey = getCacheKey(selectedBucket, currentPath);

    if (!refresh && folderCache[cacheKey]) {
      setObjects(folderCache[cacheKey]);
      return;
    }

    try {
      setLoading(!refresh && !folderCache[cacheKey]); // Only show loading if no cache or force refresh
      setError(null);
      const data = await api.listObjects(selectedBucket, currentPath);
      setObjects(data);
      setFolderCache(prev => ({ ...prev, [cacheKey]: data }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedBucket, currentPath, folderCache]);

  useEffect(() => { loadBuckets(); }, [loadBuckets]);
  useEffect(() => { if (selectedBucket) loadObjects(); }, [selectedBucket, currentPath, loadObjects]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!selectedBucket || acceptedFiles.length === 0) return;
    try {
      setUploading(true);
      setUploadProgress(0);
      const interval = setInterval(() => setUploadProgress(p => Math.min(p + 10, 90)), 100);
      await api.uploadFiles(selectedBucket, currentPath, acceptedFiles);
      clearInterval(interval);
      setUploadProgress(100);
      invalidateCache(selectedBucket, currentPath);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        loadObjects(true);
        showToast(`${acceptedFiles.length} file${acceptedFiles.length > 1 ? 's' : ''} uploaded`);
      }, 400);
    } catch (err: any) {
      setError(err.message);
      setUploading(false);
      showToast('Upload failed', 'error');
    }
  }, [selectedBucket, currentPath, loadObjects]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true });

  const handleCreateBucket = async () => {
    if (!newName.trim()) return;
    const name = newName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    try {
      await api.createBucket(name);
      setShowNewBucket(false);
      setNewName('');
      loadBuckets();
      setSelectedBucket(name);
      showToast(`Bucket "${name}" created`);
    } catch (err: any) {
      showToast('Failed to create bucket', 'error');
    }
  };

  const handleDeleteBucket = async (name: string) => {
    try {
      await api.deleteBucket(name);
      if (selectedBucket === name) {
        setSelectedBucket(null);
        setObjects([]);
        setCurrentPath('');
      }
      loadBuckets();
      showToast(`Bucket deleted`);
    } catch (err: any) {
      showToast('Failed to delete bucket', 'error');
    }
  };

  const handleNavigate = (obj: S3Object) => {
    if (obj.isFolder) setCurrentPath(obj.key);
  };

  const handleGoBack = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length ? parts.join('/') + '/' : '');
  };

  const handleDownload = async (obj: S3Object) => {
    try {
      const url = await api.getDownloadUrl(selectedBucket!, obj.key);
      window.open(url, '_blank');
    } catch (err: any) {
      showToast('Download failed', 'error');
    }
  };

  const handleCreateFolder = async () => {
    if (!newName.trim() || !selectedBucket) return;
    try {
      await api.createFolder(selectedBucket, currentPath + newName.trim());
      setShowNewFolder(false);
      setNewName('');
      setNewName('');
      invalidateCache(selectedBucket, currentPath);
      loadObjects(true);
      showToast(`Folder created`);
    } catch (err: any) {
      showToast('Failed to create folder', 'error');
    }
  };

  const handleRename = async () => {
    if (!showRename || !newName.trim() || !selectedBucket) return;
    try {
      let newKey: string;
      if (showRename.isFolder) {
        const pathParts = showRename.key.split('/').filter(Boolean);
        pathParts.pop();
        const parentPath = pathParts.length > 0 ? pathParts.join('/') + '/' : '';
        newKey = parentPath + newName.trim() + '/';
      } else {
        const lastSlash = showRename.key.lastIndexOf('/');
        const dirPath = lastSlash >= 0 ? showRename.key.substring(0, lastSlash + 1) : '';
        newKey = dirPath + newName.trim();
      }
      await api.renameObject(selectedBucket, showRename.key, newKey);
      setShowRename(null);
      setNewName('');
      setNewName('');
      invalidateCache(selectedBucket, currentPath); // Invalidate current path (where rename happened)
      // Note: Ideally we should invalidate the parent of the old key too if it was a move,
      // but simplistic invalidation of current view covers most UX needs for now.
      loadObjects(true);
      showToast(`Renamed`);
    } catch (err: any) {
      showToast('Rename failed', 'error');
    }
  };

  const handleDelete = async () => {
    if (!showDelete || !selectedBucket) return;
    try {
      await api.deleteObject(selectedBucket, showDelete.key, showDelete.isFolder);
      setShowDelete(null);
      setShowDelete(null);
      invalidateCache(selectedBucket, currentPath);
      loadObjects(true);
      showToast(`Deleted`);
    } catch (err: any) {
      showToast('Delete failed', 'error');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, obj: S3Object) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, object: obj });
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <Sidebar
        buckets={buckets}
        selectedBucket={selectedBucket}
        searchQuery={searchQuery}
        loading={loading}
        sidebarOpen={sidebarOpen}
        onSearchChange={setSearchQuery}
        onBucketSelect={(name) => { setSelectedBucket(name); setCurrentPath(''); setSidebarOpen(false); }}
        onNewBucket={() => setShowNewBucket(true)}
        onDeleteBucket={(name) => setShowDeleteBucket(name)}
        onCloseSidebar={() => setSidebarOpen(false)}
        onNavigateHome={() => { setSelectedBucket(null); setCurrentPath(''); setSidebarOpen(false); }}
      />

      <main className="flex-1 flex flex-col min-w-0" {...getRootProps()}>
        <input {...getInputProps()} />

        <Header
          selectedBucket={selectedBucket}
          currentPath={currentPath}
          loading={loading}
          activeConnectionName={connectionProfiles.find(p => p.id === activeProfileId)?.name}
          onOpenSidebar={() => setSidebarOpen(true)}
          onGoBack={handleGoBack}
          onNavigateToRoot={() => setCurrentPath('')}
          onNavigateToBreadcrumb={(i) => setCurrentPath(breadcrumbs.slice(0, i + 1).join('/') + '/')}
          onRefresh={() => loadObjects(true)}
          onNewFolder={() => setShowNewFolder(true)}
          onUpload={onDrop}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          onOpenConnections={() => setShowConnectionManager(true)}
        />

        <ErrorBanner error={error} onDismiss={() => setError(null)} />
        <UploadProgress uploading={uploading} progress={uploadProgress} />
        <DropOverlay isDragActive={isDragActive} />

        <div className="flex-1 overflow-y-auto">
          {!selectedBucket ? (
            <EmptyState icon={Database} title="No bucket selected" description="Select a bucket from the sidebar" />
          ) : objects.length === 0 && !loading ? (
            <EmptyState icon={Folder} title="Empty folder" description="Drop files here to upload" />
          ) : (
            <FileTable
              objects={objects}
              loading={loading}
              onNavigate={handleNavigate}
              onDownload={handleDownload}
              onContextMenu={handleContextMenu}
            />
          )}
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}>
          {!contextMenu.object.isFolder && (
            <ContextMenuItem
              icon={Download}
              label="Download"
              onClick={() => { handleDownload(contextMenu.object); setContextMenu(null); }}
            />
          )}
          <ContextMenuItem
            icon={Edit3}
            label="Rename"
            onClick={() => { setShowRename(contextMenu.object); setNewName(getFileName(contextMenu.object.key)); setContextMenu(null); }}
          />
          <ContextMenuItem
            icon={Trash2}
            label="Delete"
            danger
            onClick={() => { setShowDelete(contextMenu.object); setContextMenu(null); }}
          />
        </ContextMenu>
      )}

      <CreateBucketModal
        isOpen={showNewBucket}
        value={newName}
        onChange={setNewName}
        onClose={() => setShowNewBucket(false)}
        onCreate={handleCreateBucket}
      />

      <CreateFolderModal
        isOpen={showNewFolder}
        value={newName}
        onChange={setNewName}
        onClose={() => setShowNewFolder(false)}
        onCreate={handleCreateFolder}
      />

      <RenameModal
        isOpen={!!showRename}
        value={newName}
        onChange={setNewName}
        onClose={() => setShowRename(null)}
        onRename={handleRename}
      />

      <DeleteModal
        object={showDelete}
        onClose={() => setShowDelete(null)}
        onDelete={handleDelete}
      />

      <DeleteBucketModal
        bucketName={showDeleteBucket}
        onClose={() => setShowDeleteBucket(null)}
        onDelete={() => { handleDeleteBucket(showDeleteBucket!); setShowDeleteBucket(null); }}
      />

      <ConnectionManagerModal
        isOpen={showConnectionManager}
        profiles={connectionProfiles}
        activeProfileId={activeProfileId}
        onClose={() => setShowConnectionManager(false)}
        onSave={saveProfiles}
        onConnect={handleConnectProfile}
      />

      <CommandPalette
        isOpen={showCommandPalette}
        buckets={buckets}
        selectedBucket={selectedBucket}
        currentPath={currentPath}
        onClose={() => setShowCommandPalette(false)}
        onSelectBucket={(name) => { setSelectedBucket(name); setCurrentPath(''); }}
        onNavigateToRoot={() => setCurrentPath('')}
        onGoBack={handleGoBack}
        onRefresh={() => loadObjects(true)}
        onNewFolder={() => setShowNewFolder(true)}
        onUpload={() => fileInputRef.current?.click()}
        onOpenConnections={() => setShowConnectionManager(true)}
        onNewBucket={() => setShowNewBucket(true)}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            onDrop(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />

      {/* Welcome popup for first-time users */}
      {showWelcome && (
        <div className="fixed bottom-5 right-4 w-80 bg-background-secondary border border-border rounded-xl shadow-2xl animate-fadeIn z-50">
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <img src="/logo.svg" alt="" className="w-8 h-8 invert" />
                <h3 className="font-semibold text-sm">Welcome!</h3>
              </div>
              <button
                onClick={dismissWelcome}
                className="p-1 hover:bg-background-hover rounded transition-colors"
              >
                <X className="w-4 h-4 text-foreground-muted" />
              </button>
            </div>
            <p className="text-sm text-foreground-secondary mb-4">
              Configure your S3 credentials in the Connection Manager to get started.
            </p>
            <button
              onClick={openConnectionsFromWelcome}
              className="w-full btn btn-primary text-sm"
            >
              Open Connection Manager
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <a
        href="https://github.com/subratomandalme/railway-bucket-explorer"
        target="_blank"
        rel="noopener noreferrer"
        className="group fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-2 text-xs text-foreground-muted hover:text-foreground bg-background-secondary/80 backdrop-blur border border-border hover:border-border-hover rounded-full transition-all"
      >
        <span>Made with</span>
        <Heart className="w-3 h-3 text-foreground-muted group-hover:text-accent-pink transition-colors" />
        <span>by Subrato</span>
      </a>
    </div>
  );
}
