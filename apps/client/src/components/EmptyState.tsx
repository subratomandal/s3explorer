interface EmptyStateProps {
    icon: React.ElementType;
    title: string;
    description: string;
    action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full py-16 text-center empty-state px-4">
            <div className="w-14 h-14 rounded-xl bg-background-tertiary flex items-center justify-center mb-4 empty-state-icon border border-border">
                <Icon className="w-7 h-7 text-foreground-muted" />
            </div>
            <h3 className="text-base font-medium mb-1.5">{title}</h3>
            <p className="text-sm text-foreground-muted max-w-[220px]">{description}</p>
            {action && <div className="flex justify-center w-full">{action}</div>}
        </div>
    );
}
