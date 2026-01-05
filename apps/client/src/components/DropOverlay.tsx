import { Upload } from 'lucide-react';

interface DropOverlayProps {
    isDragActive: boolean;
}

export function DropOverlay({ isDragActive }: DropOverlayProps) {
    if (!isDragActive) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
            <div className="absolute inset-4 border-2 border-dashed border-accent-pink rounded-xl bg-background/90" />
            <div className="relative text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-white" />
                </div>
                <p className="text-base font-medium">Drop to upload</p>
            </div>
        </div>
    );
}
