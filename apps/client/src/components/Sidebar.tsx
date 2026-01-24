import { useState, useMemo, useCallback } from 'react';
import { Database, Plus, Trash2, Copy, Check, Settings, LogOut, Sun, Moon } from 'lucide-react';
import type { Bucket } from '../types';

interface SidebarProps {
    buckets: Bucket[];
    selectedBucket: string | null;
    searchQuery: string;
    loading: boolean;
    sidebarOpen: boolean;
    activeConnectionName?: string;
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

export function Sidebar({
    buckets,
    selectedBucket,
    searchQuery,
    loading,
    sidebarOpen,
    activeConnectionName,
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

    // Memoize filtered buckets to avoid recalculation on every render
    const filteredBuckets = useMemo(() =>
        buckets.filter(b =>
            !searchQuery.trim() || b.name.toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [buckets, searchQuery]
    );

    // Memoize callback to prevent unnecessary re-renders
    const handleCopyBucketName = useCallback((e: React.MouseEvent, bucketName: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(bucketName);
        setCopiedBucket(bucketName);
        setTimeout(() => setCopiedBucket(null), 2000);
    }, []);

    return (
        <>
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onCloseSidebar}
                />
            )}

            <aside
                className={`w-[276px] sm:w-[252px] flex flex-col border-r border-border bg-background-secondary flex-shrink-0 fixed md:relative inset-y-0 left-0 z-50 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
                role="navigation"
                aria-label="Sidebar navigation"
            >
                {/* Header - fixed height */}
                <div
                    className="h-14 flex items-center justify-between px-4 border-b border-border flex-shrink-0"
                >
                    <div className="flex items-center gap-2.5 cursor-pointer group transition-all duration-300 hover:opacity-80" onClick={onNavigateHome} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onNavigateHome()}>
                        <img
                            src="/logo.svg"
                            alt="S3 Explorer logo"
                            className="w-7 h-7 logo-spin logo-themed transition-all duration-300 group-hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.25)]"
                        />
                        <span className="font-semibold text-base transition-all duration-300 group-hover:text-foreground group-hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.15)]">
                            S3 Explorer
                        </span>
                    </div>
                    <button
                        onClick={onToggleTheme}
                        className="p-2 mr-1 text-foreground-muted hover:text-foreground transition-colors"
                        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-4 h-4" aria-hidden="true" />
                        ) : (
                            <Moon className="w-4 h-4" aria-hidden="true" />
                        )}
                    </button>
                </div>

                {/* Search - fixed height */}
                <div className="p-3 flex-shrink-0">
                    <label htmlFor="bucket-search" className="sr-only">Search buckets</label>
                    <input
                        id="bucket-search"
                        type="search"
                        name="bucket-search"
                        placeholder="Search buckets…"
                        value={searchQuery}
                        onChange={e => onSearchChange(e.target.value)}
                        className="input h-10 text-base sm:text-sm sm:h-auto"
                        aria-label="Search buckets"
                        autoComplete="off"
                        spellCheck="false"
                    />
                </div>

                {/* Buckets section header - fixed */}
                <div className="flex items-center justify-between px-3 pl-5 py-2 flex-shrink-0">
                    <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider" id="buckets-heading">
                        Buckets
                    </span>
                    <button
                        onClick={onNewBucket}
                        className="create-bucket-btn p-2 mr-2 text-foreground-secondary hover:text-foreground transition-all"
                        aria-label="Create new bucket"
                    >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>

                {/* Buckets list - scrollable */}
                <div
                    className="flex-1 overflow-y-auto px-3 min-h-0 bucket-scrollable"
                    role="list"
                    aria-labelledby="buckets-heading"
                >
                    <div className="space-y-0 sm:space-y-1">
                        {filteredBuckets.map((bucket, i) => (
                            <div
                                key={bucket.name}
                                className={`sidebar-item group stagger-item min-h-[18px] sm:min-h-[36px] py-px sm:py-2 ${selectedBucket === bucket.name ? 'active' : ''}`}
                                style={{ animationDelay: `${i * 30}ms` }}
                                onClick={() => onBucketSelect(bucket.name)}
                                onKeyDown={(e) => e.key === 'Enter' && onBucketSelect(bucket.name)}
                                role="listitem"
                                tabIndex={0}
                                aria-selected={selectedBucket === bucket.name}
                                aria-label={`Bucket: ${bucket.name}`}
                            >
                                <Database className="sidebar-icon w-4 h-4 flex-shrink-0" aria-hidden="true" />
                                <span className="flex-1 truncate text-sm">{bucket.name}</span>
                                <div className="flex items-center md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={e => handleCopyBucketName(e, bucket.name)}
                                        className="btn btn-ghost btn-icon w-7 h-7 hover:text-accent-purple"
                                        aria-label={`Copy bucket name: ${bucket.name}`}
                                    >
                                        {copiedBucket === bucket.name ? (
                                            <Check className="w-3.5 h-3.5 text-accent-green" aria-hidden="true" />
                                        ) : (
                                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                        )}
                                    </button>
                                    <button
                                        onClick={e => { e.stopPropagation(); onDeleteBucket(bucket.name); }}
                                        className="btn btn-ghost btn-icon w-7 h-7 hover:text-accent-red"
                                        aria-label={`Delete bucket: ${bucket.name}`}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredBuckets.length === 0 && !loading && (
                        <div className="py-8 text-center" role="status">
                            <p className="text-sm text-foreground-muted">
                                {searchQuery ? 'No matches' : 'No buckets'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Bottom section - Connections, Logout, GitHub */}
                <div className="flex-shrink-0 border-t border-border p-3 pb-safe space-y-1">
                    {/* Connections button */}
                    {onOpenConnections && (
                        <button
                            onClick={onOpenConnections}
                            className="sidebar-item w-full justify-start"
                            aria-label={activeConnectionName ? `Connection settings - Connected to: ${activeConnectionName}` : 'Connection settings'}
                        >
                            <Settings className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                            <span className="flex-1 truncate text-sm text-left">
                                {activeConnectionName ? `${activeConnectionName}` : 'Connections'}
                            </span>
                        </button>
                    )}

                    {/* Logout button */}
                    {onLogout && (
                        <button
                            onClick={onLogout}
                            className="sidebar-item w-full justify-start hover:text-accent-red"
                            aria-label="Logout"
                        >
                            <LogOut className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                            <span className="text-sm">Logout</span>
                        </button>
                    )}

                    {/* GitHub link - styled same as sidebar items */}
                    <a
                        href="https://github.com/subratomandal"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sidebar-item w-full justify-start"
                        aria-label="Visit GitHub (opens in new tab)"
                    >
                        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 98 96" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"/>
                        </svg>
                        <span className="text-sm">Github</span>
                    </a>
                </div>
            </aside>
        </>
    );
}
