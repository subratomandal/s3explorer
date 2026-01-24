/**
 * S3 bucket naming rules:
 * - 3-63 characters long
 * - Only lowercase letters, numbers, and hyphens
 * - Must start and end with a letter or number
 * - Cannot contain consecutive periods
 * - Cannot be formatted as an IP address (e.g., 192.168.5.4)
 */

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

export function validateBucketName(name: string): ValidationResult {
    const trimmed = name.trim().toLowerCase();

    if (!trimmed) {
        return { valid: false, error: 'Bucket name is required' };
    }

    if (trimmed.length < 3) {
        return { valid: false, error: 'Bucket name must be at least 3 characters' };
    }

    if (trimmed.length > 63) {
        return { valid: false, error: 'Bucket name must be 63 characters or less' };
    }

    if (!/^[a-z0-9]/.test(trimmed)) {
        return { valid: false, error: 'Bucket name must start with a letter or number' };
    }

    if (!/[a-z0-9]$/.test(trimmed)) {
        return { valid: false, error: 'Bucket name must end with a letter or number' };
    }

    if (!/^[a-z0-9-]+$/.test(trimmed)) {
        return { valid: false, error: 'Only lowercase letters, numbers, and hyphens allowed' };
    }

    if (/--/.test(trimmed)) {
        return { valid: false, error: 'Cannot contain consecutive hyphens' };
    }

    // Check for IP address format
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) {
        return { valid: false, error: 'Bucket name cannot be formatted as an IP address' };
    }

    return { valid: true };
}

/**
 * S3 object key (folder/file name) rules:
 * - Cannot be empty
 * - Cannot contain certain characters that cause issues
 * - Max 1024 characters
 */
export function validateFolderName(name: string): ValidationResult {
    const trimmed = name.trim();

    if (!trimmed) {
        return { valid: false, error: 'Folder name is required' };
    }

    if (trimmed.length > 255) {
        return { valid: false, error: 'Folder name must be 255 characters or less' };
    }

    // Disallow problematic characters
    const invalidChars = /[\\<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(trimmed)) {
        return { valid: false, error: 'Contains invalid characters' };
    }

    // Disallow leading/trailing spaces or periods (Windows compatibility)
    if (/^[.\s]|[.\s]$/.test(trimmed)) {
        return { valid: false, error: 'Cannot start or end with spaces or periods' };
    }

    // Disallow reserved names
    const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'LPT1', 'LPT2', 'LPT3'];
    if (reserved.includes(trimmed.toUpperCase())) {
        return { valid: false, error: 'This name is reserved' };
    }

    return { valid: true };
}

/**
 * Validate file name for rename operations
 */
export function validateFileName(name: string): ValidationResult {
    return validateFolderName(name); // Same rules apply
}
