import {
    Folder,
    File,
    Image,
    Film,
    Music,
    Archive,
    FileCode,
    FileText,
} from 'lucide-react';

export function getFileName(key: string): string {
    const parts = key.split('/').filter(Boolean);
    return parts[parts.length - 1] || key;
}

// "photos/2024/trip/" -> "photos/2024/", "photos/" -> ""
export function getParentPrefix(key: string): string {
    const parts = key.split('/').filter(Boolean);
    parts.pop();
    return parts.length ? parts.join('/') + '/' : '';
}

export function getFileIcon(key: string, isFolder: boolean) {
    if (isFolder) return <Folder className="w-5 h-5" />;

    const ext = key.split('.').pop()?.toLowerCase() || '';

    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(ext)) {
        return <Image className="w-5 h-5" />;
    }

    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
        return <Film className="w-5 h-5" />;
    }

    if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) {
        return <Music className="w-5 h-5" />;
    }

    if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
        return <Archive className="w-5 h-5" />;
    }

    if (['js', 'ts', 'jsx', 'tsx', 'py', 'go', 'rs', 'java', 'css', 'html', 'json', 'yaml', 'sql'].includes(ext)) {
        return <FileCode className="w-5 h-5" />;
    }

    if (['md', 'txt', 'doc', 'docx', 'pdf'].includes(ext)) {
        return <FileText className="w-5 h-5" />;
    }

    return <File className="w-5 h-5" />;
}

// Preview support
export type PreviewType = 'image' | 'video' | 'audio' | 'text' | 'pdf' | null;

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac'];
const TEXT_EXTENSIONS = [
    'txt', 'md', 'json', 'yaml', 'yml', 'xml', 'csv', 'log', 'env', 'ini', 'cfg', 'conf',
    'js', 'ts', 'jsx', 'tsx', 'py', 'go', 'rs', 'java', 'css', 'html', 'sql', 'sh', 'bash',
    'rb', 'php', 'c', 'cpp', 'h', 'hpp', 'toml', 'lock',
];

export function getPreviewType(key: string): PreviewType {
    const ext = key.split('.').pop()?.toLowerCase() || '';
    if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
    if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
    if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
    if (TEXT_EXTENSIONS.includes(ext)) return 'text';
    if (ext === 'pdf') return 'pdf';
    return null;
}

export function isPreviewable(key: string): boolean {
    return getPreviewType(key) !== null;
}

// Programmatic <a download> click. Same-origin URLs served with
// Content-Disposition: attachment go straight to the browser's download UI.
export function triggerDownload(url: string, filename: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
