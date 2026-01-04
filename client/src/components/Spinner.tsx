/**
 * @fileoverview Reusable loading spinner component.
 * Displays an animated SVG spinner for loading states.
 */

interface SpinnerProps {
    /** Additional CSS classes to apply to the spinner */
    className?: string;
}

/**
 * A circular loading spinner component.
 * Uses SVG with CSS animation for smooth spinning effect.
 * 
 * @param props - Component props
 * @param props.className - Additional CSS classes (optional)
 * @returns Animated SVG spinner element
 * 
 * @example
 * <Spinner className="w-4 h-4 text-accent-pink" />
 */
export function Spinner({ className = '' }: SpinnerProps) {
    return (
        <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
            {/* Background circle - semi-transparent */}
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            {/* Animated arc - visible portion that creates spinning effect */}
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
    );
}
