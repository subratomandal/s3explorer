/**
 * @fileoverview Reusable modal dialog component.
 * Provides a centered overlay modal with title bar and close functionality.
 */

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    /** Title displayed in the modal header */
    title: string;
    /** Content to render inside the modal body */
    children: React.ReactNode;
    /** Callback fired when modal should close */
    onClose: () => void;
}

/**
 * A reusable modal dialog component with backdrop, title, and close button.
 * 
 * Features:
 * - Centered on screen with max-width constraint
 * - Blurred backdrop that closes modal on click
 * - Escape key to close
 * - Prevents body scroll while open
 * - Animated entrance
 * 
 * @param props - Component props
 * @param props.title - Modal title text
 * @param props.children - Modal body content
 * @param props.onClose - Handler for closing the modal
 * 
 * @example
 * <Modal title="Confirm Delete" onClose={() => setOpen(false)}>
 *   <p>Are you sure?</p>
 *   <button onClick={handleDelete}>Delete</button>
 * </Modal>
 */
export function Modal({ title, children, onClose }: ModalProps) {
    useEffect(() => {
        // Handle escape key to close modal
        const handleEscape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();

        // Prevent body scroll while modal is open
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleEscape);

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    return (
        // Backdrop - clicking it closes the modal
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fadeIn" onClick={onClose}>
            {/* Modal container - stop click propagation to prevent closing when clicking inside */}
            <div className="card w-full max-w-md modal-content" onClick={e => e.stopPropagation()}>
                {/* Header with title and close button */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h2 className="text-base font-semibold">{title}</h2>
                    <button onClick={onClose} className="btn btn-ghost btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {/* Modal body content */}
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}
