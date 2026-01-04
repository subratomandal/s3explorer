/**
 * @fileoverview Modal dialog for renaming files and folders.
 */

import { Modal } from '../Modal';

interface RenameModalProps {
    /** Whether the modal is currently visible */
    isOpen: boolean;
    /** Current input value for new name */
    value: string;
    /** Handler for input changes */
    onChange: (value: string) => void;
    /** Handler to close the modal */
    onClose: () => void;
    /** Handler to perform the rename */
    onRename: () => void;
}

/**
 * Modal for renaming a file or folder.
 * 
 * @param props - Component props
 * @returns Modal element, or null when not open
 */
export function RenameModal({ isOpen, value, onChange, onClose, onRename }: RenameModalProps) {
    if (!isOpen) return null;

    return (
        <Modal title="Rename" onClose={onClose}>
            <div className="space-y-4">
                {/* New name input */}
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="input"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && onRename()}
                />
                {/* Action buttons */}
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                    <button onClick={onRename} className="btn btn-primary" disabled={!value.trim()}>Rename</button>
                </div>
            </div>
        </Modal>
    );
}
