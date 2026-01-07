export interface Bucket {
  name: string;
  creationDate?: string;
}

export interface S3Object {
  key: string;
  size: number;
  lastModified?: string;
  isFolder: boolean;
}

export interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export interface ContextMenuState {
  x: number;
  y: number;
  object: S3Object;
}

export interface CommandAction {
  id: string;
  label: string;
  shortcut?: string;
  category: 'navigation' | 'actions' | 'buckets' | 'connections';
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}
