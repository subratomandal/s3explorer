interface EmptyStateProps {
    icon: React.ElementType;
    title: string;
    description: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full py-20 text-center empty-state px-4">
            <div className="w-16 h-16 rounded-xl bg-background-tertiary flex items-center justify-center mb-4 empty-state-icon">
                <Icon className="w-8 h-8 text-foreground-muted" />
            </div>
            <h3 className="text-base font-medium mb-2">{title}</h3>
            <p className="text-sm text-foreground-muted max-w-[240px]">{description}</p>
        </div>
    );
}
