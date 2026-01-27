import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Folder, Database, Download, Edit3, Trash2 } from 'lucide-react';
import * as api from './api';
import type { Bucket, S3Object, ToastState, ContextMenuState } from './types';
import { getFileName } from './utils/fileUtils';
import { resolveUploadConflicts, generateUniqueName, hasNameConflict } from './utils/uniqueName';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { FileTable } from './components/FileTable';
import { EmptyState } from './components/EmptyState';
import { Toast } from './components/Toast';
import { ContextMenu, ContextMenuItem } from './components/ContextMenu';
import { UploadProgress } from './components/UploadProgress';
import { DropOverlay } from './components/DropOverlay';
import { ErrorBanner } from './components/ErrorBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CreateBucketModal } from './components/modals/CreateBucketModal';
import { CreateFolderModal } from './components/modals/CreateFolderModal';
import { RenameModal } from './components/modals/RenameModal';
import { DeleteModal } from './components/modals/DeleteModal';
import { DeleteBucketModal } from './components/modals/DeleteBucketModal';
import { PreviewModal } from './components/modals/PreviewModal';
import { CommandPalette } from './components/CommandPalette';
import { LoginPage } from './components/LoginPage';
import { SetupPage } from './components/SetupPage';
import { ConnectionManager } from './components/ConnectionManager';
import { WelcomeMessage } from './components/WelcomeMessage';
import { BatchActionsBar } from './components/BatchActionsBar';
import type { Connection } from './api';

const STORAGE_KEYS = {
  THEME: 's3-explorer-theme',
};

