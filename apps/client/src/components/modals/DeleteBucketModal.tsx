import { Modal } from '../Modal';

interface DeleteBucketModalProps {
    bucketName: string | null;
    onClose: () => void;
    onDelete: () => void;
}

export function DeleteBucketModal({ bucketName, onClose, onDelete }: DeleteBucketModalProps) {
    if (!bucketName) return null;

    return (
        <Modal title="Delete Bucket" onClose={onClose}>
            <div className="space-y-4">
                <p className="text-sm text-foreground-secondary">
                    Delete <span className="text-foreground font-medium">"{bucketName}"</span>?
                </p>
                <p className="text-sm text-foreground-muted">This action cannot be undone.</p>
                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                    <button onClick={onDelete} className="btn btn-danger">Delete</button>
                </div>
            </div>
        </Modal>
    );
}
