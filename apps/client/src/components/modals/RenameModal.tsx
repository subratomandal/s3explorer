import { Modal } from '../Modal';

interface RenameModalProps {
    isOpen: boolean;
    value: string;
    onChange: (value: string) => void;
    onClose: () => void;
    onRename: () => void;
}

export function RenameModal({ isOpen, value, onChange, onClose, onRename }: RenameModalProps) {
    if (!isOpen) return null;

    return (
        <Modal title="Rename" onClose={onClose}>
            <div className="space-y-4">
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="input"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && onRename()}
                />
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                    <button onClick={onRename} className="btn btn-primary" disabled={!value.trim()}>Rename</button>
                </div>
            </div>
        </Modal>
    );
}
