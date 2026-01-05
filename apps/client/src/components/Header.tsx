import { useState } from 'react';
import { ChevronLeft, RefreshCw, FolderPlus, Upload, Menu, Search, Command, Settings } from 'lucide-react';

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
}: HeaderProps) {
    const [isSpinning, setIsSpinning] = useState(false);

    const breadcrumbs = currentPath.split('/').filter(Boolean);

    const handleRefresh = () => {
        setIsSpinning(true);
        onRefresh();
        setTimeout(() => setIsSpinning(false), 500);
    };

    return (
        <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-background-secondary/50 flex-shrink-0">

            <div className="flex items-center gap-3 min-w-0">
                <button onClick={onOpenSidebar} className="btn btn-ghost btn-icon md:hidden">
                    <Menu className="w-5 h-5" />
                </button>

                {currentPath && (
                    <button onClick={onGoBack} className="btn btn-ghost btn-icon">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                )}

                <nav className="flex items-center gap-1 text-sm min-w-0">
                    <button
                        onClick={onNavigateToRoot}
                        className={`truncate max-w-[120px] ${currentPath ? 'text-foreground-muted hover:text-foreground' : 'font-medium'}`}
                    >
                        {selectedBucket || 'Select bucket'}
                    </button>

                    {breadcrumbs.map((part, i) => (
                        <span key={i} className="flex items-center gap-1 min-w-0">
                            <span className="text-foreground-muted flex-shrink-0">/</span>
                            <button
                                onClick={() => onNavigateToBreadcrumb(i)}
                                className={`truncate max-w-[100px] ${i === breadcrumbs.length - 1 ? 'font-medium' : 'text-foreground-muted hover:text-foreground'}`}
                            >
                                {part}
                            </button>
                        </span>
                    ))}
                </nav>
            </div>

            <div className="flex items-center gap-2">
                {onOpenCommandPalette && (
                    <button
                        onClick={onOpenCommandPalette}
                        className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-foreground-muted hover:text-foreground bg-background-tertiary hover:bg-background-hover border border-border hover:border-border-hover rounded-lg transition-all"
                    >
                        <Search className="w-4 h-4" />
                        <span className="text-xs">Search...</span>
                        <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-background border border-border rounded ml-2">
                            <Command className="w-2.5 h-2.5" />
                            <span>K</span>
                        </kbd>
                    </button>
                )}

                {onOpenConnections && (
                    <button
                        onClick={onOpenConnections}
                        className="btn btn-ghost btn-icon"
                        title={activeConnectionName ? `Connected: ${activeConnectionName}` : 'Connection Settings'}
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                )}

                <button
                    onClick={handleRefresh}
                    disabled={!selectedBucket || loading}
                    className="btn btn-ghost btn-icon"
                >
                    <RefreshCw className={`w-5 h-5 ${isSpinning ? 'animate-spin-once' : ''}`} />
                </button>

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
            </div>
        </header>
    );
}
