/**
 * @fileoverview Modal dialog for creating a new bucket.
 */

import { Modal } from '../Modal';

interface CreateBucketModalProps {
    /** Whether the modal is currently visible */
    isOpen: boolean;
    /** Current input value for bucket name */
    value: string;
    /** Handler for input changes */
    onChange: (value: string) => void;
    /** Handler to close the modal */
    onClose: () => void;
    /** Handler to create the bucket */
    onCreate: () => void;
}

/**
 * Modal for creating a new S3 bucket.
 * 
 * @param props - Component props
 * @returns Modal element, or null when not open
 */
export function CreateBucketModal({ isOpen, value, onChange, onClose, onCreate }: CreateBucketModalProps) {
    if (!isOpen) return null;

    return (
        <Modal title="Create Bucket" onClose={onClose}>
            <div className="space-y-4">
                {/* Bucket name input */}
                <input
                    type="text"
                    placeholder="bucket-name"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="input"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && onCreate()}
                />
                {/* Action buttons */}
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                    <button onClick={onCreate} className="btn btn-primary" disabled={!value.trim()}>Create</button>
                </div>
            </div>
        </Modal>
    );
}
