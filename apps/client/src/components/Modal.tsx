import { useEffect, useRef, useId } from 'react';
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
    const titleId = useId();

    useEffect(() => {
        if (!isOpen) return;

        // Store previously focused element
        previousActiveElement.current = document.activeElement;

        const handleEscape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();

        // Focus trap
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

        // Focus first focusable element
        const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleEscape);
            window.removeEventListener('keydown', handleTab);
            // Restore focus to previously focused element
            (previousActiveElement.current as HTMLElement)?.focus?.();
        };
    }, [onClose, isOpen]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 modal-backdrop"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
        >
            <div
                ref={modalRef}
                className={`w-full ${sizeClasses[size]} modal-content bg-background-secondary border border-border sm:rounded-xl rounded-t-xl overflow-hidden shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                    <h2 id={titleId} className="text-sm font-semibold text-foreground">{title}</h2>
                    <button
                        onClick={onClose}
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
