// v 1.0
/**
 * @fileoverview File table component for displaying bucket contents.
 * Shows files and folders in a sortable table with actions.
 */

import { ChevronRight, Download, MoreHorizontal } from 'lucide-react';
import type { S3Object } from '../types';
import { formatBytes, formatDate } from '../utils/formatters';
import { getFileName, getFileIcon } from '../utils/fileUtils';

interface FileTableProps {
    /** Array of S3 objects (files and folders) to display */
    objects: S3Object[];
    /** Whether data is currently loading */
    loading: boolean;
    /** Handler when a folder is clicked for navigation */
    onNavigate: (obj: S3Object) => void;
    /** Handler when download is clicked */
    onDownload: (obj: S3Object) => void;
    /** Handler for right-click context menu */
    onContextMenu: (e: React.MouseEvent, obj: S3Object) => void;
}

/**
 * Table component displaying files and folders in a bucket.
 * 
 * Features:
 * - Sticky header row
 * - File type icons
 * - Human-readable file sizes and dates
 * - Click folders to navigate
 * - Download button for files
 * - Context menu (right-click or "..." button)
 * - Skeleton loading state
 * - Hover effects and row actions
 * 
 * @param props - Component props
 * @returns Table element or loading skeleton
 */
export function FileTable({ objects, loading, onNavigate, onDownload, onContextMenu }: FileTableProps) {
    // Show skeleton loading state when loading with no data
    if (loading && objects.length === 0) {
        return (
            <div className="p-4 space-y-2">
                {/* Render 5 skeleton rows */}
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-3 p-3 stagger-item"
                        style={{ animationDelay: `${i * 40}ms` }}
                    >
                        <div className="w-8 h-8 skeleton rounded" />
                        <div className="flex-1 h-4 skeleton" />
                        <div className="w-16 h-4 skeleton" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <table className="table">
            {/* Table header */}
            <thead>
                <tr>
                    <th>Name</th>
                    <th className="w-20">Size</th>
                    <th className="w-24">Modified</th>
                    <th className="w-16"></th>
                </tr>
            </thead>

            {/* Table body with file/folder rows */}
            <tbody>
                {objects.map((obj, i) => (
                    <tr
                        key={obj.key}
                        className={`file-row stagger-item ${obj.isFolder ? 'is-folder' : ''}`}
                        style={{ animationDelay: `${i * 25}ms` }}
                        onContextMenu={e => onContextMenu(e, obj)}
                        onClick={() => obj.isFolder && onNavigate(obj)}
                    >
                        {/* Name column with icon */}
                        <td>
                            <div className="flex items-center gap-3">
                                {/* File/folder icon */}
                                <span className={`file-icon ${obj.isFolder ? 'text-accent-pink' : 'text-foreground-muted'}`}>
                                    {getFileIcon(obj.key, obj.isFolder)}
                                </span>
                                {/* File/folder name */}
                                <span className="file-name truncate">{getFileName(obj.key)}</span>
                                {/* Chevron for folders (animates on hover) */}
                                {obj.isFolder && (
                                    <ChevronRight className="file-chevron w-4 h-4 text-foreground-muted" />
                                )}
                            </div>
                        </td>

                        {/* Size column */}
                        <td className="text-foreground-muted">{formatBytes(obj.size)}</td>

                        {/* Modified date column */}
                        <td className="text-foreground-muted">{formatDate(obj.lastModified)}</td>

                        {/* Actions column */}
                        <td>
                            <div className="row-actions flex items-center justify-end gap-1">
                                {/* Download button (files only) */}
                                {!obj.isFolder && (
                                    <button
                                        onClick={e => { e.stopPropagation(); onDownload(obj); }}
                                        className="btn btn-ghost btn-icon"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                )}
                                {/* Context menu button */}
                                <button
                                    onClick={e => { e.stopPropagation(); onContextMenu(e, obj); }}
                                    className="btn btn-ghost btn-icon"
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
