import { useState } from 'react';
import { Modal } from '../Modal';

interface CreateBucketModalProps {
    isOpen: boolean;
    value: string;
    onChange: (value: string) => void;
    onClose: () => void;
    onCreate: () => Promise<void> | void;
}

export function CreateBucketModal({ isOpen, value, onChange, onClose, onCreate }: CreateBucketModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (isSubmitting || !value.trim()) return;
        setIsSubmitting(true);
        try {
            await onCreate();
        } finally {
            setIsSubmitting(false);
        }
    };

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
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSubmit();
                        }
                    }}
                    disabled={isSubmitting}
                />
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>Cancel</button>
                    <button
                        onClick={handleSubmit}
                        className="btn btn-primary"
                        disabled={!value.trim() || isSubmitting}
                    >
                        {isSubmitting ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
