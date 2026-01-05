import { Spinner } from './Spinner';

interface UploadProgressProps {
    uploading: boolean;
    progress: number;
}

export function UploadProgress({ uploading, progress }: UploadProgressProps) {
    if (!uploading) return null;

    return (
        <div className="px-4 py-3 border-b border-border bg-background-secondary animate-fadeInDown">
            <div className="flex items-center gap-3">
                <Spinner className="w-4 h-4 text-accent-pink" />

                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm">Uploading...</span>
                        <span className="text-sm text-foreground-muted">{progress}%</span>
                    </div>

                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
