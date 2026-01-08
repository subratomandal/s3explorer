import { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Folder, Database, Download, Edit3, Trash2 } from 'lucide-react';
import * as api from './api';
import type { Bucket, S3Object, ToastState, ContextMenuState } from './types';
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
import { CommandPalette } from './components/CommandPalette';
import { LoginPage } from './components/LoginPage';
import { ConnectionManager } from './components/ConnectionManager';
import { WelcomeMessage } from './components/WelcomeMessage';
import type { Connection } from './api';

const STORAGE_KEYS = {
  THEME: 's3-explorer-theme',
};

export default function App() {
  // Auth state
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Connection state
  const [activeConnection, setActiveConnection] = useState<Connection | null>(null);
  const [showConnectionManager, setShowConnectionManager] = useState(false);

  // Bucket/Object state
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

  // Modal state
  const [showNewBucket, setShowNewBucket] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showRename, setShowRename] = useState<S3Object | null>(null);
  const [showDelete, setShowDelete] = useState<S3Object | null>(null);
  const [showDeleteBucket, setShowDeleteBucket] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const [theme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const status = await api.getAuthStatus();
      setAuthenticated(status.authenticated);
      if (status.authenticated) {
        loadActiveConnection();
      }
    } catch (err) {
      setAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  }

  async function loadActiveConnection() {
    try {
      const conn = await api.getActiveConnection();
      setActiveConnection(conn);
      if (conn) {
        loadBuckets();
      }
    } catch (err) {
      console.error('Failed to load active connection:', err);
    }
  }

  function handleLogin() {
    setAuthenticated(true);
    loadActiveConnection();
  }

  async function handleLogout() {
    try {
      await api.logout();
      setAuthenticated(false);
      setBuckets([]);
      setSelectedBucket(null);
      setObjects([]);
      setActiveConnection(null);
    } catch (err: any) {
      showToastMsg('Logout failed', 'error');
    }
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

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

  const showToastMsg = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  const loadBuckets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listBuckets();
      setBuckets(data);
    } catch (err: any) {
      if (err.message?.includes('No active S3 connection')) {
        setShowConnectionManager(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadObjects = useCallback(async () => {
    if (!selectedBucket) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.listObjects(selectedBucket, currentPath);
      setObjects(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedBucket, currentPath]);

  useEffect(() => { 
    if (selectedBucket && authenticated) loadObjects(); 
  }, [selectedBucket, currentPath, authenticated]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!selectedBucket || acceptedFiles.length === 0) return;
    try {
      setUploading(true);
      setUploadProgress(0);
      const interval = setInterval(() => setUploadProgress(p => Math.min(p + 10, 90)), 100);
      await api.uploadFiles(selectedBucket, currentPath, acceptedFiles);
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        loadObjects();
        showToastMsg(`${acceptedFiles.length} file${acceptedFiles.length > 1 ? 's' : ''} uploaded`);
      }, 400);
    } catch (err: any) {
      setError(err.message);
      setUploading(false);
      showToastMsg('Upload failed', 'error');
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
      showToastMsg(`Bucket "${name}" created`);
    } catch (err: any) {
      showToastMsg('Failed to create bucket', 'error');
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
      showToastMsg(`Bucket deleted`);
    } catch (err: any) {
      showToastMsg('Failed to delete bucket', 'error');
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
      showToastMsg('Download failed', 'error');
    }
  };

  const handleCreateFolder = async () => {
    if (!newName.trim() || !selectedBucket) return;
    try {
      await api.createFolder(selectedBucket, currentPath + newName.trim());
      setShowNewFolder(false);
      setNewName('');
      loadObjects();
      showToastMsg(`Folder created`);
    } catch (err: any) {
      showToastMsg('Failed to create folder', 'error');
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
      loadObjects();
      showToastMsg(`Renamed`);
    } catch (err: any) {
      showToastMsg('Rename failed', 'error');
    }
  };

  const handleDelete = async () => {
    if (!showDelete || !selectedBucket) return;
    try {
      await api.deleteObject(selectedBucket, showDelete.key, showDelete.isFolder);
      setShowDelete(null);
      loadObjects();
      showToastMsg(`Deleted`);
    } catch (err: any) {
      showToastMsg('Delete failed', 'error');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, obj: S3Object) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, object: obj });
  };

  const handleConnectionChange = () => {
    loadActiveConnection();
    loadBuckets();
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  // Loading state
  if (checkingAuth) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-foreground-muted">Loading...</div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Authenticated - show app
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
          activeConnectionName={activeConnection?.name}
          onOpenSidebar={() => setSidebarOpen(true)}
          onGoBack={handleGoBack}
          onNavigateToRoot={() => setCurrentPath('')}
          onNavigateToBreadcrumb={(i) => setCurrentPath(breadcrumbs.slice(0, i + 1).join('/') + '/')}
          onRefresh={() => loadObjects()}
          onNewFolder={() => setShowNewFolder(true)}
          onUpload={onDrop}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          onOpenConnections={() => setShowConnectionManager(true)}
          onLogout={handleLogout}
        />

        <ErrorBanner error={error} onDismiss={() => setError(null)} />
        <UploadProgress uploading={uploading} progress={uploadProgress} />
        <DropOverlay isDragActive={isDragActive} />

        <div className="flex-1 overflow-y-auto">
          {!activeConnection ? (
            <EmptyState
              icon={Database}
              title="No connection configured"
              description="Add an S3 connection to get started"
              action={
                <button
                  onClick={() => setShowConnectionManager(true)}
                  className="group mt-6 px-6 py-3 rounded-lg border border-dashed border-border text-foreground-secondary hover:text-accent-purple hover:border-accent-purple/50 hover:bg-accent-purple/5 transition-all text-sm font-medium"
                >
                  Add Connection
                </button>
              }
            />
          ) : !selectedBucket ? (
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

      <ConnectionManager
        isOpen={showConnectionManager}
        onClose={() => setShowConnectionManager(false)}
        onConnectionChange={handleConnectionChange}
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
        onRefresh={() => loadObjects()}
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

      {/* Welcome message for new users */}
      {!activeConnection && (
        <WelcomeMessage onConfigure={() => setShowConnectionManager(true)} />
      )}

      {/* GitHub link */}
      <a
        href="https://github.com/subratomandal"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 left-4 w-9 h-9 flex items-center justify-center rounded-full opacity-50 hover:opacity-100 hover:scale-105 transition-all duration-200 md:hidden"
        title="GitHub"
      >
        <svg className="w-9 h-9" viewBox="0 0 98 96" fill="currentColor">
          <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"/>
        </svg>
      </a>
    </div>
  );
}
