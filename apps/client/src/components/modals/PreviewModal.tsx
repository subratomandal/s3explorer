import { useState, useEffect } from 'react';
import { X, Download, ExternalLink, Loader2 } from 'lucide-react';
import { formatBytes } from '../../utils/formatters';
import { getFileName } from '../../utils/fileUtils';
import { PREVIEW } from '../../constants';
import type { S3Object } from '../../types';

interface PreviewModalProps {
    object: S3Object | null;
    previewUrl: string | null;
    onClose: () => void;
    onDownload: () => void;
}

type PreviewType = 'image' | 'text' | 'video' | 'audio' | 'unsupported';

function getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

function getPreviewType(filename: string): PreviewType {
    const ext = getFileExtension(filename);

    if ((PREVIEW.SUPPORTED_IMAGE_TYPES as readonly string[]).includes(ext)) return 'image';
    if ((PREVIEW.SUPPORTED_TEXT_TYPES as readonly string[]).includes(ext)) return 'text';
    if ((PREVIEW.SUPPORTED_VIDEO_TYPES as readonly string[]).includes(ext)) return 'video';
    if ((PREVIEW.SUPPORTED_AUDIO_TYPES as readonly string[]).includes(ext)) return 'audio';

    return 'unsupported';
}

export function PreviewModal({ object, previewUrl, onClose, onDownload }: PreviewModalProps) {
    const [loading, setLoading] = useState(true);
    const [textContent, setTextContent] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fileName = object ? getFileName(object.key) : '';
    const previewType = object ? getPreviewType(fileName) : 'unsupported';

    // Load text content for text files
    useEffect(() => {
        if (!previewUrl || previewType !== 'text') {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        fetch(previewUrl)
            .then(res => {
                if (!res.ok) throw new Error('Failed to load file');
                return res.text();
            })
            .then(text => {
                setTextContent(text);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [previewUrl, previewType]);

    // Reset state when object changes
    useEffect(() => {
        setTextContent(null);
        setError(null);
        setLoading(true);
    }, [object?.key]);

    if (!object || !previewUrl) return null;

    const isTooLarge = object.size > PREVIEW.MAX_FILE_SIZE;

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-background-secondary border border-border rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-scaleIn"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground truncate">{fileName}</h3>
                        <p className="text-xs text-foreground-muted">{formatBytes(object.size)}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                        <button
                            onClick={onDownload}
                            className="btn btn-ghost btn-icon w-8 h-8"
                            aria-label="Download file"
                        >
                            <Download className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-icon w-8 h-8"
                            aria-label="Open in new tab"
                        >
                            <ExternalLink className="w-4 h-4" aria-hidden="true" />
                        </a>
                        <button
                            onClick={onClose}
                            className="btn btn-ghost btn-icon w-8 h-8"
                            aria-label="Close preview"
                        >
                            <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 min-h-0">
                    {isTooLarge ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                            <p className="text-foreground-muted mb-4">
                                File is too large to preview ({formatBytes(object.size)})
                            </p>
                            <button onClick={onDownload} className="btn btn-primary">
                                <Download className="w-4 h-4 mr-2" />
                                Download to view
                            </button>
                        </div>
                    ) : loading ? (
                        <div className="flex items-center justify-center h-full py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-foreground-muted" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                            <p className="text-accent-red mb-4">{error}</p>
                            <button onClick={onDownload} className="btn btn-primary">
                                <Download className="w-4 h-4 mr-2" />
                                Download instead
                            </button>
                        </div>
                    ) : previewType === 'image' ? (
                        <div className="flex items-center justify-center h-full">
                            <img
                                src={previewUrl}
                                alt={fileName}
                                className="max-w-full max-h-full object-contain rounded"
                                onLoad={() => setLoading(false)}
                                onError={() => {
                                    setError('Failed to load image');
                                    setLoading(false);
                                }}
                            />
                        </div>
                    ) : previewType === 'text' ? (
                        <pre className="text-sm text-foreground-secondary font-mono whitespace-pre-wrap break-words bg-background rounded-lg p-4 overflow-auto max-h-[60vh]">
                            {textContent}
                        </pre>
                    ) : previewType === 'video' ? (
                        <div className="flex items-center justify-center h-full">
                            <video
                                src={previewUrl}
                                controls
                                className="max-w-full max-h-full rounded"
                                onLoadedData={() => setLoading(false)}
                                onError={() => {
                                    setError('Failed to load video');
                                    setLoading(false);
                                }}
                            >
                                Your browser does not support video playback.
                            </video>
                        </div>
                    ) : previewType === 'audio' ? (
                        <div className="flex flex-col items-center justify-center h-full py-12">
                            <audio
                                src={previewUrl}
                                controls
                                className="w-full max-w-md"
                                onLoadedData={() => setLoading(false)}
                                onError={() => {
                                    setError('Failed to load audio');
                                    setLoading(false);
                                }}
                            >
                                Your browser does not support audio playback.
                            </audio>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                            <p className="text-foreground-muted mb-4">
                                Preview not available for this file type
                            </p>
                            <button onClick={onDownload} className="btn btn-primary">
                                <Download className="w-4 h-4 mr-2" />
                                Download to view
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper to check if a file is previewable
export function isPreviewable(filename: string, size: number): boolean {
    const type = getPreviewType(filename);
    return type !== 'unsupported' && size <= PREVIEW.MAX_FILE_SIZE;
}
