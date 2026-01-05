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
            <div className="p-4 space-y-2">
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
            <thead>
                <tr>
                    <th>Name</th>
                    <th className="w-20">Size</th>
                    <th className="w-24">Modified</th>
                    <th className="w-16"></th>
                </tr>
            </thead>

            <tbody>
                {objects.map((obj, i) => (
                    <tr
                        key={obj.key}
                        className={`file-row stagger-item ${obj.isFolder ? 'is-folder' : ''}`}
                        style={{ animationDelay: `${i * 25}ms` }}
                        onContextMenu={e => onContextMenu(e, obj)}
                        onClick={() => obj.isFolder && onNavigate(obj)}
                    >
                        <td>
                            <div className="flex items-center gap-3">
                                <span className={`file-icon ${obj.isFolder ? 'text-accent-pink' : 'text-foreground-muted'}`}>
                                    {getFileIcon(obj.key, obj.isFolder)}
                                </span>
                                <span className="file-name truncate">{getFileName(obj.key)}</span>
                                {obj.isFolder && (
                                    <ChevronRight className="file-chevron w-4 h-4 text-foreground-muted" />
                                )}
                            </div>
                        </td>

                        <td className="text-foreground-muted">
                            {obj.isFolder ? '—' : formatBytes(obj.size)}
                        </td>

                        <td className="text-foreground-muted">
                            {obj.isFolder ? '—' : formatDate(obj.lastModified)}
                        </td>

                        <td>
                            <div className="row-actions flex items-center justify-end gap-1">
                                {!obj.isFolder && (
                                    <button
                                        onClick={e => { e.stopPropagation(); onDownload(obj); }}
                                        className="btn btn-ghost btn-icon"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                )}
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
