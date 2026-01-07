import { useState } from 'react';
import { ChevronLeft, RefreshCw, FolderPlus, Upload, Menu, Search, Command, Settings, LogOut } from 'lucide-react';

interface HeaderProps {
    selectedBucket: string | null;
    currentPath: string;
    loading: boolean;
    activeConnectionName?: string;
    onOpenSidebar: () => void;
    onGoBack: () => void;
    onNavigateToRoot: () => void;
    onNavigateToBreadcrumb: (index: number) => void;
    onRefresh: () => void;
    onNewFolder: () => void;
    onUpload: (files: File[]) => void;
    onOpenCommandPalette?: () => void;
    onOpenConnections?: () => void;
    onLogout?: () => void;
}

export function Header({
    selectedBucket,
    currentPath,
    loading,
    activeConnectionName,
    onOpenSidebar,
    onGoBack,
    onNavigateToRoot,
    onNavigateToBreadcrumb,
    onRefresh,
    onNewFolder,
    onUpload,
    onOpenCommandPalette,
    onOpenConnections,
    onLogout,
}: HeaderProps) {
    const [isSpinning, setIsSpinning] = useState(false);

    const breadcrumbs = currentPath.split('/').filter(Boolean);

    const handleRefresh = () => {
        setIsSpinning(true);
        onRefresh();
        setTimeout(() => setIsSpinning(false), 500);
    };

    // Truncate breadcrumbs if too many
    const maxBreadcrumbs = 2;
    const showEllipsis = breadcrumbs.length > maxBreadcrumbs;
    const displayBreadcrumbs = showEllipsis
        ? breadcrumbs.slice(-maxBreadcrumbs)
        : breadcrumbs;

    return (
        <header className="h-14 flex items-center px-4 border-b border-border bg-background-secondary/50 flex-shrink-0">
            {/* Left Section - Navigation */}
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0 max-w-[200px]">
                <button onClick={onOpenSidebar} className="btn btn-ghost btn-icon md:hidden flex-shrink-0">
                    <Menu className="w-5 h-5" />
                </button>

                {currentPath && (
                    <button onClick={onGoBack} className="btn btn-ghost btn-icon flex-shrink-0">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                )}

                <nav className="flex items-center gap-1 text-sm min-w-0 overflow-hidden">
                    <button
                        onClick={onNavigateToRoot}
                        className={`truncate max-w-[80px] flex-shrink-0 ${currentPath ? 'text-foreground-muted hover:text-foreground' : 'font-medium'}`}
                        title={selectedBucket || undefined}
                    >
                        {selectedBucket || 'Select bucket'}
                    </button>

                    {showEllipsis && (
                        <span className="flex items-center gap-1 text-foreground-muted flex-shrink-0">
                            <span>/</span>
                            <span>...</span>
                        </span>
                    )}

                    {displayBreadcrumbs.map((part, i) => {
                        const actualIndex = showEllipsis ? breadcrumbs.length - maxBreadcrumbs + i : i;
                        return (
                            <span key={actualIndex} className="flex items-center gap-1 min-w-0">
                                <span className="text-foreground-muted flex-shrink-0">/</span>
                                <button
                                    onClick={() => onNavigateToBreadcrumb(actualIndex)}
                                    className={`truncate max-w-[60px] ${actualIndex === breadcrumbs.length - 1 ? 'font-medium' : 'text-foreground-muted hover:text-foreground'}`}
                                    title={part}
                                >
                                    {part}
                                </button>
                            </span>
                        );
                    })}
                </nav>
            </div>

            {/* Center Section - Search */}
            <div className="flex-1 flex justify-center px-4">
                {onOpenCommandPalette && (
                    <button
                        onClick={onOpenCommandPalette}
                        className="hidden sm:flex items-center gap-2 px-4 py-1.5 text-sm text-foreground-muted hover:text-foreground bg-background-tertiary hover:bg-background-hover border border-border hover:border-border-hover rounded-lg transition-all max-w-[280px] w-full justify-center"
                    >
                        <Search className="w-4 h-4 flex-shrink-0" />
                        <span className="text-xs">Search...</span>
                        <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-background border border-border rounded ml-auto">
                            <Command className="w-2.5 h-2.5" />
                            <span>K</span>
                        </kbd>
                    </button>
                )}
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {selectedBucket && (
                    <>
                        <button onClick={onNewFolder} className="btn btn-secondary h-9 px-3">
                            <FolderPlus className="w-4 h-4" />
                            <span className="hidden sm:inline text-sm">Folder</span>
                        </button>

                        <label className="btn btn-primary cursor-pointer h-9 px-3">
                            <Upload className="w-4 h-4" />
                            <span className="text-sm">Upload</span>
                            <input
                                type="file"
                                multiple
                                className="sr-only"
                                onChange={e => e.target.files && onUpload(Array.from(e.target.files))}
                            />
                        </label>
                    </>
                )}

                <button
                    onClick={handleRefresh}
                    disabled={!selectedBucket || loading}
                    className="btn btn-ghost btn-icon"
                    title="Refresh"
                >
                    <RefreshCw className={`w-5 h-5 ${isSpinning ? 'animate-spin-once' : ''}`} />
                </button>

                {onOpenConnections && (
                    <button
                        onClick={onOpenConnections}
                        className="btn btn-ghost btn-icon"
                        title={activeConnectionName ? `Connected: ${activeConnectionName}` : 'Connection Settings'}
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                )}

                {onLogout && (
                    <button
                        onClick={onLogout}
                        className="btn btn-ghost btn-icon text-foreground-muted hover:text-accent-red"
                        title="Logout"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                )}
            </div>
        </header>
    );
}
