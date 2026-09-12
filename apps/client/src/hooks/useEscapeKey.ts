import { useEffect, useRef } from 'react';

// Escape-to-close for the confirm dialogs that don't render through <Modal>.
// Listens in the capture phase and stops propagation so a confirm dialog stacked
// on top of a Modal (e.g. "Delete Connection" inside the Connection Manager)
// closes on its own instead of taking the whole modal down with it.
export function useEscapeKey(onEscape: () => void, enabled: boolean = true) {
    // Ref so an inline arrow callback doesn't re-attach the listener every render
    const onEscapeRef = useRef(onEscape);
    useEffect(() => {
        onEscapeRef.current = onEscape;
    });

    useEffect(() => {
        if (!enabled) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.stopPropagation();
            onEscapeRef.current();
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [enabled]);
}
