import { useState, useId, useMemo } from 'react';
import { Modal } from '../Modal';
import { validateFileName } from '../../utils/validation';

interface RenameModalProps {
    isOpen: boolean;
    value: string;
    onChange: (value: string) => void;
    onClose: () => void;
    onRename: () => Promise<void> | void;
}

export function RenameModal({ isOpen, value, onChange, onClose, onRename }: RenameModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [touched, setTouched] = useState(false);
    const inputId = useId();
    const errorId = useId();

    // Validate on every change
    const validation = useMemo(() => validateFileName(value), [value]);
    const showError = touched && !validation.valid && value.trim();

    if (!isOpen) return null;

    const handleSubmit = async () => {
        setTouched(true);
        if (isSubmitting || !validation.valid) return;
        setIsSubmitting(true);
        try {
            await onRename();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setTouched(false);
        onClose();
    };

    return (
        <Modal title="Rename" onClose={handleClose}>
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
                        onBlur={() => setTouched(true)}
                        className={`input ${showError ? 'border-accent-red focus:border-accent-red focus:ring-accent-red/20' : ''}`}
                        autoFocus
                        autoComplete="off"
                        spellCheck="false"
                        maxLength={255}
                        disabled={isSubmitting}
                        aria-describedby={showError ? errorId : undefined}
                        aria-invalid={showError ? true : undefined}
                    />
                    {showError ? (
                        <p id={errorId} className="text-xs text-accent-red" role="alert">
                            {validation.error}
                        </p>
                    ) : value.length > 50 ? (
                        <p className="text-xs text-foreground-muted">{value.length}/255</p>
                    ) : null}
                </div>
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={handleClose} className="btn btn-secondary" disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={!validation.valid || isSubmitting}>
                        {isSubmitting ? 'Renaming…' : 'Rename'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
