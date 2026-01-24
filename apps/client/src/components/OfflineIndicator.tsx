import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflineIndicatorProps {
    isOnline: boolean;
    isBackendReachable: boolean;
}

export function OfflineIndicator({ isOnline, isBackendReachable }: OfflineIndicatorProps) {
    // Don't show if everything is fine
    if (isOnline && isBackendReachable) return null;

    const message = !isOnline
        ? 'No internet connection'
        : 'Unable to reach server';

    const handleRetry = () => {
        window.location.reload();
    };

    return (
        <div
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up-fade"
            role="alert"
            aria-live="assertive"
        >
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-accent-red/15 border border-accent-purple/40 shadow-lg backdrop-blur-sm">
                <WifiOff className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span className="text-xs sm:text-sm text-foreground font-medium">{message}</span>
                <button
                    onClick={handleRetry}
                    className="flex items-center gap-1 sm:gap-1.5 text-xs text-accent-red hover:text-accent-red/80 transition-colors ml-1 sm:ml-2"
                    aria-label="Retry connection"
                >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                </button>
            </div>
        </div>
    );
}
