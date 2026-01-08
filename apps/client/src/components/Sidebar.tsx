import { useState } from 'react';
import { Database, Plus, Trash2, Copy, Check, X } from 'lucide-react';
import type { Bucket } from '../types';

interface SidebarProps {
    buckets: Bucket[];
    selectedBucket: string | null;
    searchQuery: string;
    loading: boolean;
    sidebarOpen: boolean;
    onSearchChange: (value: string) => void;
    onBucketSelect: (name: string) => void;
    onNewBucket: () => void;
    onDeleteBucket: (name: string) => void;
    onCloseSidebar: () => void;
    onNavigateHome: () => void;
}

export function Sidebar({
    buckets,
    selectedBucket,
    searchQuery,
    loading,
    sidebarOpen,
    onSearchChange,
    onBucketSelect,
    onNewBucket,
    onDeleteBucket,
    onCloseSidebar,
    onNavigateHome,
}: SidebarProps) {
    const [copiedBucket, setCopiedBucket] = useState<string | null>(null);

    const filteredBuckets = buckets.filter(b =>
        !searchQuery.trim() || b.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCopyBucketName = (e: React.MouseEvent, bucketName: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(bucketName);
        setCopiedBucket(bucketName);
        setTimeout(() => setCopiedBucket(null), 2000);
    };

    return (
        <>
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onCloseSidebar}
                />
            )}

            <aside className={`w-[276px] sm:w-[252px] flex flex-col border-r border-border bg-background-secondary flex-shrink-0 fixed md:relative inset-y-0 left-0 z-50 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

                {/* Close button - absolute positioned at top right on mobile */}
                <button
                    onClick={onCloseSidebar}
                    className="absolute top-2 right-2 btn btn-ghost btn-icon w-10 h-10 md:hidden z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div
                    className="h-14 flex items-center px-4 border-b border-border cursor-pointer group transition-all duration-300 hover:bg-background-tertiary/30"
                >
                    <div className="flex items-center gap-2.5" onClick={onNavigateHome}>
                        <img
                            src="/logo.svg"
                            alt=""
                            className="w-7 h-7 invert logo-spin transition-all duration-300 group-hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.25)]"
                        />
                        <span className="font-semibold text-base transition-all duration-300 group-hover:text-foreground group-hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.15)]">
                            S3 Explorer
                        </span>
                    </div>
                </div>

                <div className="p-3">
                    <input
                        type="text"
                        placeholder="Search buckets..."
                        value={searchQuery}
                        onChange={e => onSearchChange(e.target.value)}
                        className="input h-10 text-base sm:text-sm sm:h-auto"
                    />
                </div>

                <div className="flex-1 overflow-y-auto px-3 pb-safe">
                    <div className="flex items-center justify-between pl-2 py-2">
                        <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                            Buckets
                        </span>
                        <button onClick={onNewBucket} className="btn btn-ghost btn-icon w-9 h-9">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-1">
                        {filteredBuckets.map((bucket, i) => (
                            <div
                                key={bucket.name}
                                className={`sidebar-item group stagger-item min-h-[36px] ${selectedBucket === bucket.name ? 'active' : ''}`}
                                style={{ animationDelay: `${i * 30}ms` }}
                                onClick={() => onBucketSelect(bucket.name)}
                            >
                                <Database className="sidebar-icon w-4 h-4 flex-shrink-0" />
                                <span className="flex-1 truncate text-sm">{bucket.name}</span>
                                <div className="flex items-center md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={e => handleCopyBucketName(e, bucket.name)}
                                        className="btn btn-ghost btn-icon w-7 h-7 hover:text-accent-purple"
                                        title="Copy bucket name"
                                    >
                                        {copiedBucket === bucket.name ? (
                                            <Check className="w-3.5 h-3.5 text-accent-green" />
                                        ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                    <button
                                        onClick={e => { e.stopPropagation(); onDeleteBucket(bucket.name); }}
                                        className="btn btn-ghost btn-icon w-7 h-7 hover:text-accent-red"
                                        title="Delete bucket"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredBuckets.length === 0 && !loading && (
                        <div className="py-8 text-center">
                            <p className="text-sm text-foreground-muted">
                                {searchQuery ? 'No matches' : 'No buckets'}
                            </p>
                        </div>
                    )}
                </div>

                {/* GitHub link */}
                <div className="mt-auto p-3">
                    <a
                        href="https://github.com/subratomandal"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 hover:from-zinc-600 hover:to-zinc-800 text-zinc-300 hover:text-white shadow-md hover:shadow-lg hover:shadow-purple-500/20 hover:scale-110 transition-all duration-300"
                        title="GitHub"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                        </svg>
                    </a>
                </div>
            </aside>
        </>
    );
}
