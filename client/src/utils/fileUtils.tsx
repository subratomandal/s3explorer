/**
 * @fileoverview Utility functions for file operations and display.
 * Contains functions for extracting filenames and determining file type icons.
 */

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

/**
 * Extracts the filename from an S3 object key (full path).
 * Handles both files and folders (which end with '/').
 * 
 * @param key - The full S3 object key/path
 * @returns The filename or folder name without the path
 * 
 * @example
 * getFileName('photos/vacation/beach.jpg')  // "beach.jpg"
 * getFileName('documents/reports/')         // "reports"
 * getFileName('readme.txt')                 // "readme.txt"
 */
export function getFileName(key: string): string {
    const parts = key.split('/').filter(Boolean);
    return parts[parts.length - 1] || key;
}

/**
 * Returns the appropriate Lucide icon component based on file type.
 * Determines file type from the extension in the key.
 * 
 * @param key - The S3 object key (used to extract file extension)
 * @param isFolder - Whether this object is a folder
 * @returns A Lucide React icon component sized at 20x20 pixels
 * 
 * Icon mapping:
 * - Folders: Folder icon
 * - Images (jpg, png, gif, etc.): Image icon
 * - Videos (mp4, mov, etc.): Film icon
 * - Audio (mp3, wav, etc.): Music icon
 * - Archives (zip, tar, etc.): Archive icon
 * - Code (js, ts, py, etc.): FileCode icon
 * - Documents (md, txt, pdf, etc.): FileText icon
 * - Default: Generic File icon
 */
export function getFileIcon(key: string, isFolder: boolean) {
    // Folders get the folder icon
    if (isFolder) return <Folder className="w-5 h-5" />;

    // Extract file extension
    const ext = key.split('.').pop()?.toLowerCase() || '';

    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(ext)) {
        return <Image className="w-5 h-5" />;
    }

    // Video files
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
        return <Film className="w-5 h-5" />;
    }

    // Audio files
    if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) {
        return <Music className="w-5 h-5" />;
    }

    // Archive files
    if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
        return <Archive className="w-5 h-5" />;
    }

    // Code files
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'go', 'rs', 'java', 'css', 'html', 'json', 'yaml', 'sql'].includes(ext)) {
        return <FileCode className="w-5 h-5" />;
    }

    // Document files
    if (['md', 'txt', 'doc', 'docx', 'pdf'].includes(ext)) {
        return <FileText className="w-5 h-5" />;
    }

    // Default file icon for unknown types
    return <File className="w-5 h-5" />;
}
