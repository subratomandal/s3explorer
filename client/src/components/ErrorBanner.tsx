/**
 * @fileoverview Error banner component.
 * Displays dismissible error messages at the top of the content area.
 */

import { X } from 'lucide-react';

interface ErrorBannerProps {
    /** Error message to display, or null to hide */
    error: string | null;
    /** Handler when dismiss button is clicked */
    onDismiss: () => void;
}

/**
 * Dismissible error message banner.
 * 
 * Features:
 * - Red-tinted background and text
 * - Dismiss (X) button
 * - Animated slide-in from top
 * 
 * @param props - Component props
 * @param props.error - Error message string, or null to hide
 * @param props.onDismiss - Handler to clear the error
 * @returns Error banner element, or null when no error
 */
export function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
    // Don't render anything when there's no error
    if (!error) return null;

    return (
        <div className="px-4 py-3 bg-accent-red/10 border-b border-accent-red/20 flex items-center justify-between animate-fadeInDown">
            {/* Error message text */}
            <span className="text-sm text-accent-red">{error}</span>

            {/* Dismiss button */}
            <button onClick={onDismiss} className="btn btn-ghost btn-icon text-accent-red">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
