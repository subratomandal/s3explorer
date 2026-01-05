import { Modal } from '../Modal';

interface CreateFolderModalProps {
    isOpen: boolean;
    value: string;
    onChange: (value: string) => void;
    onClose: () => void;
    onCreate: () => void;
}

export function CreateFolderModal({ isOpen, value, onChange, onClose, onCreate }: CreateFolderModalProps) {
    if (!isOpen) return null;

    return (
        <Modal title="Create Folder" onClose={onClose}>
            <div className="space-y-4">
                <input
                    type="text"
                    placeholder="Folder name"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="input"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && onCreate()}
                />
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                    <button onClick={onCreate} className="btn btn-primary" disabled={!value.trim()}>Create</button>
                </div>
            </div>
        </Modal>
    );
}
