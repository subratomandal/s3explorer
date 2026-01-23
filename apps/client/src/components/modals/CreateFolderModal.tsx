import { useId } from 'react';
import { Modal } from '../Modal';

interface CreateFolderModalProps {
    isOpen: boolean;
    value: string;
    onChange: (value: string) => void;
    onClose: () => void;
    onCreate: () => void;
}

export function CreateFolderModal({ isOpen, value, onChange, onClose, onCreate }: CreateFolderModalProps) {
    const inputId = useId();

    if (!isOpen) return null;

    return (
        <Modal title="Create Folder" onClose={onClose}>
            <form
                className="space-y-4"
                onSubmit={e => {
                    e.preventDefault();
                    if (value.trim()) onCreate();
                }}
            >
                <div className="space-y-1.5">
                    <label htmlFor={inputId} className="text-sm text-foreground-secondary">
                        Folder Name
                    </label>
                    <input
                        id={inputId}
                        type="text"
                        placeholder="New folder name…"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        className="input"
                        autoFocus
                        autoComplete="off"
                        spellCheck="false"
                    />
                </div>
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="btn btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={!value.trim()}>
                        Create
                    </button>
                </div>
            </form>
        </Modal>
    );
}
