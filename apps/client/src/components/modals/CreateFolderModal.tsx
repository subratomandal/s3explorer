import { useState, useId } from 'react';
import { Modal } from '../Modal';

interface CreateFolderModalProps {
    isOpen: boolean;
    value: string;
    onChange: (value: string) => void;
    onClose: () => void;
    onCreate: () => Promise<void> | void;
}

export function CreateFolderModal({ isOpen, value, onChange, onClose, onCreate }: CreateFolderModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputId = useId();

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
        <Modal title="Create Folder" onClose={onClose}>
            <form
                className="space-y-4"
                onSubmit={e => {
                    e.preventDefault();
                    handleSubmit();
                }}
            >
                <div className="space-y-1.5">
                    <label htmlFor={inputId} className="text-sm text-foreground-secondary">
                        Folder Name
                    </label>
                    <input
                        id={inputId}
                        type="text"
                        placeholder="e.g. vacation"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        className="input"
                        autoFocus
                        autoComplete="off"
                        spellCheck="false"
                        disabled={isSubmitting}
                    />
                </div>
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={!value.trim() || isSubmitting}>
                        {isSubmitting ? 'Creating…' : 'Create'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
