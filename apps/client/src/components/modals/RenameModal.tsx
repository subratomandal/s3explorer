import { useState, useId } from 'react';
import { Modal } from '../Modal';

interface RenameModalProps {
    isOpen: boolean;
    value: string;
    onChange: (value: string) => void;
    onClose: () => void;
    onRename: () => Promise<void> | void;
}

export function RenameModal({ isOpen, value, onChange, onClose, onRename }: RenameModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputId = useId();

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (isSubmitting || !value.trim()) return;
        setIsSubmitting(true);
        try {
            await onRename();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal title="Rename" onClose={onClose}>
            <form
                className="space-y-4"
                onSubmit={e => {
                    e.preventDefault();
                    handleSubmit();
                }}
            >
                <div className="space-y-1.5">
                    <label htmlFor={inputId} className="text-sm text-foreground-secondary">
                        New Name
                    </label>
                    <input
                        id={inputId}
                        type="text"
                        placeholder="Enter new name…"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        className="input"
                        autoFocus
                        autoComplete="off"
                        spellCheck="false"
                        maxLength={255}
                        disabled={isSubmitting}
                    />
                    {value.length > 50 && (
                        <p className="text-xs text-foreground-muted">{value.length}/255</p>
                    )}
                </div>
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={!value.trim() || isSubmitting}>
                        {isSubmitting ? 'Renaming…' : 'Rename'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
