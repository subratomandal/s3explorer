import { useState, useMemo, useCallback, useEffect } from 'react';
import { Database, Plus, Trash2, Copy, Check, Settings, LogOut, Sun, Moon, PanelLeftClose, PanelLeft, Github, X } from 'lucide-react';
import type { Bucket } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import { UI_DELAYS } from '../constants';

interface SidebarProps {
    buckets: Bucket[];
    selectedBucket: string | null;
    searchQuery: string;
    loading: boolean;
    sidebarOpen: boolean;
    collapsed: boolean;
    onToggleCollapse: () => void;
    activeConnectionName?: string;
    pinnedBucket?: string;
    theme: 'dark' | 'light';
    onToggleTheme: () => void;
    onSearchChange: (value: string) => void;
    onBucketSelect: (name: string) => void;
    onNewBucket: () => void;
    onDeleteBucket: (name: string) => void;
    onCloseSidebar: () => void;
    onNavigateHome: () => void;
    onOpenConnections?: () => void;
    onLogout?: () => void;
}

const EXPANDED_WIDTH = 232;
const COLLAPSED_WIDTH = 48;

export function Sidebar({
    buckets,
    selectedBucket,
    searchQuery,
    loading,
    sidebarOpen,
    collapsed,
    onToggleCollapse,
    activeConnectionName,
    pinnedBucket,
    theme,
    onToggleTheme,
    onSearchChange,
    onBucketSelect,
    onNewBucket,
    onDeleteBucket,
    onCloseSidebar,
    onNavigateHome,
    onOpenConnections,
    onLogout,
}: SidebarProps) {
    const [copiedBucket, setCopiedBucket] = useState<string | null>(null);
    const [localSearch, setLocalSearch] = useState(searchQuery);

    const debouncedSearch = useDebounce(localSearch, UI_DELAYS.SEARCH_DEBOUNCE);

    useEffect(() => {
        if (debouncedSearch !== searchQuery) onSearchChange(debouncedSearch);
    }, [debouncedSearch, searchQuery, onSearchChange]);

    useEffect(() => {
        if (searchQuery !== localSearch && searchQuery !== debouncedSearch) setLocalSearch(searchQuery);
    }, [searchQuery]);

    const filteredBuckets = useMemo(() =>
        buckets.filter(b => !debouncedSearch.trim() || b.name.toLowerCase().includes(debouncedSearch.toLowerCase())),
        [buckets, debouncedSearch]
    );

    const handleCopyBucketName = useCallback(async (e: React.MouseEvent, bucketName: string) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(bucketName);
            setCopiedBucket(bucketName);
            setTimeout(() => setCopiedBucket(null), 2000);
        } catch {
            // Clipboard API fails without HTTPS (except localhost). Fall back to
            // the deprecated execCommand approach so copy still works over plain HTTP.
            try {
                const textArea = document.createElement('textarea');
                textArea.value = bucketName;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setCopiedBucket(bucketName);
                setTimeout(() => setCopiedBucket(null), 2000);
            } catch { /* ignore */ }
        }
    }, []);

    // ── Expanded content (shared between desktop and mobile) ──
    // Rendered once per <aside>, so element ids are prefixed to stay unique in the DOM.
    const renderExpanded = (idPrefix: 'desktop' | 'mobile') => (
        <>
            {/* Header */}
            <div className="h-12 flex items-center justify-between pl-3.5 pr-1.5 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-2 cursor-pointer group transition-all duration-300 hover:opacity-80" onClick={onNavigateHome} role="button" tabIndex={collapsed ? -1 : 0} onKeyDown={(e) => e.key === 'Enter' && onNavigateHome()}>
                    <img src="/logo.svg" alt="S3 Explorer logo" className="w-6 h-6 logo-spin logo-themed" />
                    <span className="font-semibold text-sm whitespace-nowrap">S3 Explorer</span>
                </div>
                <div className="flex items-center">
                    <button onClick={onToggleTheme} className="p-2 text-foreground-muted hover:text-foreground transition-colors" tabIndex={collapsed ? -1 : 0} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                    <button onClick={onToggleCollapse} className="p-2 text-foreground-muted hover:text-foreground transition-colors hidden md:flex items-center justify-center" aria-label="Collapse sidebar">
                        <PanelLeftClose className="w-4 h-4" />
                    </button>
                    <button onClick={onCloseSidebar} className="p-2 text-foreground-muted hover:text-foreground transition-colors flex md:hidden items-center justify-center" aria-label="Close sidebar">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="px-2.5 pt-2.5 pb-1 flex-shrink-0">
                <input
                    id={`${idPrefix}-bucket-search`}
                    type="search"
                    name="bucket-search"
                    placeholder={selectedBucket ? "Search files…" : "Search buckets…"}
                    value={localSearch}
                    onChange={e => setLocalSearch(e.target.value)}
                    className="input h-8 text-xs !rounded-md"
                    tabIndex={collapsed ? -1 : 0}
                    aria-label={selectedBucket ? 'Search files' : 'Search buckets'}
                    autoComplete="off"
                    spellCheck="false"
                    enterKeyHint="search"
                />
            </div>

            {/* Buckets header */}
            <div className="flex items-center justify-between pl-[18px] pr-1.5 py-1.5 flex-shrink-0">
                <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider" id={`${idPrefix}-buckets-heading`}>Buckets</span>
                {!pinnedBucket && (
                    <button onClick={onNewBucket} className="create-bucket-btn p-1.5 text-foreground-secondary hover:text-foreground transition-all" tabIndex={collapsed ? -1 : 0} aria-label="Create new bucket">
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Buckets list */}
            <div className="flex-1 overflow-y-auto px-2.5 min-h-0 bucket-scrollable" role="list" aria-labelledby={`${idPrefix}-buckets-heading`}>
                <div className="space-y-px">
                    {filteredBuckets.map((bucket, i) => (
                        <div
                            key={bucket.name}
                            className={`sidebar-item group stagger-item h-8 !rounded ${selectedBucket === bucket.name ? 'active' : ''}`}
                            style={{ animationDelay: `${i * 30}ms` }}
                            onClick={() => onBucketSelect(bucket.name)}
                            onKeyDown={(e) => e.key === 'Enter' && onBucketSelect(bucket.name)}
                            role="listitem"
                            tabIndex={collapsed ? -1 : 0}
                            aria-selected={selectedBucket === bucket.name}
                            aria-label={`Bucket: ${bucket.name}`}
                        >
                            <Database className="sidebar-icon w-3.5 h-3.5 flex-shrink-0" />
                            <span className="flex-1 truncate text-xs">{bucket.name}</span>
                            <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <button onClick={e => handleCopyBucketName(e, bucket.name)} className="flex items-center justify-center w-6 h-6 rounded text-foreground-secondary hover:text-accent-purple active:scale-95 transition-all" tabIndex={collapsed ? -1 : 0} aria-label={`Copy: ${bucket.name}`}>
                                    {copiedBucket === bucket.name ? <Check className="w-3 h-3 text-accent-green" /> : <Copy className="w-3 h-3" />}
                                </button>
                                {!pinnedBucket && (
                                    <button onClick={e => { e.stopPropagation(); onDeleteBucket(bucket.name); }} className="flex items-center justify-center w-6 h-6 rounded text-foreground-secondary hover:text-accent-red active:scale-95 transition-all" tabIndex={collapsed ? -1 : 0} aria-label={`Delete: ${bucket.name}`}>
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                {filteredBuckets.length === 0 && !loading && (
                    <div className="py-8 text-center"><p className="text-sm text-foreground-muted">{debouncedSearch ? 'No matches' : 'No buckets'}</p></div>
                )}
            </div>

            {/* Bottom section */}
            <div className="flex-shrink-0 border-t border-border px-2.5 py-1.5 pb-safe">
                {onOpenConnections && (
                    <button onClick={onOpenConnections} className="w-full flex items-center gap-2 h-8 px-2.5 text-foreground-muted hover:text-foreground text-xs transition-colors cursor-pointer" tabIndex={collapsed ? -1 : 0}>
                        <Settings className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="flex-1 truncate text-left">{activeConnectionName || 'Connections'}</span>
                    </button>
                )}
                <a href="https://github.com/subratomandal/s3explorer" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2 h-8 px-2.5 text-foreground-muted hover:text-foreground text-xs transition-colors" tabIndex={collapsed ? -1 : 0}>
                    <Github className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>GitHub</span>
                </a>
                {onLogout && (
                    <button onClick={onLogout} className="w-full flex items-center gap-2 h-8 px-2.5 text-foreground-muted hover:text-accent-red text-xs transition-colors cursor-pointer" tabIndex={collapsed ? -1 : 0}>
                        <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Logout</span>
                    </button>
                )}
            </div>
        </>
    );

    // ── Collapsed icon strip content ──
    const collapsedContent = (
        <div className="flex flex-col items-center h-full py-1.5 gap-0.5">
            <button onClick={onToggleCollapse} className="w-8 h-8 flex items-center justify-center text-foreground-muted hover:text-foreground transition-colors flex-shrink-0" aria-label="Expand sidebar" title="Expand sidebar">
                <PanelLeft className="w-4 h-4" />
            </button>
            <button onClick={onNavigateHome} className="w-8 h-8 flex items-center justify-center my-0.5 flex-shrink-0" aria-label="Home" title="S3 Explorer">
                <img src="/logo.svg" alt="S3 Explorer" className="w-5 h-5 logo-themed" />
            </button>
            {!pinnedBucket && (
                <button onClick={onNewBucket} className="w-8 h-8 flex items-center justify-center text-foreground-muted hover:text-foreground transition-colors flex-shrink-0" aria-label="Create bucket" title="Create bucket">
                    <Plus className="w-3.5 h-3.5" />
                </button>
            )}
            <div className="w-5 h-px bg-border my-0.5 flex-shrink-0" />
            <div className="flex-1 flex flex-col items-center gap-px overflow-y-auto min-h-0 bucket-scrollable w-full px-1">
                {buckets.map(bucket => (
                    <button
                        key={bucket.name}
                        onClick={() => onBucketSelect(bucket.name)}
                        className={`w-8 h-8 flex items-center justify-center rounded transition-colors flex-shrink-0 ${
                            selectedBucket === bucket.name ? 'text-accent-pink bg-accent-pink/10' : 'text-foreground-muted hover:text-foreground'
                        }`}
                        aria-label={`Bucket: ${bucket.name}`}
                        title={bucket.name}
                    >
                        <Database className="w-3.5 h-3.5" />
                    </button>
                ))}
            </div>
            <div className="w-5 h-px bg-border my-0.5 flex-shrink-0" />
            <button onClick={onToggleTheme} className="w-8 h-8 flex items-center justify-center text-foreground-muted hover:text-foreground transition-colors flex-shrink-0" aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            {onOpenConnections && (
                <button onClick={onOpenConnections} className="w-8 h-8 flex items-center justify-center text-foreground-muted hover:text-foreground transition-colors flex-shrink-0" aria-label="Connections" title={activeConnectionName || 'Connections'}>
                    <Settings className="w-3.5 h-3.5" />
                </button>
            )}
            <a href="https://github.com/subratomandal/s3explorer" target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center text-foreground-muted hover:text-foreground transition-colors flex-shrink-0" aria-label="GitHub" title="GitHub">
                <Github className="w-3.5 h-3.5" />
            </a>
            {onLogout && (
                <button onClick={onLogout} className="w-8 h-8 flex items-center justify-center text-foreground-muted hover:text-accent-red transition-colors flex-shrink-0" aria-label="Logout" title="Logout">
                    <LogOut className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );

    return (
        <>
            {/* Mobile overlay backdrop */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onCloseSidebar} />
            )}

            {/* Desktop and mobile need separate <aside> elements because they use
               incompatible positioning models: desktop animates width in the normal
               document flow, while mobile uses a fixed overlay with translate. You
               can't combine both behaviors on one element without layout thrashing. */}
            <aside
                className="hidden md:block relative border-r border-border bg-background-secondary flex-shrink-0 overflow-hidden"
                style={{
                    width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
                    transition: 'width 240ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                role="navigation"
                aria-label="Sidebar navigation"
            >
                {/* Cross-fade between collapsed and expanded content. The staggered
                   timing matters: the outgoing layer fades out instantly (120ms, no delay)
                   so it clears before the width animation visually starts, then the
                   incoming layer fades in after an 80ms delay to sync with the width
                   change. Without this stagger, both layers briefly overlap mid-transition. */}

                {/* Collapsed layer */}
                <div
                    className="absolute inset-0"
                    style={{
                        opacity: collapsed ? 1 : 0,
                        pointerEvents: collapsed ? 'auto' : 'none',
                        transition: collapsed
                            ? 'opacity 180ms ease 80ms'   /* fade in after width starts shrinking */
                            : 'opacity 120ms ease',         /* fade out immediately when expanding */
                    }}
                >
                    {collapsedContent}
                </div>

                {/* Expanded layer */}
                <div
                    className="h-full flex flex-col"
                    style={{
                        width: EXPANDED_WIDTH,
                        opacity: collapsed ? 0 : 1,
                        pointerEvents: collapsed ? 'none' : 'auto',
                        transition: collapsed
                            ? 'opacity 120ms ease'           /* fade out immediately when collapsing */
                            : 'opacity 180ms ease 80ms',     /* fade in after width starts growing */
                    }}
                >
                    {renderExpanded('desktop')}
                </div>
            </aside>

            {/* ── Mobile sidebar: fixed overlay, unaffected by collapsed state ── */}
            <aside
                className={`md:hidden flex flex-col w-[260px] sm:w-[232px] border-r border-border bg-background-secondary fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                role="navigation"
                aria-label="Sidebar navigation"
            >
                {renderExpanded('mobile')}
            </aside>
        </>
    );
}
