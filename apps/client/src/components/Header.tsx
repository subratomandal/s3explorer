import { useState } from 'react';
import { ChevronLeft, RefreshCw, FolderPlus, Upload, Menu, Search, Command } from 'lucide-react';

interface HeaderProps {
    selectedBucket: string | null;
    currentPath: string;
    loading: boolean;
    onOpenSidebar: () => void;
    onGoBack: () => void;
    onNavigateToRoot: () => void;
    onNavigateToBreadcrumb: (index: number) => void;
    onRefresh: () => void;
    onNewFolder: () => void;
    onUpload: (files: File[]) => void;
    onOpenCommandPalette?: () => void;
}

export function Header({
    selectedBucket,
    currentPath,
    loading,
    onOpenSidebar,
    onGoBack,
    onNavigateToRoot,
    onNavigateToBreadcrumb,
    onRefresh,
    onNewFolder,
    onUpload,
    onOpenCommandPalette,
}: HeaderProps) {
    const [isSpinning, setIsSpinning] = useState(false);

    const breadcrumbs = currentPath.split('/').filter(Boolean);

    const handleRefresh = () => {
        setIsSpinning(true);
        onRefresh();
        setTimeout(() => setIsSpinning(false), 500);
    };

    // Truncate breadcrumbs if too many - fewer on mobile
    const maxBreadcrumbs = typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 2;
    const showEllipsis = breadcrumbs.length > maxBreadcrumbs;
    const displayBreadcrumbs = showEllipsis
        ? breadcrumbs.slice(-maxBreadcrumbs)
        : breadcrumbs;

    // Truncate text - shorter on mobile
    const truncateText = (text: string, maxLen: number = 20) => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
        const limit = isMobile ? Math.min(maxLen, 12) : maxLen;
        if (text.length <= limit) return text;
        return text.slice(0, limit) + '...';
    };

    return (
        <header className="h-14 flex items-center justify-between px-2 sm:px-4 border-b border-border bg-background-secondary/50 flex-shrink-0 relative" role="banner">
            {/* Left Section - Navigation */}
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-shrink-0 max-w-[45%] sm:max-w-[280px] z-10">
                <button
                    onClick={onOpenSidebar}
                    className="btn btn-ghost btn-icon md:hidden flex-shrink-0 w-9 h-9"
                    aria-label="Open sidebar menu"
                >
                    <Menu className="w-5 h-5" aria-hidden="true" />
                </button>

                {currentPath && (
                    <button
                        onClick={onGoBack}
                        className="btn btn-ghost btn-icon flex-shrink-0 w-9 h-9"
                        aria-label="Go back to parent folder"
                    >
                        <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                    </button>
                )}

                <nav className="flex items-center gap-1 text-sm min-w-0 overflow-hidden" aria-label="Breadcrumb navigation">
                    <button
                        onClick={onNavigateToRoot}
                        className={`flex-shrink-0 truncate max-w-[100px] sm:max-w-none ${currentPath ? 'text-foreground-muted hover:text-foreground' : 'font-medium'}`}
                        title={selectedBucket || undefined}
                        aria-label={selectedBucket ? `Navigate to bucket root: ${selectedBucket}` : 'Select bucket'}
                        aria-current={!currentPath ? 'page' : undefined}
                    >
                        {selectedBucket ? truncateText(selectedBucket, 20) : 'Select bucket'}
                    </button>

                    {showEllipsis && (
                        <span className="flex items-center gap-1 text-foreground-muted flex-shrink-0" aria-hidden="true">
                            <span>/</span>
                            <span>...</span>
                        </span>
                    )}

                    {displayBreadcrumbs.map((part, i) => {
                        const actualIndex = showEllipsis ? breadcrumbs.length - maxBreadcrumbs + i : i;
                        const isLast = actualIndex === breadcrumbs.length - 1;
                        return (
                            <span key={actualIndex} className="flex items-center gap-1 min-w-0">
                                <span className="text-foreground-muted flex-shrink-0" aria-hidden="true">/</span>
                                <button
                                    onClick={() => onNavigateToBreadcrumb(actualIndex)}
                                    className={`truncate max-w-[60px] sm:max-w-none ${isLast ? 'font-medium' : 'text-foreground-muted hover:text-foreground'}`}
                                    title={part}
                                    aria-label={`Navigate to folder: ${part}`}
                                    aria-current={isLast ? 'page' : undefined}
                                >
                                    {truncateText(part, 20)}
                                </button>
                            </span>
                        );
                    })}
                </nav>
            </div>

            {/* Center Section - Search (Absolutely positioned for true center) */}
            {onOpenCommandPalette && (
                <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
                    <button
                        onClick={onOpenCommandPalette}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-sm text-foreground-muted hover:text-foreground bg-background-tertiary hover:bg-background-hover border border-border hover:border-border-hover rounded-md transition-all w-[170px]"
                        aria-label="Open command palette (Cmd+K)"
                    >
                        <Search className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                        <span className="text-xs">Search...</span>
                        <kbd className="flex items-center gap-0.5 px-1 py-0.5 text-[10px] font-medium bg-background border border-border rounded ml-auto" aria-hidden="true">
                            <Command className="w-2.5 h-2.5" />
                            <span>K</span>
                        </kbd>
                    </button>
                </div>
            )}

            {/* Right Section - Actions */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 z-10" role="toolbar" aria-label="File actions">
                {selectedBucket && (
                    <>
                        <button
                            onClick={onNewFolder}
                            className="btn btn-secondary h-9 sm:h-9 px-2 sm:px-3"
                            aria-label="Create new folder"
                        >
                            <FolderPlus className="w-5 h-5 sm:w-4 sm:h-4" aria-hidden="true" />
                            <span className="hidden md:inline text-sm">Folder</span>
                        </button>

                        <label className="btn btn-primary cursor-pointer h-9 sm:h-9 px-2 sm:px-3" tabIndex={0} role="button" aria-label="Upload files">
                            <Upload className="w-5 h-5 sm:w-4 sm:h-4" aria-hidden="true" />
                            <span className="hidden sm:inline text-sm">Upload</span>
                            <input
                                type="file"
                                multiple
                                className="sr-only"
                                onChange={e => e.target.files && onUpload(Array.from(e.target.files))}
                                aria-label="Select files to upload"
                            />
                        </label>
                    </>
                )}

                <button
                    onClick={handleRefresh}
                    disabled={!selectedBucket || loading}
                    className="btn btn-ghost btn-icon w-9 h-9"
                    aria-label={loading ? 'Refreshing...' : 'Refresh file list'}
                >
                    <RefreshCw className={`w-5 h-5 ${isSpinning ? 'animate-spin-once' : ''}`} aria-hidden="true" />
                </button>
            </div>
        </header>
    );
}
