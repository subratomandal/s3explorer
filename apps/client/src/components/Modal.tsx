import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    isOpen?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function Modal({ title, children, onClose, isOpen = true, size = 'md' }: ModalProps) {
    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleEscape);

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleEscape);
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
            aria-labelledby="modal-title"
        >
            <div
                className={`w-full ${sizeClasses[size]} modal-content bg-background-secondary border border-border sm:rounded-xl rounded-t-xl overflow-hidden shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                    <h2 id="modal-title" className="text-sm font-semibold text-foreground">{title}</h2>
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
