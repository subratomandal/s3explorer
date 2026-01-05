import { useEffect, useRef } from 'react';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    children: React.ReactNode;
}

export function ContextMenu({ x, y, onClose, children }: ContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        window.addEventListener('mousedown', handleClick);
        return () => window.removeEventListener('mousedown', handleClick);
    }, [onClose]);

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

interface ContextMenuItemProps {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    danger?: boolean;
}

export function ContextMenuItem({ icon: Icon, label, onClick, danger = false }: ContextMenuItemProps) {
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
