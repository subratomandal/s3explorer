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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 modal-backdrop animate-fadeIn" onClick={onClose}>
            <div className={`w-full ${sizeClasses[size]} modal-content bg-background-secondary border border-border sm:rounded-xl rounded-t-xl overflow-hidden shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col`} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-border flex-shrink-0">
                    <h2 className="text-base font-semibold text-foreground">{title}</h2>
                    <button onClick={onClose} className="btn btn-ghost btn-icon w-9 h-9 text-foreground-muted hover:text-foreground">
                        <X className="w-5 h-5 sm:w-4 sm:h-4" />
                    </button>
                </div>
                <div className="p-4 sm:p-5 overflow-y-auto flex-1">{children}</div>
            </div>
        </div>
    );
}
