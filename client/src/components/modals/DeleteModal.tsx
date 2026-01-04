// v 1.0
/**
 * @fileoverview Modal dialog for delete confirmation.
 */

import { Modal } from '../Modal';
import { getFileName } from '../../utils/fileUtils';
import type { S3Object } from '../../types';

interface DeleteModalProps {
    /** The object to delete (file or folder), or null to hide modal */
    object: S3Object | null;
    /** Handler to close the modal */
    onClose: () => void;
    /** Handler to confirm deletion */
    onDelete: () => void;
}

/**
 * Confirmation modal for deleting a file or folder.
 * Displays the name of the item to be deleted.
 * 
 * @param props - Component props
 * @returns Modal element, or null when no object is selected
 */
export function DeleteModal({ object, onClose, onDelete }: DeleteModalProps) {
    if (!object) return null;

    return (
        <Modal title="Delete" onClose={onClose}>
            <div className="space-y-4">
                {/* Confirmation message */}
                <p className="text-sm text-foreground-secondary">
                    Delete <span className="text-foreground font-medium">"{getFileName(object.key)}"</span>?
                </p>
                {/* Action buttons */}
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                    <button onClick={onDelete} className="btn btn-danger">Delete</button>
                </div>
            </div>
        </Modal>
    );
}
