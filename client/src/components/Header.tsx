// v 1.0
/**
 * @fileoverview Header component with navigation and actions.
 * Contains breadcrumb navigation, refresh, and upload controls.
 */

import { ChevronLeft, ChevronRight, RefreshCw, FolderPlus, Upload, Menu } from 'lucide-react';

interface HeaderProps {
    /** Currently selected bucket name, or null */
    selectedBucket: string | null;
    /** Current folder path within the bucket */
    currentPath: string;
    /** Whether data is currently loading */
    loading: boolean;
    /** Handler to open sidebar (mobile) */
    onOpenSidebar: () => void;
    /** Handler for back navigation */
    onGoBack: () => void;
    /** Handler to navigate to bucket root */
    onNavigateToRoot: () => void;
    /** Handler for breadcrumb navigation (receives breadcrumb index) */
    onNavigateToBreadcrumb: (index: number) => void;
    /** Handler to refresh the current view */
    onRefresh: () => void;
    /** Handler to open new folder modal */
    onNewFolder: () => void;
    /** Handler for file upload (receives array of Files) */
    onUpload: (files: File[]) => void;
}

/**
 * Header bar component with navigation and action buttons.
 * 
 * Features:
 * - Mobile menu button (hamburger)
 * - Back button when inside a folder
 * - Breadcrumb navigation (clickable path segments)
 * - Refresh button with loading spinner
 * - New folder button
 * - Upload button with hidden file input
 * 
 * @param props - Component props
 * @returns Header element
 */
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
}: HeaderProps) {
    // Parse current path into breadcrumb segments
    const breadcrumbs = currentPath.split('/').filter(Boolean);

    return (
        <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-background-secondary/50 flex-shrink-0">

            {/* Left side: Navigation */}
            <div className="flex items-center gap-3 min-w-0">
                {/* Mobile menu button */}
                <button onClick={onOpenSidebar} className="btn btn-ghost btn-icon md:hidden">
                    <Menu className="w-5 h-5" />
                </button>

                {/* Back button (only shown when inside a folder) */}
                {currentPath && (
                    <button onClick={onGoBack} className="btn btn-ghost btn-icon">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                )}

                {/* Breadcrumb navigation */}
                <nav className="flex items-center gap-1 text-sm min-w-0">
                    {/* Bucket name (root) */}
                    <button
                        onClick={onNavigateToRoot}
                        className={`truncate max-w-[120px] ${currentPath ? 'text-foreground-muted hover:text-foreground' : 'font-medium'}`}
                    >
                        {selectedBucket || 'Select bucket'}
                    </button>

                    {/* Path segments */}
                    {breadcrumbs.map((part, i) => (
                        <span key={i} className="flex items-center gap-1 min-w-0">
                            <ChevronRight className="w-4 h-4 text-foreground-muted flex-shrink-0" />
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

            {/* Right side: Actions */}
            <div className="flex items-center gap-2">
                {/* Refresh button */}
                <button
                    onClick={onRefresh}
                    disabled={!selectedBucket || loading}
                    className="btn btn-ghost btn-icon"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>

                {/* Action buttons (only shown when bucket is selected) */}
                {selectedBucket && (
                    <>
                        {/* New folder button */}
                        <button onClick={onNewFolder} className="btn btn-secondary">
                            <FolderPlus className="w-4 h-4" />
                            <span className="hidden sm:inline">Folder</span>
                        </button>

                        {/* Upload button with hidden file input */}
                        <label className="btn btn-primary cursor-pointer">
                            <Upload className="w-4 h-4" />
                            <span>Upload</span>
                            <input
                                type="file"
                                multiple
                                className="hidden"
                                onChange={e => e.target.files && onUpload(Array.from(e.target.files))}
                            />
                        </label>
                    </>
                )}
            </div>
        </header>
    );
}