export default function App() {
  // Auth state
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Connection state
  const [activeConnection, setActiveConnection] = useState<Connection | null>(null);
  const [showConnectionManager, setShowConnectionManager] = useState(false);

  // Network status
  const networkStatus = useNetworkStatus();

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
  const [showPreview, setShowPreview] = useState<S3Object | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Selection state for batch operations
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const status = await api.getAuthStatus();
      setAuthenticated(status.authenticated);
      setConfigured(status.configured);
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
      // Cmd/Ctrl + U for upload
      if ((e.metaKey || e.ctrlKey) && e.key === 'u') {
        e.preventDefault();
        if (selectedBucket && fileInputRef.current) {
          fileInputRef.current.click();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBucket]);

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
  }, [selectedBucket, currentPath, authenticated, loadObjects]);

  // Browser history integration for folder navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state) {
        setSelectedBucket(state.bucket || null);
        setCurrentPath(state.path || '');
      } else {
        // No state means we're at the initial page
        setSelectedBucket(null);
        setCurrentPath('');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Push state when bucket or path changes (but not on initial load or popstate)
  const isInitialMount = useRef(true);
  const isPopState = useRef(false);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Replace initial state
      window.history.replaceState(
        { bucket: selectedBucket, path: currentPath },
        '',
        window.location.pathname
      );
      return;
    }

    if (isPopState.current) {
      isPopState.current = false;
      return;
    }

    // Push new state for user-initiated navigation
    window.history.pushState(
      { bucket: selectedBucket, path: currentPath },
      '',
      window.location.pathname
    );
  }, [selectedBucket, currentPath]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!selectedBucket || acceptedFiles.length === 0) return;

    // Check network status before upload
    if (!networkStatus.isOnline || !networkStatus.isBackendReachable) {
      showToastMsg('Cannot upload - check your connection', 'error');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Get existing file names in current folder to check for duplicates
      const existingNames = new Set(
        objects
          .filter(obj => !obj.isFolder)
          .map(obj => getFileName(obj.key))
      );

      // Resolve conflicts by generating unique names
      const renamedFiles = resolveUploadConflicts(acceptedFiles, existingNames);

      // Check if any files were renamed
      const renamedCount = Array.from(renamedFiles.entries())
        .filter(([file, newName]) => file.name !== newName).length;

      // Simulate progress while uploading (real progress would need XHR)
      const interval = setInterval(() => setUploadProgress(p => Math.min(p + 5, 85)), 200);

      await api.uploadFiles(selectedBucket, currentPath, acceptedFiles, renamedFiles);

      clearInterval(interval);
      setUploadProgress(100);

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        loadObjects();
        const msg = renamedCount > 0
          ? `${acceptedFiles.length} file${acceptedFiles.length > 1 ? 's' : ''} uploaded(${renamedCount} renamed)`
          : `${acceptedFiles.length} file${acceptedFiles.length > 1 ? 's' : ''} uploaded`;
        showToastMsg(msg);
      }, 400);
    } catch (err: any) {
      setUploadProgress(0);
      setUploading(false);

      // More specific error messages
      const errorMsg = err.code === 'NETWORK_ERROR'
        ? 'Upload failed - connection lost'
        : err.code === 'TIMEOUT'
          ? 'Upload timed out - file may be too large'
          : 'Upload failed';
      showToastMsg(errorMsg, 'error');
    }
  }, [selectedBucket, currentPath, loadObjects, objects, networkStatus.isOnline, networkStatus.isBackendReachable]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true });

  const handleCreateBucket = async () => {
    if (!newName.trim()) return;
    const name = newName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // Check if bucket already exists
    const existingBucketNames = new Set(buckets.map(b => b.name.toLowerCase()));
    if (existingBucketNames.has(name)) {
      showToastMsg(`Bucket "${name}" already exists`, 'error');
      return;
    }

    // Optimistic update - add bucket immediately
    const newBucket: Bucket = { name, creationDate: new Date().toISOString() };
    setBuckets(prev => [...prev, newBucket].sort((a, b) => a.name.localeCompare(b.name)));
    setShowNewBucket(false);
    setNewName('');

    try {
      await api.createBucket(name);
      // Select the bucket only after it's successfully created
      setSelectedBucket(name);
      showToastMsg(`Bucket "${name}" created`);
    } catch (err: any) {
      // Rollback on error
      setBuckets(prev => prev.filter(b => b.name !== name));
      setSelectedBucket(null);
      showToastMsg(err.message || 'Failed to create bucket', 'error');
    }
  };

  const handleDeleteBucket = async (name: string) => {
    // Optimistic update - remove bucket immediately
    const previousBuckets = buckets;
    setBuckets(prev => prev.filter(b => b.name !== name));

    if (selectedBucket === name) {
      setSelectedBucket(null);
      setObjects([]);
      setCurrentPath('');
    }

    try {
      await api.deleteBucket(name);
      showToastMsg(`Bucket deleted`);
    } catch (err: any) {
      // Rollback on error
      setBuckets(previousBuckets);
      showToastMsg(err.message || 'Failed to delete bucket', 'error');
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
      showToastMsg(err.message || 'Download failed', 'error');
    }
  };



  const closePreview = () => {
    setShowPreview(null);
    setPreviewUrl(null);
  };

  // Selection handlers for batch operations
  const handleSelect = useCallback((key: string, selected: boolean) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedKeys(new Set(objects.map(obj => obj.key)));
    } else {
      setSelectedKeys(new Set());
    }
  }, [objects]);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  // Clear selection when path or bucket changes
  useEffect(() => {
    clearSelection();
  }, [selectedBucket, currentPath, clearSelection]);

  // Batch delete handler
  const handleBatchDelete = async () => {
    if (selectedKeys.size === 0 || !selectedBucket) return;

    const objectsToDelete = objects.filter(obj => selectedKeys.has(obj.key));
    const keysToDelete = new Set(selectedKeys);

    // Optimistic update
    setObjects(prev => prev.filter(obj => !keysToDelete.has(obj.key)));
    clearSelection();

    try {
      const result = await api.deleteObjects(
        selectedBucket,
        objectsToDelete.map(obj => ({ key: obj.key, isFolder: obj.isFolder }))
      );

      if (result.failed.length > 0) {
        showToastMsg(`Deleted ${result.deleted.length}, ${result.failed.length} failed`, 'error');
        // Reload to get accurate state
        loadObjects();
      } else {
        showToastMsg(`Deleted ${result.deleted.length} items`);
      }
    } catch (err: any) {
      showToastMsg(err.message || 'Batch delete failed', 'error');
      loadObjects(); // Reload to restore state
    }
  };



  const handleCreateFolder = async () => {
    if (!newName.trim() || !selectedBucket) return;

    // Get existing names to check for duplicates
    const existingNames = new Set(objects.map(obj => getFileName(obj.key)));

    // Generate unique folder name if needed
    let folderName = newName.trim();
    if (hasNameConflict(folderName, existingNames)) {
      folderName = generateUniqueName(folderName, existingNames, true);
    }

    const folderKey = currentPath + folderName + '/';

    // Optimistic update - add folder immediately
    const newFolder: S3Object = {
      key: folderKey,
      size: 0,
      isFolder: true,
    };
    setObjects(prev => [...prev, newFolder].sort((a, b) => {
      // Folders first, then alphabetical
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.key.localeCompare(b.key);
    }));
    setShowNewFolder(false);
    setNewName('');

    try {
      await api.createFolder(selectedBucket, currentPath + folderName);
      const msg = folderName !== newName.trim()
        ? `Folder created as "${folderName}"`
        : `Folder created`;
      showToastMsg(msg);
    } catch (err: any) {
      // Rollback on error
      setObjects(prev => prev.filter(obj => obj.key !== folderKey));
      showToastMsg(err.message || 'Failed to create folder', 'error');
    }
  };

  const handleRename = async () => {
    if (!showRename || !newName.trim() || !selectedBucket) return;
    try {
      // Get existing names (excluding the item being renamed)
      const existingNames = new Set(
        objects
          .filter(obj => obj.key !== showRename.key)
          .map(obj => getFileName(obj.key))
      );

      // Generate unique name if there's a conflict
      let finalName = newName.trim();
      const originalName = finalName;
      if (hasNameConflict(finalName, existingNames)) {
        finalName = generateUniqueName(finalName, existingNames, showRename.isFolder);
      }

      let newKey: string;
      if (showRename.isFolder) {
        const pathParts = showRename.key.split('/').filter(Boolean);
        pathParts.pop();
        const parentPath = pathParts.length > 0 ? pathParts.join('/') + '/' : '';
        newKey = parentPath + finalName + '/';
      } else {
        const lastSlash = showRename.key.lastIndexOf('/');
        const dirPath = lastSlash >= 0 ? showRename.key.substring(0, lastSlash + 1) : '';
        newKey = dirPath + finalName;
      }
      await api.renameObject(selectedBucket, showRename.key, newKey);
      setShowRename(null);
      setNewName('');
      loadObjects();

      const msg = finalName !== originalName
        ? `Renamed to "${finalName}"`
        : `Renamed`;
      showToastMsg(msg);
    } catch (err: any) {
      showToastMsg(err.message || 'Rename failed', 'error');
    }
  };

  const handleDelete = async () => {
    if (!showDelete || !selectedBucket) return;

    // Optimistic update - remove object immediately
    const deletedObject = showDelete;
    const previousObjects = objects;
    setObjects(prev => prev.filter(obj => obj.key !== deletedObject.key));
    setShowDelete(null);

    try {
      await api.deleteObject(selectedBucket, deletedObject.key, deletedObject.isFolder);
      showToastMsg(`Deleted`);
    } catch (err: any) {
      // Rollback on error
      setObjects(previousObjects);
      showToastMsg(err.message || 'Delete failed', 'error');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, obj: S3Object) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, object: obj });
  };

  const handleConnectionChange = () => {
    // Reset state when switching connections
    setSelectedBucket(null);
    setCurrentPath('');
    setObjects([]);
    loadActiveConnection();
    loadBuckets();
  };

  const breadcrumbs = useMemo(() => currentPath.split('/').filter(Boolean), [currentPath]);

  // Loading state - use same background as app to prevent white flash
  if (checkingAuth) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-foreground-muted" aria-label="Loading application">
          <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    );
  }

  // Not configured - show setup wizard
  if (configured === false) {
    return <SetupPage onSetupComplete={() => {
      checkAuth();
      showToastMsg('Setup complete! Please log in.');
    }} />;
  }

  // Not authenticated - show login
  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Authenticated - show app
  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-accent-pink focus:text-foreground"
      >
        Skip to main content
      </a>

      <Sidebar
        buckets={buckets}
        selectedBucket={selectedBucket}
        searchQuery={searchQuery}
        loading={loading}
        sidebarOpen={sidebarOpen}
        activeConnectionName={activeConnection?.name}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSearchChange={setSearchQuery}
        onBucketSelect={(name) => { setSelectedBucket(name); setCurrentPath(''); setSidebarOpen(false); }}
        onNewBucket={() => { setNewName(''); setShowNewBucket(true); }}
        onDeleteBucket={(name) => setShowDeleteBucket(name)}
        onCloseSidebar={() => setSidebarOpen(false)}
        onNavigateHome={() => { setSelectedBucket(null); setCurrentPath(''); setSidebarOpen(false); }}
        onOpenConnections={() => setShowConnectionManager(true)}
        onLogout={handleLogout}
      />

      <main id="main-content" className="flex-1 flex flex-col min-w-0" tabIndex={-1} {...getRootProps()}>
        <input {...getInputProps()} />

        <Header
          selectedBucket={selectedBucket}
          currentPath={currentPath}
          loading={loading}
          onOpenSidebar={() => setSidebarOpen(true)}
          onGoBack={handleGoBack}
          onNavigateToRoot={() => setCurrentPath('')}
          onNavigateToBreadcrumb={(i) => setCurrentPath(breadcrumbs.slice(0, i + 1).join('/') + '/')}
          onRefresh={() => loadObjects()}
          onNewFolder={() => { setNewName(''); setShowNewFolder(true); }}
          onUpload={onDrop}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
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
                  className="group mt-6 px-6 py-3 rounded-lg border border-dashed border-border text-foreground-secondary hover:text-accent-purple hover:border-accent-purple hover:bg-accent-purple/5 transition-all text-sm font-medium"
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
              selectedKeys={selectedKeys}
              onNavigate={handleNavigate}
              onDownload={handleDownload}
              onContextMenu={handleContextMenu}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
            />
          )}
        </div>
      </main>

      {/* Live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {toast?.message}
      </div>

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
        onClose={() => { setNewName(''); setShowNewBucket(false); }}
        onCreate={handleCreateBucket}
      />

      <CreateFolderModal
        isOpen={showNewFolder}
        value={newName}
        onChange={setNewName}
        onClose={() => { setNewName(''); setShowNewFolder(false); }}
        onCreate={handleCreateFolder}
      />

      <RenameModal
        isOpen={!!showRename}
        value={newName}
        onChange={setNewName}
        onClose={() => { setNewName(''); setShowRename(null); }}
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

      <PreviewModal
        object={showPreview}
        previewUrl={previewUrl}
        onClose={closePreview}
        onDownload={() => {
          if (showPreview) {
            handleDownload(showPreview);
            closePreview();
          }
        }}
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
        onNewFolder={() => { setNewName(''); setShowNewFolder(true); }}
        onUpload={() => fileInputRef.current?.click()}
        onOpenConnections={() => setShowConnectionManager(true)}
        onNewBucket={() => { setNewName(''); setShowNewBucket(true); }}
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

      {/* Network status indicator */}
      <OfflineIndicator
        isOnline={networkStatus.isOnline}
        isBackendReachable={networkStatus.isBackendReachable}
      />

      {/* Batch actions bar */}
      <BatchActionsBar
        selectedCount={selectedKeys.size}
        onClearSelection={clearSelection}
        onDeleteSelected={handleBatchDelete}
      />
    </div>
  );
}
