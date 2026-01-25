import { useState, useId, useMemo } from 'react';
import { Modal } from '../Modal';
import { validateBucketName } from '../../utils/validation';

interface CreateBucketModalProps {
    isOpen: boolean;
    value: string;
    onChange: (value: string) => void;
    onClose: () => void;
    onCreate: () => Promise<void> | void;
}

export function CreateBucketModal({ isOpen, value, onChange, onClose, onCreate }: CreateBucketModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [touched, setTouched] = useState(false);
    const inputId = useId();
    const hintId = useId();
    const errorId = useId();

    // Validate on every change
    const validation = useMemo(() => validateBucketName(value), [value]);
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
        <Modal title="Create Bucket" onClose={handleClose}>
            <form
                className="space-y-4"
                onSubmit={e => {
                    e.preventDefault();
                    handleSubmit();
                }}
            >
                <div className="space-y-2">
                    <p className="text-xs text-foreground-muted">
                        3-63 characters: lowercase letters, numbers, and hyphens
                    </p>
                    <input
                        id={inputId}
                        type="text"
                        placeholder="e.g. my-bucket"
                        value={value}
                        onChange={e => onChange(e.target.value.toLowerCase())}
                        onBlur={() => setTouched(true)}
                        className={`input ${showError ? 'border-accent-red focus:border-accent-red focus:ring-accent-red/20' : ''}`}
                        autoFocus
                        disabled={isSubmitting}
                        autoComplete="off"
                        spellCheck="false"
                        aria-describedby={showError ? errorId : hintId}
                        aria-invalid={showError ? true : undefined}
                        maxLength={63}
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
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={!validation.valid || isSubmitting}
                    >
                        {isSubmitting ? 'Creating…' : 'Create'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
