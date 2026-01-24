import { useState } from 'react';
import { Trash2, AlertTriangle, Folder, FileText } from 'lucide-react';
import { getFileName } from '../../utils/fileUtils';
import type { S3Object } from '../../types';

interface DeleteModalProps {
    object: S3Object | null;
    onClose: () => void;
    onDelete: () => Promise<void> | void;
}

export function DeleteModal({ object, onClose, onDelete }: DeleteModalProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    if (!object) return null;

    const handleDelete = async () => {
        if (isDeleting) return;
        setIsDeleting(true);
        try {
            await onDelete();
        } finally {
            setIsDeleting(false);
        }
    };

    const fileName = getFileName(object.key);
    const isFolder = object.isFolder;

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="bg-background-secondary border border-border rounded-xl p-6 max-w-md w-full shadow-2xl animate-scaleIn"
                onClick={e => e.stopPropagation()}
            >
                {/* Header with icon */}
                <div className="flex items-center gap-4 mb-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isFolder ? 'bg-accent-red/15' : 'bg-accent-red/10'
                    }`}>
                        <Trash2 className="w-6 h-6 text-accent-red" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">
                            Delete {isFolder ? 'Folder' : 'File'}
                        </h3>
                        <p className="text-sm text-foreground-muted mt-0.5">
                            This action cannot be undone
                        </p>
                    </div>
                </div>

                {/* File/Folder info */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background-tertiary mb-4">
                    {isFolder ? (
                        <Folder className="w-5 h-5 text-accent-purple flex-shrink-0" />
                    ) : (
                        <FileText className="w-5 h-5 text-foreground-muted flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium text-foreground truncate" title={fileName}>
                        {fileName}
                    </span>
                </div>

                {/* Warning for folders */}
                {isFolder && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-accent-yellow/10 mb-5">
                        <AlertTriangle className="w-5 h-5 text-accent-yellow flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="text-foreground font-medium">All contents will be deleted</p>
                            <p className="text-foreground-muted mt-1">
                                This includes all files and subfolders inside this folder.
                            </p>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary flex-1"
                        disabled={isDeleting}
                        autoFocus
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        className="btn btn-danger flex-1"
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Deleting...
                            </span>
                        ) : (
                            'Delete'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
