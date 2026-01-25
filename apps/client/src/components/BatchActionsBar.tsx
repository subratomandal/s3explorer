import { X, Trash2 } from 'lucide-react';

interface BatchActionsBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onDeleteSelected: () => void;
}

export function BatchActionsBar({
    selectedCount,
    onClearSelection,
    onDeleteSelected,
}: BatchActionsBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slideUp">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-background-secondary border border-border rounded-xl shadow-lg">
                <span className="text-sm text-foreground-secondary mr-2">
                    {selectedCount} selected
                </span>



                <button
                    onClick={onDeleteSelected}
                    className="btn btn-ghost btn-sm gap-1.5 text-accent-red hover:bg-accent-red/10"
                    aria-label="Delete selected"
                >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Delete</span>
                </button>

                <div className="w-px h-5 bg-border mx-1" />

                <button
                    onClick={onClearSelection}
                    className="btn btn-ghost btn-icon w-7 h-7"
                    aria-label="Clear selection"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
