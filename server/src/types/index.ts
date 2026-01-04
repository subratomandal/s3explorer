// v 1.0
/**
 * @fileoverview Centralized TypeScript type definitions for the server.
 * This file contains all shared interfaces used across the Express routes and S3 service.
 */

/**
 * Represents S3 bucket information.
 * @interface BucketInfo
 */
export interface BucketInfo {
    /** The unique name of the bucket */
    name: string;
    /** When the bucket was created */
    creationDate?: Date;
}

/**
 * Represents an object (file or folder) stored in an S3 bucket.
 * @interface ObjectInfo
 */
export interface ObjectInfo {
    /** The full path/key of the object in the bucket */
    key: string;
    /** Size of the object in bytes (0 for folders) */
    size: number;
    /** When the object was last modified */
    lastModified?: Date;
    /** Whether this object represents a folder (prefix ending with /) */
    isFolder: boolean;
    /** MIME type of the object (files only) */
    contentType?: string;
}

/**
 * Metadata information about an S3 object.
 * Returned by the HeadObject operation.
 * @interface ObjectMetadata
 */
export interface ObjectMetadata {
    /** MIME type of the object */
    contentType?: string;
    /** Size in bytes */
    contentLength?: number;
    /** When the object was last modified */
    lastModified?: Date;
    /** Custom metadata key-value pairs */
    metadata?: Record<string, string>;
}
