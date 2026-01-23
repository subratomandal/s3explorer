import { useState } from 'react';
import { Modal } from '../Modal';

interface DeleteBucketModalProps {
    bucketName: string | null;
    onClose: () => void;
    onDelete: () => Promise<void> | void;
}

export function DeleteBucketModal({ bucketName, onClose, onDelete }: DeleteBucketModalProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    if (!bucketName) return null;

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
        <Modal title="Delete Bucket" onClose={onClose}>
            <div className="space-y-4">
                <p className="text-sm text-foreground-secondary">
                    Delete <span className="text-foreground font-medium">"{bucketName}"</span>?
                </p>
                <p className="text-sm text-foreground-muted">This action cannot be undone.</p>
                <div className="flex justify-end gap-3 pt-2">
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
