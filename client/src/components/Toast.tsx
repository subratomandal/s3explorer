// v 1.0
/**
 * @fileoverview Toast notification component.
 * Displays temporary success/error messages that auto-dismiss.
 */

import { useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface ToastProps {
    /** The message to display */
    message: string;
    /** Toast type - determines color scheme (green or red) */
    type?: 'success' | 'error';
    /** Callback fired when toast should be dismissed */
    onClose: () => void;
}

/**
 * An auto-dismissing toast notification component.
 * 
 * Features:
 * - Slides in from the right
 * - Auto-dismisses after 3 seconds
 * - Different styling for success (green) and error (red) states
 * - Icon indicating the type
 * 
 * @param props - Component props
 * @param props.message - Text to display in the toast
 * @param props.type - 'success' (default) or 'error'
 * @param props.onClose - Handler called when toast should close
 * 
 * @example
 * <Toast message="File uploaded successfully" type="success" onClose={() => setToast(null)} />
 * <Toast message="Upload failed" type="error" onClose={() => setToast(null)} />
 */
export function Toast({ message, type = 'success', onClose }: ToastProps) {
    useEffect(() => {
        // Auto-dismiss after 3 seconds
        const timeout = setTimeout(onClose, 3000);
        return () => clearTimeout(timeout);
    }, [onClose]);

    // Determine styling based on type
    const isSuccess = type === 'success';
    const bgColor = isSuccess ? 'bg-accent-green/20' : 'bg-accent-red/20';
    const textColor = isSuccess ? 'text-accent-green' : 'text-accent-red';
    const borderColor = isSuccess ? 'border-accent-green/30' : 'border-accent-red/30';
    const iconBg = isSuccess ? 'bg-accent-green' : 'bg-accent-red';

    return (
        <div className={`toast fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${bgColor} ${textColor} border ${borderColor}`}>
            {/* Type indicator icon */}
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${iconBg}`}>
                {isSuccess ? (
                    <Check className="w-3 h-3 text-background" />
                ) : (
                    <X className="w-3 h-3 text-background" />
                )}
            </div>
            {message}
        </div>
    );
}
