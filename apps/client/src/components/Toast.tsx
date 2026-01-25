import { useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error';
    onClose: () => void;
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
    useEffect(() => {
        const timeout = setTimeout(onClose, 3000);
        return () => clearTimeout(timeout);
    }, [onClose]);

    const isSuccess = type === 'success';
    const bgColor = isSuccess ? 'bg-accent-green/20' : 'bg-accent-red/20';
    const textColor = isSuccess ? 'text-accent-green' : 'text-accent-red';
    const borderColor = isSuccess ? 'border-accent-green/30' : 'border-accent-red/30';
    const iconBg = isSuccess ? 'bg-accent-green' : 'bg-accent-red';

    return (
        <div
            className={`toast fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${bgColor} ${textColor} border ${borderColor} dark:border-accent-purple`}
            role="alert"
            aria-live="polite"
        >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${iconBg}`} aria-hidden="true">
                {isSuccess ? (
                    <Check className="w-3 h-3 text-white" />
                ) : (
                    <X className="w-3 h-3 text-white" />
                )}
            </div>
            {message}
        </div>
    );
}
