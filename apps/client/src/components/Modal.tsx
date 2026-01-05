import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
}

export function Modal({ title, children, onClose }: ModalProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleEscape);

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fadeIn" onClick={onClose}>
            <div className="card w-full max-w-md modal-content" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h2 className="text-base font-semibold">{title}</h2>
                    <button onClick={onClose} className="btn btn-ghost btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}
