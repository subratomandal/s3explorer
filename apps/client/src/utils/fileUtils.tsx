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
