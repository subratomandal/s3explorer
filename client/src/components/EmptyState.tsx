// v 1.0
/**
 * @fileoverview Empty state placeholder component.
 * Displays a centered message with icon when there's no content to show.
 */

interface EmptyStateProps {
    /** The Lucide icon component to display */
    icon: React.ElementType;
    /** Main heading text */
    title: string;
    /** Secondary description text */
    description: string;
}

/**
 * Empty state component for when there's no data to display.
 * Shows a large icon, title, and description in a centered layout.
 * 
 * @param props - Component props
 * @param props.icon - Lucide icon component (e.g., Folder, Database)
 * @param props.title - Main message (e.g., "No bucket selected")
 * @param props.description - Supporting text (e.g., "Select a bucket from the sidebar")
 * 
 * @example
 * <EmptyState 
 *   icon={Folder} 
 *   title="Empty folder" 
 *   description="Drop files here to upload" 
 * />
 */
export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full py-20 text-center empty-state px-4">
            {/* Icon container with background */}
            <div className="w-16 h-16 rounded-xl bg-background-tertiary flex items-center justify-center mb-4 empty-state-icon">
                <Icon className="w-8 h-8 text-foreground-muted" />
            </div>
            {/* Title */}
            <h3 className="text-base font-medium mb-2">{title}</h3>
            {/* Description */}
            <p className="text-sm text-foreground-muted max-w-[240px]">{description}</p>
        </div>
    );
}
