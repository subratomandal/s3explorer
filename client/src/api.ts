// v 1.0
/**
 * @fileoverview API client for communicating with the backend server.
 * Provides functions for all S3 bucket and object operations.
 * All functions make HTTP requests to the Express backend which proxies to S3.
 */

import type { Bucket, S3Object } from './types';

/** Base URL for all API endpoints */
const API_BASE = '/api';

// Re-export types for convenience
export type { Bucket, S3Object };

// ============================================================================
// BUCKET OPERATIONS
// ============================================================================

/**
 * Fetches the list of all S3 buckets from the server.
 * 
 * @returns Promise resolving to an array of Bucket objects
 * @throws Error if the API request fails
 */
export async function listBuckets(): Promise<Bucket[]> {
  const res = await fetch(`${API_BASE}/buckets`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.buckets;
}

/**
 * Creates a new S3 bucket with the specified name.
 * 
 * @param name - The name for the new bucket (must be DNS-compliant)
 * @throws Error if bucket creation fails (e.g., name already exists)
 */
export async function createBucket(name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/buckets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

/**
 * Deletes an S3 bucket. The bucket must be empty before deletion.
 * 
 * @param name - The name of the bucket to delete
 * @throws Error if deletion fails (e.g., bucket not empty)
 */
export async function deleteBucket(name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/buckets/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

// ============================================================================
// OBJECT OPERATIONS
// ============================================================================

/**
 * Lists objects (files and folders) in a bucket at a given path prefix.
 * Uses delimiter-based listing to show only immediate children.
 * 
 * @param bucket - The bucket name to list objects from
 * @param prefix - The folder path prefix (empty string for root)
 * @returns Promise resolving to an array of S3Object (files and folders)
 * @throws Error if listing fails
 */
export async function listObjects(bucket: string, prefix: string = ''): Promise<S3Object[]> {
  const params = new URLSearchParams({ prefix });
  const res = await fetch(`${API_BASE}/objects/${encodeURIComponent(bucket)}?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.objects;
}

/**
 * Gets a presigned URL for downloading a file.
 * The URL is valid for 1 hour and allows direct download from S3.
 * 
 * @param bucket - The bucket containing the file
 * @param key - The full path/key of the file
 * @returns Promise resolving to a presigned download URL
 * @throws Error if URL generation fails
 */
export async function getDownloadUrl(bucket: string, key: string): Promise<string> {
  const params = new URLSearchParams({ key });
  const res = await fetch(`${API_BASE}/objects/${encodeURIComponent(bucket)}/download?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.url;
}

/**
 * Uploads multiple files to a bucket at a given path.
 * Files are sent as multipart form data.
 * 
 * @param bucket - The target bucket name
 * @param prefix - The folder path to upload into (empty for root)
 * @param files - Array of File objects to upload
 * @throws Error if upload fails
 */
export async function uploadFiles(bucket: string, prefix: string, files: File[]): Promise<void> {
  const formData = new FormData();
  formData.append('prefix', prefix);
  files.forEach(file => formData.append('files', file));

  const res = await fetch(`${API_BASE}/objects/${encodeURIComponent(bucket)}/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

/**
 * Creates a new folder in a bucket.
 * In S3, folders are zero-byte objects with keys ending in '/'.
 * 
 * @param bucket - The bucket to create the folder in
 * @param path - The full path for the new folder
 * @throws Error if folder creation fails
 */
export async function createFolder(bucket: string, path: string): Promise<void> {
  const res = await fetch(`${API_BASE}/objects/${encodeURIComponent(bucket)}/folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

/**
 * Renames a file or folder by copying to new location and deleting original.
 * For folders, all contents are moved recursively.
 * 
 * @param bucket - The bucket containing the object
 * @param oldKey - The current path/key of the object
 * @param newKey - The new path/key for the object
 * @throws Error if rename fails
 */
export async function renameObject(bucket: string, oldKey: string, newKey: string): Promise<void> {
  const res = await fetch(`${API_BASE}/objects/${encodeURIComponent(bucket)}/rename`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldKey, newKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

/**
 * Copies an object to a new location (same or different bucket).
 * 
 * @param sourceBucket - The bucket containing the source object
 * @param sourceKey - The path/key of the source object
 * @param destBucket - The destination bucket (can be same as source)
 * @param destKey - The destination path/key
 * @throws Error if copy fails
 */
export async function copyObject(
  sourceBucket: string,
  sourceKey: string,
  destBucket: string,
  destKey: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/objects/${encodeURIComponent(sourceBucket)}/copy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceKey, destBucket, destKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

/**
 * Deletes a file or folder from a bucket.
 * For folders, all contents are deleted recursively.
 * 
 * @param bucket - The bucket containing the object
 * @param key - The path/key of the object to delete
 * @param isFolder - Whether this is a folder (affects recursive deletion)
 * @throws Error if deletion fails
 */
export async function deleteObject(bucket: string, key: string, isFolder: boolean): Promise<void> {
  const params = new URLSearchParams({ key, isFolder: String(isFolder) });
  const res = await fetch(`${API_BASE}/objects/${encodeURIComponent(bucket)}?${params}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}
