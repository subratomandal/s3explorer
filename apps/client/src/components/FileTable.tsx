import { ChevronRight, Download, MoreHorizontal } from 'lucide-react';
import type { S3Object } from '../types';
import { formatBytes, formatDate } from '../utils/formatters';
import { getFileName, getFileIcon } from '../utils/fileUtils';

interface FileTableProps {
    objects: S3Object[];
    loading: boolean;
    onNavigate: (obj: S3Object) => void;
    onDownload: (obj: S3Object) => void;
    onContextMenu: (e: React.MouseEvent, obj: S3Object) => void;
}

export function FileTable({ objects, loading, onNavigate, onDownload, onContextMenu }: FileTableProps) {
    if (loading && objects.length === 0) {
        return (
            <div className="p-3 sm:p-4 space-y-2" role="status" aria-label="Loading files">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-3 p-3 stagger-item"
                        style={{ animationDelay: `${i * 40}ms` }}
                        aria-hidden="true"
                    >
                        <div className="w-8 h-8 skeleton rounded" />
                        <div className="flex-1 h-4 skeleton" />
                        <div className="w-16 h-4 skeleton hidden sm:block" />
                    </div>
                ))}
                <span className="sr-only">Loading file list...</span>
            </div>
        );
    }

    return (
        <table className="table" role="grid" aria-label="Files and folders">
            <thead>
                <tr>
                    <th scope="col">Name</th>
                    <th scope="col" className="w-20 hidden sm:table-cell">Size</th>
                    <th scope="col" className="w-24 hidden md:table-cell">Modified</th>
                    <th scope="col" className="w-12 sm:w-16"><span className="sr-only">Actions</span></th>
                </tr>
            </thead>

            <tbody>
                {objects.map((obj, i) => {
                    const fileName = getFileName(obj.key);
                    return (
                        <tr
                            key={obj.key}
                            className={`file-row stagger-item ${obj.isFolder ? 'is-folder' : ''}`}
                            style={{ animationDelay: `${i * 25}ms` }}
                            onContextMenu={e => onContextMenu(e, obj)}
                            onClick={() => obj.isFolder && onNavigate(obj)}
                            onKeyDown={(e) => obj.isFolder && e.key === 'Enter' && onNavigate(obj)}
                            tabIndex={obj.isFolder ? 0 : -1}
                            role="row"
                            aria-label={obj.isFolder ? `Folder: ${fileName}` : `File: ${fileName}`}
                        >
                            <td className="py-1.5 sm:py-2">
                                <div className="flex items-center gap-2">
                                    <span className={`file-icon flex-shrink-0 ${obj.isFolder ? 'text-accent-pink' : 'text-foreground-muted'}`} aria-hidden="true">
                                        {getFileIcon(obj.key, obj.isFolder)}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <span className="file-name truncate block text-[13px]">{fileName}</span>
                                        {/* Show size on mobile below filename */}
                                        {!obj.isFolder && (
                                            <span className="text-[11px] text-foreground-muted sm:hidden">
                                                {formatBytes(obj.size)}
                                            </span>
                                        )}
                                    </div>
                                    {obj.isFolder && (
                                        <ChevronRight className="file-chevron w-3.5 h-3.5 text-foreground-muted flex-shrink-0" aria-hidden="true" />
                                    )}
                                </div>
                            </td>

                            <td className="text-foreground-muted text-[13px] hidden sm:table-cell">
                                {obj.isFolder ? '—' : formatBytes(obj.size)}
                            </td>

                            <td className="text-foreground-muted text-[13px] hidden md:table-cell">
                                {obj.isFolder ? '—' : formatDate(obj.lastModified)}
                            </td>

                            <td className="py-1.5 sm:py-2">
                                <div className="row-actions flex items-center justify-end gap-0.5 sm:opacity-0 sm:group-hover:opacity-100">
                                    {!obj.isFolder && (
                                        <button
                                            onClick={e => { e.stopPropagation(); onDownload(obj); }}
                                            className="btn btn-ghost btn-icon w-7 h-7 sm:w-8 sm:h-8"
                                            aria-label={`Download ${fileName}`}
                                        >
                                            <Download className="w-3.5 h-3.5" aria-hidden="true" />
                                        </button>
                                    )}
                                    <button
                                        onClick={e => { e.stopPropagation(); onContextMenu(e, obj); }}
                                        className="btn btn-ghost btn-icon w-7 h-7 sm:w-8 sm:h-8"
                                        aria-label={`More options for ${fileName}`}
                                        aria-haspopup="menu"
                                    >
                                        <MoreHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
