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

            <aside className={`w-[280px] sm:w-64 flex flex-col border-r border-border bg-background-secondary flex-shrink-0 fixed md:relative inset-y-0 left-0 z-50 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

                <div
                    className="h-14 flex items-center justify-between px-4 border-b border-border cursor-pointer group transition-all duration-300 hover:bg-background-tertiary/30"
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
                    <button
                        onClick={onCloseSidebar}
                        className="btn btn-ghost btn-icon w-9 h-9 md:hidden"
                    >
                        <X className="w-5 h-5" />
                    </button>
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
                                className={`sidebar-item group stagger-item min-h-[44px] ${selectedBucket === bucket.name ? 'active' : ''}`}
                                style={{ animationDelay: `${i * 30}ms` }}
                                onClick={() => onBucketSelect(bucket.name)}
                            >
                                <Database className="sidebar-icon w-4 h-4 flex-shrink-0" />
                                <span className="flex-1 truncate text-sm">{bucket.name}</span>
                                <div className="flex items-center md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={e => handleCopyBucketName(e, bucket.name)}
                                        className="btn btn-ghost btn-icon w-9 h-9 hover:text-accent-purple"
                                        title="Copy bucket name"
                                    >
                                        {copiedBucket === bucket.name ? (
                                            <Check className="w-4 h-4 text-accent-green" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={e => { e.stopPropagation(); onDeleteBucket(bucket.name); }}
                                        className="btn btn-ghost btn-icon w-9 h-9 hover:text-accent-red"
                                        title="Delete bucket"
                                    >
                                        <Trash2 className="w-4 h-4" />
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
            </aside>
        </>
    );
}
