// v 1.0
/**
 * @fileoverview S3 service layer for all storage operations.
 * This module provides functions for interacting with S3-compatible storage.
 * It uses the AWS SDK v3 and supports any S3-compatible provider (AWS, Minio, R2, etc.).
 */

import {
  S3Client,
  ListBucketsCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { BucketInfo, ObjectInfo, ObjectMetadata } from '../types/index.js';

// Re-export types for convenience
export type { BucketInfo, ObjectInfo, ObjectMetadata };

/**
 * Creates and returns a configured S3 client instance.
 * Configuration is read from environment variables:
 * - S3_ENDPOINT: The S3-compatible endpoint URL
 * - S3_REGION: AWS region (default: 'us-east-1')
 * - S3_ACCESS_KEY: Access key ID
 * - S3_SECRET_KEY: Secret access key
 * - S3_FORCE_PATH_STYLE: Use path-style URLs (required for Minio)
 * 
 * @returns Configured S3Client instance
 */
const getS3Client = () => {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || '',
      secretAccessKey: process.env.S3_SECRET_KEY || '',
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  });
};

// ============================================================================
// BUCKET OPERATIONS
// ============================================================================

/**
 * Lists all accessible S3 buckets.
 * 
 * @returns Promise resolving to array of BucketInfo objects
 */
export async function listBuckets(): Promise<BucketInfo[]> {
  const client = getS3Client();
  const command = new ListBucketsCommand({});
  const response = await client.send(command);

  return (response.Buckets || []).map(bucket => ({
    name: bucket.Name || '',
    creationDate: bucket.CreationDate,
  }));
}

/**
 * Creates a new S3 bucket.
 * 
 * @param name - The name for the new bucket (must be DNS-compliant)
 */
export async function createBucket(name: string): Promise<void> {
  const client = getS3Client();
  const command = new CreateBucketCommand({ Bucket: name });
  await client.send(command);
}

/**
 * Deletes an S3 bucket. The bucket must be empty.
 * 
 * @param name - The name of the bucket to delete
 */
export async function deleteBucket(name: string): Promise<void> {
  const client = getS3Client();
  const command = new DeleteBucketCommand({ Bucket: name });
  await client.send(command);
}

// ============================================================================
// OBJECT LIST OPERATIONS
// ============================================================================

/**
 * Lists objects in a bucket at a given prefix.
 * Uses delimiter-based listing to show only immediate children (files and folders).
 * 
 * @param bucket - The bucket name
 * @param prefix - The folder path prefix (empty string for root)
 * @param delimiter - Character used to delimit folders (default: '/')
 * @returns Promise resolving to objects array and prefixes (subfolders)
 */
export async function listObjects(
  bucket: string,
  prefix: string = '',
  delimiter: string = '/'
): Promise<{ objects: ObjectInfo[]; prefixes: string[] }> {
  const client = getS3Client();
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    Delimiter: delimiter,
  });
  const response = await client.send(command);

  // Map file objects (exclude the prefix folder itself)
  const objects: ObjectInfo[] = (response.Contents || [])
    .filter(obj => obj.Key !== prefix)
    .map(obj => ({
      key: obj.Key || '',
      size: obj.Size || 0,
      lastModified: obj.LastModified,
      isFolder: false,
    }));

  // Extract folder prefixes
  const prefixes = (response.CommonPrefixes || []).map(p => p.Prefix || '');

  // Add folders to objects array
  prefixes.forEach(p => {
    objects.push({
      key: p,
      size: 0,
      isFolder: true,
    });
  });

  return { objects, prefixes };
}

// ============================================================================
// OBJECT CRUD OPERATIONS
// ============================================================================

/**
 * Generates a presigned URL for downloading an object.
 * The URL is valid for the specified duration and allows unauthenticated access.
 * 
 * @param bucket - The bucket containing the object
 * @param key - The object key/path
 * @param expiresIn - URL validity in seconds (default: 3600 = 1 hour)
 * @returns Promise resolving to the presigned URL string
 */
