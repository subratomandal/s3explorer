import { Modal } from '../Modal';

interface CreateBucketModalProps {
    isOpen: boolean;
    value: string;
    onChange: (value: string) => void;
    onClose: () => void;
    onCreate: () => void;
}

export function CreateBucketModal({ isOpen, value, onChange, onClose, onCreate }: CreateBucketModalProps) {
    if (!isOpen) return null;

    return (
        <Modal title="Create Bucket" onClose={onClose}>
            <div className="space-y-4">
                <input
                    type="text"
                    placeholder="bucket name"
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
