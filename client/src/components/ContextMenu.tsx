// v 1.0
/**
 * @fileoverview Context menu components for right-click actions.
 * Provides a positioned dropdown menu that appears on right-click.
 */

import { useEffect, useRef } from 'react';

// ============================================================================
// CONTEXT MENU CONTAINER
// ============================================================================

interface ContextMenuProps {
    /** X position in pixels from left edge of viewport */
    x: number;
    /** Y position in pixels from top edge of viewport */
    y: number;
    /** Callback fired when menu should close */
    onClose: () => void;
    /** Menu items to render */
    children: React.ReactNode;
}

/**
 * Positioned context menu container that appears on right-click.
 * 
 * Features:
 * - Automatically adjusts position to stay within viewport
 * - Closes when clicking outside
 * - Animated entrance
 * 
 * @param props - Component props
 * @param props.x - Horizontal position (e.g., from mouse event clientX)
 * @param props.y - Vertical position (e.g., from mouse event clientY)
 * @param props.onClose - Handler called when menu should close
 * @param props.children - ContextMenuItem components
 * 
 * @example
 * <ContextMenu x={event.clientX} y={event.clientY} onClose={handleClose}>
 *   <ContextMenuItem icon={Edit3} label="Rename" onClick={handleRename} />
 *   <ContextMenuItem icon={Trash2} label="Delete" onClick={handleDelete} danger />
 * </ContextMenu>
 */
export function ContextMenu({ x, y, onClose, children }: ContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Close menu when clicking outside
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        window.addEventListener('mousedown', handleClick);
        return () => window.removeEventListener('mousedown', handleClick);
    }, [onClose]);

    // Adjust position to keep menu within viewport
    const adjustedX = Math.min(x, window.innerWidth - 180);
    const adjustedY = Math.min(y, window.innerHeight - 160);

    return (
        <div
            ref={ref}
            className="fixed z-50 card py-1.5 min-w-[160px] context-menu"
            style={{ left: adjustedX, top: adjustedY }}
        >
            {children}
        </div>
    );
}

// ============================================================================
// CONTEXT MENU ITEM
// ============================================================================

interface ContextMenuItemProps {
    /** Lucide icon component to display */
    icon: React.ElementType;
    /** Text label for the menu item */
    label: string;
    /** Click handler */
    onClick: () => void;
    /** If true, displays in red for destructive actions */
    danger?: boolean;
}

/**
 * Individual item within a ContextMenu.
 * 
 * @param props - Component props
 * @param props.icon - Lucide icon to show before label
 * @param props.label - Menu item text
 * @param props.onClick - Handler called when item is clicked
 * @param props.danger - If true, item appears in red (for delete actions)
 * 
 * @example
 * <ContextMenuItem icon={Download} label="Download" onClick={handleDownload} />
 * <ContextMenuItem icon={Trash2} label="Delete" onClick={handleDelete} danger />
 */
export function ContextMenuItem({ icon: Icon, label, onClick, danger = false }: ContextMenuItemProps) {
    // Apply danger styling if specified
    const colorClasses = danger
        ? 'text-accent-red hover:bg-accent-red/10'
        : 'text-foreground-secondary hover:bg-background-hover hover:text-foreground';

    return (
        <button
            onClick={onClick}
            className={`context-menu-item w-full flex items-center gap-3 px-3.5 py-2 text-sm ${colorClasses}`}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );
}