export async function getObjectUrl(
  bucket: string,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Uploads an object to S3.
 * 
 * @param bucket - The target bucket
 * @param key - The destination key/path
 * @param body - The file contents as a Buffer
 * @param contentType - MIME type of the content (optional)
 */
export async function uploadObject(
  bucket: string,
  key: string,
  body: Buffer,
  contentType?: string
): Promise<void> {
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await client.send(command);
}

/**
 * Deletes a single object from S3.
 * 
 * @param bucket - The bucket containing the object
 * @param key - The object key/path to delete
 */
export async function deleteObject(bucket: string, key: string): Promise<void> {
  const client = getS3Client();
  const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
  await client.send(command);
}

/**
 * Deletes a folder and all its contents recursively.
 * In S3, this means deleting all objects with the given prefix.
 * 
 * @param bucket - The bucket containing the folder
 * @param prefix - The folder prefix (must end with '/')
 */
export async function deleteFolder(bucket: string, prefix: string): Promise<void> {
  const client = getS3Client();

  // List all objects with this prefix
  const listCommand = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
  });
  const response = await client.send(listCommand);

  // Delete each object
  for (const obj of response.Contents || []) {
    if (obj.Key) {
      await deleteObject(bucket, obj.Key);
    }
  }
}

// ============================================================================
// OBJECT MOVE/COPY OPERATIONS
// ============================================================================

/**
 * Renames an object or folder by copying to new location and deleting original.
 * For folders, all contents are moved recursively.
 * 
 * @param bucket - The bucket containing the object
 * @param oldKey - The current key/path
 * @param newKey - The new key/path
 */
export async function renameObject(
  bucket: string,
  oldKey: string,
  newKey: string
): Promise<void> {
  const client = getS3Client();
  const isFolder = oldKey.endsWith('/');

  if (isFolder) {
    // For folders, rename all objects with this prefix
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: oldKey,
    });
    const response = await client.send(listCommand);

    for (const obj of response.Contents || []) {
      if (obj.Key) {
        // Replace old prefix with new prefix
        const newObjKey = obj.Key.replace(oldKey, newKey);

        // Copy to new location
        const copyCommand = new CopyObjectCommand({
          Bucket: bucket,
          CopySource: encodeURIComponent(`${bucket}/${obj.Key}`),
          Key: newObjKey,
        });
        await client.send(copyCommand);

        // Delete original
        await deleteObject(bucket, obj.Key);
      }
    }
  } else {
    // For single file, just copy and delete
    const copyCommand = new CopyObjectCommand({
      Bucket: bucket,
      CopySource: encodeURIComponent(`${bucket}/${oldKey}`),
      Key: newKey,
    });
    await client.send(copyCommand);

    // Delete original
    await deleteObject(bucket, oldKey);
  }
}

/**
 * Copies an object to a new location (same or different bucket).
 * 
 * @param sourceBucket - The source bucket
 * @param sourceKey - The source object key
 * @param destBucket - The destination bucket
 * @param destKey - The destination key
 */
export async function copyObject(
  sourceBucket: string,
  sourceKey: string,
  destBucket: string,
  destKey: string
): Promise<void> {
  const client = getS3Client();
  const command = new CopyObjectCommand({
    Bucket: destBucket,
    CopySource: `${sourceBucket}/${sourceKey}`,
    Key: destKey,
  });
  await client.send(command);
}

// ============================================================================
// FOLDER OPERATIONS
// ============================================================================

/**
 * Creates an empty folder in S3.
 * In S3, folders are zero-byte objects with keys ending in '/'.
 * 
 * @param bucket - The target bucket
 * @param path - The folder path (will append '/' if not present)
 */
export async function createFolder(bucket: string, path: string): Promise<void> {
  const client = getS3Client();
  // Ensure path ends with '/' to indicate it's a folder
  const folderKey = path.endsWith('/') ? path : `${path}/`;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: folderKey,
    Body: Buffer.alloc(0), // Empty content
  });
  await client.send(command);
}

// ============================================================================
// METADATA OPERATIONS
// ============================================================================

/**
 * Retrieves metadata for an object without downloading its contents.
 * Uses the HeadObject operation.
 * 
 * @param bucket - The bucket containing the object
 * @param key - The object key/path
 * @returns Promise resolving to ObjectMetadata
 */
export async function getObjectMetadata(bucket: string, key: string): Promise<ObjectMetadata> {
  const client = getS3Client();
  const command = new HeadObjectCommand({ Bucket: bucket, Key: key });
  const response = await client.send(command);
  return {
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
    metadata: response.Metadata,
  };
}
