import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../Modal';
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
        <Modal title="Delete" onClose={onClose}>
            <div className="space-y-4">
                <p className="text-sm text-foreground-secondary">
                    Delete <span className="text-foreground font-medium">"{fileName}"</span>?
                </p>

                {isFolder && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-accent-yellow/10 border border-accent-yellow/20">
                        <AlertTriangle className="w-4 h-4 text-accent-yellow flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="text-foreground font-medium">This will delete all contents</p>
                            <p className="text-foreground-muted mt-0.5">
                                All files and subfolders inside this folder will be permanently deleted.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="btn btn-secondary" disabled={isDeleting}>
                        Cancel
                    </button>
                    <button onClick={handleDelete} className="btn btn-danger" disabled={isDeleting}>
                        {isDeleting ? 'Deleting…' : isFolder ? 'Delete Folder' : 'Delete'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
