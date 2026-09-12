import { useEffect, useRef, useId, useCallback } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    isOpen?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function Modal({ title, children, onClose, isOpen = true, size = 'md' }: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<Element | null>(null);
    // Store onClose in a ref so the Escape key effect doesn't re-run when the
    // callback identity changes. Callers almost always pass an inline arrow
    // function, which creates a new reference every render and would otherwise
    // tear down and re-attach the keyboard listener on every single render.
    const onCloseRef = useRef(onClose);
    const titleId = useId();

    useEffect(() => {
        onCloseRef.current = onClose;
    });

    const handleClose = useCallback(() => {
        onCloseRef.current();
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        // Store previously focused element
        previousActiveElement.current = document.activeElement;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };

        // Focus trap: when the user Tabs past the last focusable element, wrap
        // back to the first one (and vice versa with Shift+Tab). This keeps
        // keyboard focus locked inside the modal so it can't escape to the page
        // behind the overlay, which would be disorienting for keyboard users.
        const handleTab = (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !modalRef.current) return;

            const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement?.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement?.focus();
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleEscape);
        window.addEventListener('keydown', handleTab);

        // rAF waits one frame so the DOM is fully painted before we try to
        // focus. Focusing during the same tick as mount can silently fail if
        // the browser hasn't finished layout yet.
        requestAnimationFrame(() => {
            // A form input with autoFocus has already taken focus by now; only fall
            // back to the first focusable element (usually the close button) when
            // nothing inside the modal is focused, so typing right after opening
            // "Create Folder" lands in the field instead of on the X.
            if (modalRef.current?.contains(document.activeElement)) return;
            const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            firstFocusable?.focus();
        });

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleEscape);
            window.removeEventListener('keydown', handleTab);
            // Restore focus to previously focused element
            (previousActiveElement.current as HTMLElement)?.focus?.();
        };
    }, [isOpen, handleClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 modal-backdrop"
            onClick={handleClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
        >
            <div
                ref={modalRef}
                className={`w-full ${sizeClasses[size]} modal-content bg-background-secondary border border-border sm:rounded-lg rounded-t-lg overflow-hidden shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
                    <h2 id={titleId} className="text-sm font-semibold text-foreground">{title}</h2>
                    <button
                        onClick={handleClose}
                        className="btn btn-ghost btn-icon w-8 h-8 text-foreground-muted hover:text-foreground"
                        aria-label="Close modal"
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>
                <div className="p-4 flex-1 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}
