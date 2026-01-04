/**
 * @fileoverview Drag and drop overlay component.
 * Displays a visual indicator when files are being dragged over the drop zone.
 */

import { Upload } from 'lucide-react';

interface DropOverlayProps {
    /** Whether files are currently being dragged over the drop zone */
    isDragActive: boolean;
}

/**
 * Full-screen overlay shown when dragging files over the upload area.
 * 
 * Features:
 * - Semi-transparent background
 * - Dashed border visual indicator
 * - Gradient upload icon
 * - "Drop to upload" text
 * 
 * @param props - Component props
 * @param props.isDragActive - Whether to show the overlay
 * @returns Overlay element, or null when not dragging
 */
export function DropOverlay({ isDragActive }: DropOverlayProps) {
    // Don't render anything when not dragging
    if (!isDragActive) return null;

    return (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/95 border-2 border-dashed border-accent-pink">
            <div className="text-center">
                {/* Large upload icon with gradient background */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-white" />
                </div>
                {/* Instruction text */}
                <p className="text-base font-medium">Drop to upload</p>
            </div>
        </div>
    );
}
