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
                        className="w-8 h-8 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 hover:scale-105 transition-all duration-200"
                        title="GitHub"
                    >
                        <svg className="w-8 h-8" viewBox="0 0 98 96" fill="currentColor">
                            <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"/>
                        </svg>
                    </a>
                </div>
            </aside>
        </>
    );
}
