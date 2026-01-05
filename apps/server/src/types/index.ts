export interface BucketInfo {
    name: string;
    creationDate?: Date;
}

export interface ObjectInfo {
    key: string;
    size: number;
    lastModified?: Date;
    isFolder: boolean;
    contentType?: string;
}

export interface ObjectMetadata {
    contentType?: string;
    contentLength?: number;
    lastModified?: Date;
    metadata?: Record<string, string>;
}
