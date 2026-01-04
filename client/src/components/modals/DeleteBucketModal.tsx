/**
 * @fileoverview Modal dialog for bucket deletion confirmation.
 */

import { Modal } from '../Modal';

interface DeleteBucketModalProps {
    /** Name of the bucket to delete, or null to hide modal */
    bucketName: string | null;
    /** Handler to close the modal */
    onClose: () => void;
    /** Handler to confirm deletion */
    onDelete: () => void;
}

/**
 * Confirmation modal for deleting a bucket.
 * Includes a warning that the action cannot be undone.
 * 
 * @param props - Component props
 * @returns Modal element, or null when no bucket is selected
 */
export function DeleteBucketModal({ bucketName, onClose, onDelete }: DeleteBucketModalProps) {
    if (!bucketName) return null;

    return (
        <Modal title="Delete Bucket" onClose={onClose}>
            <div className="space-y-4">
                {/* Confirmation message */}
                <p className="text-sm text-foreground-secondary">
                    Delete <span className="text-foreground font-medium">"{bucketName}"</span>?
                </p>
                {/* Warning text */}
                <p className="text-sm text-foreground-muted">This action cannot be undone.</p>
                {/* Action buttons */}
                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                    <button onClick={onDelete} className="btn btn-danger">Delete</button>
                </div>
            </div>
        </Modal>
    );
}
