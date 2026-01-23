import { useState } from 'react';
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

    return (
        <Modal title="Delete" onClose={onClose}>
            <div className="space-y-4">
                <p className="text-sm text-foreground-secondary">
                    Delete <span className="text-foreground font-medium">"{getFileName(object.key)}"</span>?
                </p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="btn btn-secondary" disabled={isDeleting}>
                        Cancel
                    </button>
                    <button onClick={handleDelete} className="btn btn-danger" disabled={isDeleting}>
                        {isDeleting ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
