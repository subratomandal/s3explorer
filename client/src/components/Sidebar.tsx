// v 1.0
/**
 * @fileoverview Sidebar component for bucket navigation.
 * Displays the list of S3 buckets with search functionality.
 */

import { Database, Plus, Trash2 } from 'lucide-react';
import type { Bucket } from '../types';

interface SidebarProps {
    /** Array of all buckets */
    buckets: Bucket[];
    /** Currently selected bucket name, or null if none selected */
    selectedBucket: string | null;
    /** Current search query for filtering buckets */
    searchQuery: string;
    /** Whether data is currently loading */
    loading: boolean;
    /** Whether sidebar is open on mobile */
    sidebarOpen: boolean;
    /** Handler for search input changes */
    onSearchChange: (value: string) => void;
    /** Handler when a bucket is selected */
    onBucketSelect: (name: string) => void;
    /** Handler to open new bucket modal */
    onNewBucket: () => void;
    /** Handler when delete button is clicked on a bucket */
    onDeleteBucket: (name: string) => void;
    /** Handler to close sidebar (mobile) */
    onCloseSidebar: () => void;
}

/**
 * Left sidebar component containing bucket list and search.
 * 
 * Features:
 * - Logo and app title header
 * - Search/filter input for buckets
 * - Scrollable list of buckets with selection state
 * - Create bucket button
 * - Delete button on hover for each bucket
 * - Responsive: slides in/out on mobile
 * 
 * @param props - Component props
 * @returns Sidebar element with overlay for mobile
 */
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
}: SidebarProps) {
    // Filter buckets based on search query
    const filteredBuckets = buckets.filter(b =>
        !searchQuery.trim() || b.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            {/* Mobile backdrop overlay - closes sidebar when clicked */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onCloseSidebar}
                />
            )}

            {/* Sidebar container */}
            <aside className={`w-64 flex flex-col border-r border-border bg-background-secondary flex-shrink-0 fixed md:relative inset-y-0 left-0 z-50 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

                {/* Header with logo */}
                <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
                    <img src="/logo.svg" alt="" className="w-6 h-6 invert" />
                    <span className="font-semibold text-sm">Bucket Explorer</span>
                </div>

                {/* Search input */}
                <div className="p-3">
                    <input
                        type="text"
                        placeholder="Search buckets..."
                        value={searchQuery}
                        onChange={e => onSearchChange(e.target.value)}
                        className="input"
                    />
                </div>

                {/* Bucket list section */}
                <div className="flex-1 overflow-y-auto px-2">
                    {/* Section header with create button */}
                    <div className="flex items-center justify-between px-2 py-2">
                        <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                            Buckets
                        </span>
                        <button onClick={onNewBucket} className="btn btn-ghost btn-icon">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Bucket items */}
                    <div className="space-y-1">
                        {filteredBuckets.map((bucket, i) => (
                            <div
                                key={bucket.name}
                                className={`sidebar-item group stagger-item ${selectedBucket === bucket.name ? 'active' : ''}`}
                                style={{ animationDelay: `${i * 30}ms` }}
                                onClick={() => onBucketSelect(bucket.name)}
                            >
                                {/* Bucket icon */}
                                <Database className="sidebar-icon w-4 h-4 flex-shrink-0" />
                                {/* Bucket name */}
                                <span className="flex-1 truncate">{bucket.name}</span>
                                {/* Delete button (visible on hover) */}
                                <button
                                    onClick={e => { e.stopPropagation(); onDeleteBucket(bucket.name); }}
                                    className="opacity-0 group-hover:opacity-100 btn btn-ghost btn-icon hover:text-accent-red"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Empty state when no buckets match */}
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
