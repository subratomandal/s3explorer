// v 1.0
import { useState, useEffect, useCallback } from 'react';
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

  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

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
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        loadObjects();
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
      loadObjects();
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
      loadObjects();
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
      loadObjects();
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
      />

      <main className="flex-1 flex flex-col min-w-0" {...getRootProps()}>
        <input {...getInputProps()} />

        <Header
          selectedBucket={selectedBucket}
          currentPath={currentPath}
          loading={loading}
          onOpenSidebar={() => setSidebarOpen(true)}
          onGoBack={handleGoBack}
          onNavigateToRoot={() => setCurrentPath('')}
          onNavigateToBreadcrumb={(i) => setCurrentPath(breadcrumbs.slice(0, i + 1).join('/') + '/')}
          onRefresh={loadObjects}
          onNewFolder={() => setShowNewFolder(true)}
          onUpload={onDrop}
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
    </div>
  );
}
