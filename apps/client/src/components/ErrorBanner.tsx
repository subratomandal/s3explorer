import { X } from 'lucide-react';

interface ErrorBannerProps {
    error: string | null;
    onDismiss: () => void;
}

export function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
    if (!error) return null;

    return (
        <div
            className="px-4 py-3 bg-accent-red/10 border-b border-accent-red/20 flex items-center justify-between animate-fadeInDown"
            role="alert"
            aria-live="assertive"
        >
            <span className="text-sm text-accent-red">{error}</span>

            <button
                onClick={onDismiss}
                className="btn btn-ghost btn-icon text-accent-red"
                aria-label="Dismiss error"
            >
                <X className="w-4 h-4" aria-hidden="true" />
            </button>
        </div>
    );
}
