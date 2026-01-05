import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  Database,
  FolderPlus,
  Upload,
  RefreshCw,
  Settings,
  ArrowLeft,
  Home,
  ChevronRight,
  Command,
} from 'lucide-react';
import type { Bucket, CommandAction } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  buckets: Bucket[];
  selectedBucket: string | null;
  currentPath: string;
  onClose: () => void;
  onSelectBucket: (name: string) => void;
  onNavigateToRoot: () => void;
  onGoBack: () => void;
  onRefresh: () => void;
  onNewFolder: () => void;
  onUpload: () => void;
  onOpenConnections: () => void;
  onNewBucket: () => void;
}

export function CommandPalette({
  isOpen,
  buckets,
  selectedBucket,
  currentPath,
  onClose,
  onSelectBucket,
  onNavigateToRoot,
  onGoBack,
  onRefresh,
  onNewFolder,
  onUpload,
  onOpenConnections,
  onNewBucket,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const actions = useMemo<CommandAction[]>(() => {
    const items: CommandAction[] = [];

    if (currentPath) {
      items.push({
        id: 'go-back',
        label: 'Go Back',
        category: 'navigation',
        icon: ArrowLeft,
        onSelect: () => { onGoBack(); onClose(); },
      });
      items.push({
        id: 'go-root',
        label: 'Go to Root',
        category: 'navigation',
        icon: Home,
        onSelect: () => { onNavigateToRoot(); onClose(); },
      });
    }

    if (selectedBucket) {
      items.push({
        id: 'refresh',
        label: 'Refresh',
        category: 'actions',
        icon: RefreshCw,
        onSelect: () => { onRefresh(); onClose(); },
      });
      items.push({
        id: 'new-folder',
        label: 'New Folder',
        category: 'actions',
        icon: FolderPlus,
        onSelect: () => { onNewFolder(); onClose(); },
      });
      items.push({
        id: 'upload',
        label: 'Upload Files',
        category: 'actions',
        icon: Upload,
        onSelect: () => { onUpload(); onClose(); },
      });
    }

    items.push({
      id: 'new-bucket',
      label: 'Create Bucket',
      category: 'actions',
      icon: Database,
      onSelect: () => { onNewBucket(); onClose(); },
    });

    items.push({
      id: 'connections',
      label: 'Connection Manager',
      category: 'connections',
      icon: Settings,
      onSelect: () => { onOpenConnections(); onClose(); },
    });

    buckets.forEach(bucket => {
      items.push({
        id: `bucket-${bucket.name}`,
        label: bucket.name,
        category: 'buckets',
        icon: Database,
        onSelect: () => { onSelectBucket(bucket.name); onClose(); },
      });
    });

    return items;
  }, [buckets, selectedBucket, currentPath, onGoBack, onNavigateToRoot, onRefresh, onNewFolder, onUpload, onOpenConnections, onNewBucket, onSelectBucket, onClose]);

  const filteredActions = useMemo(() => {
    if (!query.trim()) return actions;
    const lowerQuery = query.toLowerCase();
    return actions.filter(action =>
      action.label.toLowerCase().includes(lowerQuery) ||
      action.category.toLowerCase().includes(lowerQuery)
    );
  }, [actions, query]);

  const groupedActions = useMemo(() => {
    const groups: Record<string, CommandAction[]> = {};
    filteredActions.forEach(action => {
      if (!groups[action.category]) {
        groups[action.category] = [];
      }
      groups[action.category].push(action);
    });
    return groups;
  }, [filteredActions]);

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    actions: 'Actions',
    buckets: 'Buckets',
    connections: 'Connections',
  };

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const selectedEl = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredActions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].onSelect();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredActions, selectedIndex, onClose]);

  const flatList = useMemo(() => {
    const result: { action: CommandAction; category: string; index: number }[] = [];
    let idx = 0;
    Object.entries(groupedActions).forEach(([category, items]) => {
      items.forEach(action => {
        result.push({ action, category, index: idx });
        idx++;
      });
    });
    return result;
  }, [groupedActions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4 command-palette-backdrop animate-fadeIn" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-background-secondary border border-border rounded-xl shadow-2xl overflow-hidden command-palette-content"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-foreground-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none text-base text-foreground placeholder:text-foreground-muted"
            style={{ outline: 'none', boxShadow: 'none' }}
            placeholder="Type a command or search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium text-foreground-muted bg-background-tertiary border border-border rounded">
            <span>esc</span>
          </kbd>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {filteredActions.length === 0 ? (
            <div className="py-8 text-center text-foreground-muted text-sm">
              No results found for "{query}"
            </div>
          ) : (
            Object.entries(groupedActions).map(([category, items]) => (
              <div key={category} className="mb-2 last:mb-0">
                <div className="px-2 py-1.5 text-xs font-semibold text-foreground-muted uppercase tracking-wide">
                  {categoryLabels[category] || category}
                </div>
                {items.map(action => {
                  const itemData = flatList.find(f => f.action.id === action.id);
                  const itemIndex = itemData?.index ?? 0;
                  const isSelected = itemIndex === selectedIndex;
                  return (
                    <button
                      key={action.id}
                      data-index={itemIndex}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${isSelected
                        ? 'bg-accent-pink/15 text-foreground'
                        : 'text-foreground-secondary hover:bg-background-hover hover:text-foreground'
                        }`}
                      onClick={action.onSelect}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                    >
                      <action.icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-accent-pink' : ''}`} />
                      <span className="flex-1 text-sm font-medium truncate">{action.label}</span>
                      {action.shortcut && (
                        <kbd className="px-1.5 py-0.5 text-xs font-medium text-foreground-muted bg-background-tertiary border border-border rounded">
                          {action.shortcut}
                        </kbd>
                      )}
                      {category === 'buckets' && selectedBucket === action.label && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-accent-green/20 text-accent-green rounded">
                          Active
                        </span>
                      )}
                      <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-accent-pink translate-x-0.5' : 'text-foreground-muted'}`} />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-border bg-background flex items-center justify-between text-xs text-foreground-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-background-tertiary border border-border rounded text-[10px]">↑</kbd>
              <kbd className="px-1 py-0.5 bg-background-tertiary border border-border rounded text-[10px]">↓</kbd>
              <span className="ml-1">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background-tertiary border border-border rounded text-[10px]">↵</kbd>
              <span className="ml-1">Select</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="w-3 h-3" />
            <span>K to open</span>
          </div>
        </div>
      </div>
    </div>
  );
}
