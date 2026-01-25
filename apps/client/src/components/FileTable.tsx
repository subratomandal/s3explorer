import { useRef, useCallback, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Download, MoreHorizontal, Check } from 'lucide-react';
import type { S3Object } from '../types';
import { formatBytes, formatDate } from '../utils/formatters';
import { getFileName, getFileIcon } from '../utils/fileUtils';
import { PAGINATION } from '../constants';

interface FileTableProps {
    objects: S3Object[];
    loading: boolean;
    selectedKeys: Set<string>;
    onNavigate: (obj: S3Object) => void;
    onDownload: (obj: S3Object) => void;
    onContextMenu: (e: React.MouseEvent, obj: S3Object) => void;
    onSelect: (key: string, selected: boolean) => void;
    onSelectAll: (selected: boolean) => void;
}

interface RowProps {
    index: number;
    style: React.CSSProperties;
    data: {
        objects: S3Object[];
        selectedKeys: Set<string>;
        onNavigate: (obj: S3Object) => void;
        onDownload: (obj: S3Object) => void;
        onContextMenu: (e: React.MouseEvent, obj: S3Object) => void;
        onSelect: (key: string, selected: boolean) => void;
    };
}

// Checkbox component for selection
function SelectCheckbox({ checked, onChange, ariaLabel }: { checked: boolean; onChange: () => void; ariaLabel: string }) {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onChange(); }}
            className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                checked
                    ? 'bg-accent-purple border-accent-purple text-white'
                    : 'border-border hover:border-foreground-muted'
            }`}
            aria-label={ariaLabel}
            aria-checked={checked}
            role="checkbox"
        >
            {checked && <Check className="w-3 h-3" />}
        </button>
    );
}

// Memoized row component for virtual scrolling
const FileRow = memo(({ index, style, data }: RowProps) => {
    const { objects, selectedKeys, onNavigate, onDownload, onContextMenu, onSelect } = data;
    const obj = objects[index];
    const fileName = getFileName(obj.key);
    const isSelected = selectedKeys.has(obj.key);

    return (
        <div
            style={style}
            className={`file-row flex items-center ${obj.isFolder ? 'is-folder cursor-pointer' : ''} ${isSelected ? 'bg-accent-purple/10' : ''}`}
            onContextMenu={e => onContextMenu(e, obj)}
            onClick={() => obj.isFolder && onNavigate(obj)}
            onKeyDown={(e) => obj.isFolder && e.key === 'Enter' && onNavigate(obj)}
            tabIndex={obj.isFolder ? 0 : -1}
            role="row"
            aria-label={obj.isFolder ? `Folder: ${fileName}` : `File: ${fileName}`}
            aria-selected={isSelected}
        >
            {/* Checkbox column */}
            <div className="w-10 flex items-center justify-center pl-2">
                <SelectCheckbox
                    checked={isSelected}
                    onChange={() => onSelect(obj.key, !isSelected)}
                    ariaLabel={`Select ${fileName}`}
                />
            </div>

            {/* Name column */}
            <div className="flex-1 min-w-0 flex items-center gap-2 px-2 sm:px-3">
                <span className={`file-icon flex-shrink-0 ${obj.isFolder ? 'text-accent-pink' : 'text-foreground-muted'}`} aria-hidden="true">
                    {getFileIcon(obj.key, obj.isFolder)}
                </span>
                <span className="file-name truncate text-[13px]" title={fileName}>
                    {fileName}
                </span>
            </div>

            {/* Size column */}
            <div className="w-[72px] hidden sm:flex items-center justify-center text-foreground-muted text-[11px] px-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {obj.isFolder ? '—' : formatBytes(obj.size)}
            </div>

            {/* Modified column */}
            <div className="w-[88px] hidden md:flex items-center justify-center text-foreground-muted text-[11px] px-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {obj.isFolder ? '—' : formatDate(obj.lastModified)}
            </div>

            {/* Actions column */}
            <div className="w-[52px] sm:w-[64px] flex items-center justify-end gap-0.5 pr-2">
                {/* Size on mobile */}
                {!obj.isFolder && (
                    <span className="text-[11px] text-foreground-muted sm:hidden mr-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatBytes(obj.size)}
                    </span>
                )}
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
        </div>
    );
});

FileRow.displayName = 'FileRow';

// Standard table row for non-virtualized rendering
function StandardRow({ obj, onNavigate, onDownload, onContextMenu, onSelect, isSelected, index }: {
    obj: S3Object;
    onNavigate: (obj: S3Object) => void;
    onDownload: (obj: S3Object) => void;
    onContextMenu: (e: React.MouseEvent, obj: S3Object) => void;
    onSelect: (key: string, selected: boolean) => void;
    isSelected: boolean;
    index: number;
}) {
    const fileName = getFileName(obj.key);

    return (
        <tr
            className={`file-row stagger-item ${obj.isFolder ? 'is-folder' : ''} ${isSelected ? 'bg-accent-purple/10' : ''}`}
            style={{ animationDelay: `${index * 25}ms` }}
            onContextMenu={e => onContextMenu(e, obj)}
            onClick={() => obj.isFolder && onNavigate(obj)}
            onKeyDown={(e) => obj.isFolder && e.key === 'Enter' && onNavigate(obj)}
            tabIndex={obj.isFolder ? 0 : -1}
            role="row"
            aria-label={obj.isFolder ? `Folder: ${fileName}` : `File: ${fileName}`}
            aria-selected={isSelected}
        >
            <td className="py-1.5 sm:py-2 w-10">
                <div className="flex items-center justify-center">
                    <SelectCheckbox
                        checked={isSelected}
                        onChange={() => onSelect(obj.key, !isSelected)}
                        ariaLabel={`Select ${fileName}`}
                    />
                </div>
            </td>
            <td className="py-1.5 sm:py-2">
                <div className="flex items-center gap-2">
                    <span className={`file-icon flex-shrink-0 ${obj.isFolder ? 'text-accent-pink' : 'text-foreground-muted'}`} aria-hidden="true">
                        {getFileIcon(obj.key, obj.isFolder)}
                    </span>
                    <div className="min-w-0 flex-1">
                        <span className="file-name truncate block text-[13px] max-w-[120px] sm:max-w-none" title={fileName}>
                            {fileName.length > 20 && window.innerWidth < 640
                                ? fileName.slice(0, 18) + '…'
                                : fileName}
                        </span>
                    </div>
                </div>
            </td>

            <td className="text-foreground-muted text-[11px] hidden sm:table-cell !text-center !px-2 whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {obj.isFolder ? '—' : formatBytes(obj.size)}
            </td>

            <td className="text-foreground-muted text-[11px] hidden md:table-cell !text-center !px-2 whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {obj.isFolder ? '—' : formatDate(obj.lastModified)}
            </td>

            <td className="py-1.5 sm:py-2">
                <div className="row-actions flex items-center justify-end gap-0.5">
                    {!obj.isFolder && (
                        <span className="text-[11px] text-foreground-muted sm:hidden mr-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatBytes(obj.size)}
                        </span>
                    )}
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
}

export function FileTable({ objects, loading, selectedKeys, onNavigate, onDownload, onContextMenu, onSelect, onSelectAll }: FileTableProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Use virtualization for large lists
    const useVirtualization = objects.length > PAGINATION.VIRTUAL_SCROLL_THRESHOLD;

    // Get container height for virtual list
    const getHeight = useCallback(() => {
        if (containerRef.current) {
            return containerRef.current.clientHeight;
        }
        return 400; // Default height
    }, []);

    const allSelected = objects.length > 0 && objects.every(obj => selectedKeys.has(obj.key));

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

    // Use virtual scrolling for large lists
    if (useVirtualization) {
        return (
            <div ref={containerRef} className="h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center border-b border-border bg-background-secondary/50 text-xs font-medium text-foreground-muted uppercase tracking-wider">
                    <div className="w-10 flex items-center justify-center pl-2">
                        <SelectCheckbox
                            checked={allSelected}
                            onChange={() => onSelectAll(!allSelected)}
                            ariaLabel={allSelected ? 'Deselect all' : 'Select all'}
                        />
                    </div>
                    <div className="flex-1 px-2 sm:px-3 py-2">Name</div>
                    <div className="w-[72px] hidden sm:block text-center px-2 py-2">Size</div>
                    <div className="w-[88px] hidden md:block text-center px-2 py-2">Modified</div>
                    <div className="w-[52px] sm:w-[64px] py-2"><span className="sr-only">Actions</span></div>
                </div>

                {/* Virtualized list */}
                <div className="flex-1" style={{ minHeight: 0 }}>
                    <List
                        height={getHeight()}
                        itemCount={objects.length}
                        itemSize={PAGINATION.ROW_HEIGHT}
                        width="100%"
                        overscanCount={PAGINATION.OVERSCAN_COUNT}
                        itemData={{ objects, selectedKeys, onNavigate, onDownload, onContextMenu, onSelect }}
                    >
                        {FileRow}
                    </List>
                </div>
            </div>
        );
    }

    // Standard table for smaller lists (with animations)
    return (
        <table className="table" role="grid" aria-label="Files and folders">
            <thead>
                <tr>
                    <th scope="col" className="w-10">
                        <div className="flex items-center justify-center">
                            <SelectCheckbox
                                checked={allSelected}
                                onChange={() => onSelectAll(!allSelected)}
                                ariaLabel={allSelected ? 'Deselect all' : 'Select all'}
                            />
                        </div>
                    </th>
                    <th scope="col">Name</th>
                    <th scope="col" className="w-[72px] hidden sm:table-cell !text-center !px-2">Size</th>
                    <th scope="col" className="w-[88px] hidden md:table-cell !text-center !px-2">Modified</th>
                    <th scope="col" className="w-[52px] sm:w-[64px]"><span className="sr-only">Actions</span></th>
                </tr>
            </thead>
            <tbody>
                {objects.map((obj, i) => (
                    <StandardRow
                        key={obj.key}
                        obj={obj}
                        onNavigate={onNavigate}
                        onDownload={onDownload}
                        onContextMenu={onContextMenu}
                        onSelect={onSelect}
                        isSelected={selectedKeys.has(obj.key)}
                        index={i}
                    />
                ))}
            </tbody>
        </table>
    );
}
