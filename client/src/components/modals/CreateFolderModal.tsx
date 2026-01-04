// v 1.0
/**
 * @fileoverview Modal dialog for creating a new folder.
 */

import { Modal } from '../Modal';

interface CreateFolderModalProps {
    /** Whether the modal is currently visible */
    isOpen: boolean;
    /** Current input value for folder name */
    value: string;
    /** Handler for input changes */
    onChange: (value: string) => void;
    /** Handler to close the modal */
    onClose: () => void;
    /** Handler to create the folder */
    onCreate: () => void;
}

/**
 * Modal for creating a new folder in a bucket.
 * 
 * @param props - Component props
 * @returns Modal element, or null when not open
 */
export function CreateFolderModal({ isOpen, value, onChange, onClose, onCreate }: CreateFolderModalProps) {
    if (!isOpen) return null;

    return (
        <Modal title="Create Folder" onClose={onClose}>
            <div className="space-y-4">
                {/* Folder name input */}
                <input
                    type="text"
                    placeholder="Folder name"
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
