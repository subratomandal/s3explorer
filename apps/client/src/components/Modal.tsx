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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fadeIn" onClick={onClose}>
            <div className={`w-full ${sizeClasses[size]} modal-content bg-background-secondary border border-border rounded-xl overflow-hidden shadow-2xl`} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h2 className="text-base font-semibold text-foreground">{title}</h2>
                    <button onClick={onClose} className="btn btn-ghost btn-icon text-foreground-muted hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}
