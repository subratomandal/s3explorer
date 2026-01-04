/**
 * @fileoverview Upload progress bar component.
 * Displays a progress indicator during file uploads.
 */

import { Spinner } from './Spinner';

interface UploadProgressProps {
    /** Whether an upload is in progress */
    uploading: boolean;
    /** Upload progress percentage (0-100) */
    progress: number;
}

/**
 * Progress bar component shown during file uploads.
 * 
 * Features:
 * - Animated spinner icon
 * - Percentage text
 * - Gradient-filled progress bar
 * - Slides in from top with animation
 * 
 * @param props - Component props
 * @param props.uploading - Whether to show the component
 * @param props.progress - Progress percentage (0-100)
 * @returns Progress bar element, or null when not uploading
 */
export function UploadProgress({ uploading, progress }: UploadProgressProps) {
    // Don't render anything when not uploading
    if (!uploading) return null;

    return (
        <div className="px-4 py-3 border-b border-border bg-background-secondary animate-fadeInDown">
            <div className="flex items-center gap-3">
                {/* Loading spinner */}
                <Spinner className="w-4 h-4 text-accent-pink" />

                <div className="flex-1">
                    {/* Progress text */}
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm">Uploading...</span>
                        <span className="text-sm text-foreground-muted">{progress}%</span>
                    </div>

                    {/* Progress bar */}
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
