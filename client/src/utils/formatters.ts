// v 1.0
/**
 * @fileoverview Utility functions for formatting data for display.
 * Contains functions for human-readable byte sizes and relative timestamps.
 */

/**
 * Converts bytes to a human-readable string with appropriate unit.
 * Uses binary prefixes (1 KB = 1024 bytes).
 * 
 * @param bytes - The number of bytes to format
 * @returns Formatted string like "1.5 MB" or "—" for zero bytes
 * 
 * @example
 * formatBytes(0)        // "—"
 * formatBytes(1024)     // "1 KB"
 * formatBytes(1536000)  // "1.5 MB"
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Formats an ISO date string to a human-readable relative time.
 * Shows "Just now", "Xm ago", "Xh ago", "Yesterday", "Xd ago", or a short date.
 * 
 * @param dateStr - ISO date string to format, or undefined
 * @returns Human-readable relative time string, or "—" for missing dates
 * 
 * @example
 * formatDate(undefined)                    // "—"
 * formatDate(new Date().toISOString())     // "Just now"
 * formatDate('2024-01-01T12:00:00Z')       // "Jan 1" (if more than 7 days ago)
 */
export function formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    // Within the same day
    if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
            const minutes = Math.floor(diff / (1000 * 60));
            return minutes <= 1 ? 'Just now' : `${minutes}m ago`;
        }
        return `${hours}h ago`;
    }

    // Yesterday
    if (days === 1) return 'Yesterday';

    // Within the last week
    if (days < 7) return `${days}d ago`;

    // Older than a week - show short date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
