import { X } from 'lucide-react';

interface BatchActionsBarProps {
    selectedCount: number;
    previewableCount: number;
    // 'file' streams a single file directly; 'zip' bundles the selection (folders included).
    downloadMode: 'file' | 'zip';
    downloading: boolean;
    onClearSelection: () => void;
    onDeleteSelected: () => void;
    onPreviewSelected: () => void;
    onDownloadSelected: () => void;
}

export function BatchActionsBar({
    selectedCount,
    previewableCount,
    downloadMode,
    downloading,
    onClearSelection,
    onDeleteSelected,
    onPreviewSelected,
    onDownloadSelected,
}: BatchActionsBarProps) {
    if (selectedCount === 0) return null;

    const downloadLabel = downloading
        ? 'Preparing…'
        : downloadMode === 'zip' ? 'Download .zip' : 'Download';

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 mb-safe animate-slideUp">
            <div className="flex items-center gap-px bg-border rounded-lg shadow-lg overflow-hidden">
                <span className="text-xs font-medium text-foreground-secondary px-3 py-2 bg-background-secondary whitespace-nowrap">
                    {selectedCount} selected
                </span>

                {previewableCount > 0 && (
                    <button
                        onClick={onPreviewSelected}
                        className="text-xs font-medium px-3 py-2 bg-background-secondary text-foreground-secondary hover:bg-background-hover hover:text-foreground transition-colors whitespace-nowrap"
                    >
                        Preview
                    </button>
                )}

                <button
                    onClick={onDownloadSelected}
                    disabled={downloading}
                    className="text-xs font-medium px-3 py-2 bg-background-secondary text-foreground-secondary hover:bg-background-hover hover:text-foreground transition-colors whitespace-nowrap disabled:opacity-60 disabled:cursor-wait"
                    aria-busy={downloading}
                >
                    {downloadLabel}
                </button>

                <button
                    onClick={onDeleteSelected}
                    className="text-xs font-medium px-3 py-2 bg-background-secondary text-accent-red hover:bg-accent-red/10 transition-colors whitespace-nowrap"
                >
                    Delete
                </button>

                <button
                    onClick={onClearSelection}
                    className="flex items-center justify-center w-8 py-2 bg-background-secondary text-foreground-muted hover:bg-background-hover hover:text-foreground transition-colors"
                    aria-label="Clear selection"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
