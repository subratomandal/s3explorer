import { useRef, useCallback, useEffect, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { MoreHorizontal, Check } from 'lucide-react';
import type { S3Object, SortField, SortDirection } from '../types';
import { formatBytes, formatDate } from '../utils/formatters';
import { getFileName, getFileIcon } from '../utils/fileUtils';
import { PAGINATION } from '../constants';

interface FileTableProps {
    objects: S3Object[];
    loading: boolean;
    selectedKeys: Set<string>;
    onNavigate: (obj: S3Object) => void;
    onContextMenu: (e: React.MouseEvent, obj: S3Object) => void;
    onSelect: (key: string, selected: boolean) => void;
    onSelectAll: (selected: boolean) => void;
    onSelectRange: (keys: string[]) => void;
    sortField: SortField;
    sortDirection: SortDirection;
    onSort: (field: SortField) => void;
    hasMore?: boolean;
    loadingMore?: boolean;
    onLoadMore?: () => void;
}

interface RowProps {
    index: number;
    style: React.CSSProperties;
    data: {
        objects: S3Object[];
        selectedKeys: Set<string>;
        onNavigate: (obj: S3Object) => void;
        onContextMenu: (e: React.MouseEvent, obj: S3Object) => void;
        onItemSelect: (index: number, key: string, isCurrentlySelected: boolean) => void;
    };
}

// Checkbox component for selection
function SelectCheckbox({ checked, onChange, ariaLabel }: { checked: boolean; onChange: () => void; ariaLabel: string }) {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onChange(); }}
            className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${checked
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

// Clickable sortable column header
function SortButton({ field, label, sortField, sortDirection, onSort, className }: {
    field: SortField;
    label: string;
    sortField: SortField;
    sortDirection: SortDirection;
    onSort: (field: SortField) => void;
    className?: string;
}) {
    const isActive = sortField === field;
    return (
        <button
            onClick={() => onSort(field)}
            className={`flex items-center gap-0.5 cursor-pointer hover:text-foreground transition-colors select-none ${isActive ? 'text-foreground' : ''} ${className || ''}`}
            aria-label={`Sort by ${label} ${isActive ? (sortDirection === 'asc' ? 'descending' : 'ascending') : 'ascending'}`}
        >
            {label}
        </button>
    );
}

// react-window calls render on every visible row whenever *any* state changes
// (e.g. a single checkbox toggle). Memo prevents re-rendering rows whose props
// haven't actually changed, which matters when hundreds of rows are visible.
const FileRow = memo(({ index, style, data }: RowProps) => {
    const { objects, selectedKeys, onNavigate, onContextMenu, onItemSelect } = data;
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
                    onChange={() => onItemSelect(index, obj.key, isSelected)}
                    ariaLabel={`Select ${fileName}`}
                />
            </div>

            {/* Name column */}
            <div className="flex-1 min-w-0 flex items-center gap-2 px-2 sm:px-3">
                <span className={`file-icon flex-shrink-0 ${obj.isFolder ? 'text-accent-pink' : 'text-foreground-muted'}`} aria-hidden="true">
                    {getFileIcon(obj.key, obj.isFolder)}
                </span>
                <span className="file-name truncate text-xs" title={fileName}>
                    {fileName}
                </span>
            </div>

            {/* Size column */}
            <div className="w-[72px] hidden sm:flex items-center justify-center text-foreground-muted text-xs px-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {obj.isFolder ? '—' : formatBytes(obj.size)}
            </div>

            {/* Modified column */}
            <div className="w-[88px] hidden md:flex items-center justify-center text-foreground-muted text-xs px-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {obj.isFolder ? '—' : obj.lastModified ? <time dateTime={obj.lastModified}>{formatDate(obj.lastModified)}</time> : '—'}
            </div>

            {/* Actions column */}
            <div className="w-12 sm:w-14 flex items-center justify-end pr-2">
                {/* Size on mobile */}
                {!obj.isFolder && (
                    <span className="text-xs text-foreground-muted sm:hidden mr-1 whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatBytes(obj.size)}
                    </span>
                )}
                <button
                    onClick={e => { e.stopPropagation(); onContextMenu(e, obj); }}
                    className="btn btn-ghost btn-icon w-8 h-8"
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
function StandardRow({ obj, onNavigate, onContextMenu, onItemSelect, isSelected, index, skipAnimations }: {
    obj: S3Object;
    onNavigate: (obj: S3Object) => void;
    onContextMenu: (e: React.MouseEvent, obj: S3Object) => void;
    onItemSelect: (index: number, key: string, isCurrentlySelected: boolean) => void;
    isSelected: boolean;
    index: number;
    skipAnimations: boolean;
}) {
    const fileName = getFileName(obj.key);

    return (
        <tr
            className={`file-row ${!skipAnimations ? 'stagger-item' : ''} ${obj.isFolder ? 'is-folder' : ''} ${isSelected ? 'bg-accent-purple/10' : ''}`}
            style={!skipAnimations ? { animationDelay: `${index * 25}ms` } : undefined}
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
                        onChange={() => onItemSelect(index, obj.key, isSelected)}
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
                        <span className="file-name truncate block text-xs max-w-[120px] sm:max-w-none" title={fileName}>
                            {fileName.length > 20 && window.innerWidth < 640
                                ? fileName.slice(0, 18) + '…'
                                : fileName}
                        </span>
                    </div>
                </div>
            </td>

            <td className="text-foreground-muted text-xs hidden sm:table-cell !text-center !px-2 whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {obj.isFolder ? '—' : formatBytes(obj.size)}
            </td>

            <td className="text-foreground-muted text-xs hidden md:table-cell !text-center !px-2 whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {obj.isFolder ? '—' : obj.lastModified ? <time dateTime={obj.lastModified}>{formatDate(obj.lastModified)}</time> : '—'}
            </td>

            <td className="py-1.5 sm:py-2">
                <div className="row-actions flex items-center justify-end">
                    {!obj.isFolder && (
                        <span className="text-xs text-foreground-muted sm:hidden mr-1 whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatBytes(obj.size)}
                        </span>
                    )}
                    <button
                        onClick={e => { e.stopPropagation(); onContextMenu(e, obj); }}
                        className="btn btn-ghost btn-icon w-8 h-8"
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

export function FileTable({ objects, loading, selectedKeys, onNavigate, onContextMenu, onSelect, onSelectAll, onSelectRange, sortField, sortDirection, onSort, hasMore, loadingMore, onLoadMore }: FileTableProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastClickedIndexRef = useRef<number>(-1);
    // Track shift state via global keydown/keyup instead of reading e.shiftKey in
    // click handlers. React's synthetic onChange for checkboxes doesn't reliably
    // propagate the native shiftKey property, so we maintain our own ground truth.
    const shiftKeyRef = useRef(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Shift') shiftKeyRef.current = true; };
        const handleKeyUp = (e: KeyboardEvent) => { if (e.key === 'Shift') shiftKeyRef.current = false; };
        const handleBlur = () => { shiftKeyRef.current = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    // Reset shift anchor when objects list changes
    useEffect(() => {
        lastClickedIndexRef.current = -1;
    }, [objects]);

    // Handle item selection with shift+click range support
    const handleItemSelect = useCallback((index: number, key: string, isCurrentlySelected: boolean) => {
        if (shiftKeyRef.current && lastClickedIndexRef.current >= 0 && lastClickedIndexRef.current !== index) {
            const start = Math.min(lastClickedIndexRef.current, index);
            const end = Math.max(lastClickedIndexRef.current, index);
            const keysInRange = objects.slice(start, end + 1).map(obj => obj.key);
            onSelectRange(keysInRange);
        } else {
            onSelect(key, !isCurrentlySelected);
        }
        lastClickedIndexRef.current = index;
    }, [objects, onSelect, onSelectRange]);

    // Below ~100 items a real DOM table with stagger animations feels nicer.
    // Above that threshold, rendering all rows tanks scroll performance, so we
    // switch to react-window's virtual scroll which only mounts visible rows.
    const useVirtualization = objects.length > PAGINATION.VIRTUAL_SCROLL_THRESHOLD;

    // Get container height for virtual list
    const getHeight = useCallback(() => {
        if (containerRef.current) {
            return containerRef.current.clientHeight;
        }
        return 400;
    }, []);

    const allSelected = objects.length > 0 && objects.every(obj => selectedKeys.has(obj.key));

    const sortProps = { sortField, sortDirection, onSort };

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

    // Virtual scrolling for large lists
    if (useVirtualization) {
        return (
            <div ref={containerRef} className="h-full flex flex-col">
                {/* Header with sortable columns */}
                <div className="flex items-center border-b border-border bg-background-secondary/50 text-xs font-medium text-foreground-muted uppercase tracking-wider">
                    <div className="w-10 flex items-center justify-center pl-2">
                        <SelectCheckbox
                            checked={allSelected}
                            onChange={() => onSelectAll(!allSelected)}
                            ariaLabel={allSelected ? 'Deselect all' : 'Select all'}
                        />
                    </div>
                    <div className="flex-1 px-2 sm:px-3 py-2">
                        <SortButton field="name" label="Name" {...sortProps} />
                    </div>
                    <div className="w-[72px] hidden sm:flex justify-center px-2 py-2">
                        <SortButton field="size" label="Size" {...sortProps} />
                    </div>
                    <div className="w-[88px] hidden md:flex justify-center px-2 py-2">
                        <SortButton field="lastModified" label="Modified" {...sortProps} />
                    </div>
                    <div className="w-12 sm:w-14 py-2"><span className="sr-only">Actions</span></div>
                </div>

                {/* Virtualized list */}
                <div className="flex-1" style={{ minHeight: 0 }}>
                    <List
                        height={getHeight()}
                        itemCount={objects.length}
                        itemSize={PAGINATION.ROW_HEIGHT}
                        width="100%"
                        overscanCount={PAGINATION.OVERSCAN_COUNT}
                        itemData={{ objects, selectedKeys, onNavigate, onContextMenu, onItemSelect: handleItemSelect }}
                        onItemsRendered={({ visibleStopIndex }) => {
                            if (hasMore && !loadingMore && onLoadMore && visibleStopIndex >= objects.length - 20) {
                                onLoadMore();
                            }
                        }}
                    >
                        {FileRow}
                    </List>
                </div>
                {loadingMore && (
                    <div className="flex items-center justify-center py-3 text-foreground-muted text-sm">
                        <svg className="w-4 h-4 animate-spin mr-2" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Loading more...
                    </div>
                )}
            </div>
        );
    }

    // 100+ simultaneous CSS stagger animations destroy the frame rate (each row
    // triggers its own composite layer). Skip them when the list is large enough
    // that the visual payoff isn't worth the perf hit.
    const skipAnimations = objects.length > 100;

    return (
        <>
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
                        <th scope="col">
                            <SortButton field="name" label="Name" {...sortProps} />
                        </th>
                        <th scope="col" className="w-[72px] hidden sm:table-cell !text-center !px-2">
                            <SortButton field="size" label="Size" {...sortProps} className="justify-center w-full" />
                        </th>
                        <th scope="col" className="w-[88px] hidden md:table-cell !text-center !px-2">
                            <SortButton field="lastModified" label="Modified" {...sortProps} className="justify-center w-full" />
                        </th>
                        <th scope="col" className="w-12 sm:w-14"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody>
                    {objects.map((obj, i) => (
                        <StandardRow
                            key={obj.key}
                            obj={obj}
                            onNavigate={onNavigate}
                            onContextMenu={onContextMenu}
                            onItemSelect={handleItemSelect}
                            isSelected={selectedKeys.has(obj.key)}
                            index={i}
                            skipAnimations={skipAnimations}
                        />
                    ))}
                </tbody>
            </table>
            {loadingMore && (
                <div className="flex items-center justify-center py-3 text-foreground-muted text-sm">
                    <svg className="w-4 h-4 animate-spin mr-2" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading more...
                </div>
            )}
            {hasMore && !loadingMore && (
                <div className="flex items-center justify-center py-4">
                    <button
                        onClick={onLoadMore}
                        className="btn btn-ghost text-sm text-foreground-secondary hover:text-foreground"
                    >
                        Load more files...
                    </button>
                </div>
            )}
        </>
    );
}
