import { useState, useId, useMemo } from 'react';
import { Modal } from '../Modal';
import { validateFolderName } from '../../utils/validation';

interface CreateFolderModalProps {
    isOpen: boolean;
    value: string;
    onChange: (value: string) => void;
    onClose: () => void;
    onCreate: () => Promise<void> | void;
}

export function CreateFolderModal({ isOpen, value, onChange, onClose, onCreate }: CreateFolderModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [touched, setTouched] = useState(false);
    const inputId = useId();
    const errorId = useId();

    // Validate on every change
    const validation = useMemo(() => validateFolderName(value), [value]);
    const showError = touched && !validation.valid && value.trim();

    if (!isOpen) return null;

    const handleSubmit = async () => {
        setTouched(true);
        if (isSubmitting || !validation.valid) return;
        setIsSubmitting(true);
        try {
            await onCreate();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setTouched(false);
        onClose();
    };

    return (
        <Modal title="Create Folder" onClose={handleClose}>
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
                        onBlur={() => setTouched(true)}
                        className={`input ${showError ? 'border-accent-red focus:border-accent-red focus:ring-accent-red/20' : ''}`}
                        autoFocus
                        autoComplete="off"
                        spellCheck="false"
                        disabled={isSubmitting}
                        aria-describedby={showError ? errorId : undefined}
                        aria-invalid={showError ? true : undefined}
                        maxLength={255}
                    />
                    {showError && (
                        <p id={errorId} className="text-xs text-accent-red" role="alert">
                            {validation.error}
                        </p>
                    )}
                </div>
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={handleClose} className="btn btn-secondary" disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={!validation.valid || isSubmitting}>
                        {isSubmitting ? 'Creating…' : 'Create'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
