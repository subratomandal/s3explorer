import type { Bucket, S3Object } from './types';
import { API_TIMEOUTS } from './constants';

const API_BASE = '/api';

export type { Bucket, S3Object };

// Dedup concurrent requests: navigating fast fires multiple list calls for the
// same key, so we track in-flight requests and abort the stale one before starting a new one.
const activeRequests = new Map<string, AbortController>();

export function cancelRequest(key: string) {
  const existing = activeRequests.get(key);
  if (existing) {
    existing.abort();
    activeRequests.delete(key);
  }
}

// S3 Error code to user-friendly message mapping
const S3_ERROR_MESSAGES: Record<string, string> = {
  'NoSuchBucket': 'Bucket does not exist',
  'NoSuchKey': 'File or folder does not exist',
  'BucketAlreadyExists': 'A bucket with this name already exists',
  'BucketAlreadyOwnedByYou': 'You already own a bucket with this name',
  'BucketNotEmpty': 'Bucket is not empty',
  'AccessDenied': 'Access denied - check your credentials',
  'InvalidAccessKeyId': 'Invalid access key',
  'SignatureDoesNotMatch': 'Invalid secret key',
  'InvalidBucketName': 'Invalid bucket name',
  'InvalidObjectState': 'Object is in an invalid state for this operation',
  'KeyTooLongError': 'File name is too long',
  'EntityTooLarge': 'File is too large to upload',
  'SlowDown': 'Too many requests - please wait and try again',
  'ServiceUnavailable': 'S3 service is temporarily unavailable',
  'InternalError': 'S3 internal error - please try again',
  'RequestTimeout': 'Request timed out',
  'ExpiredToken': 'Session expired - please reconnect',
  'InvalidToken': 'Invalid session token',
};

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public s3Code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  // Get user-friendly message
  getUserMessage(): string {
    if (this.s3Code && S3_ERROR_MESSAGES[this.s3Code]) {
      return S3_ERROR_MESSAGES[this.s3Code];
    }
    return this.message;
  }
}

// Wrapper for fetch with timeout and better error handling
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number; requestKey?: string } = {}
): Promise<Response> {
  const { timeout = API_TIMEOUTS.DEFAULT, requestKey, ...fetchOptions } = options;

  // Cancel any existing request with the same key
  if (requestKey) {
    cancelRequest(requestKey);
  }

  // Roll our own timeout via AbortController + setTimeout because the native
  // fetch `signal.timeout` isn't supported in all browsers we target.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Track the request by key
  if (requestKey) {
    activeRequests.set(requestKey, controller);
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      credentials: 'include',
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Both manual cancel and timeout trigger AbortError. We distinguish them by
      // checking whether the Map still holds *our* controller -- if a newer request
      // replaced it, this abort was a cancellation, not a timeout.
      const currentController = requestKey ? activeRequests.get(requestKey) : undefined;
      const wasCancelled = requestKey && currentController !== controller;
      if (wasCancelled) {
        throw new ApiError('Request cancelled', 0, 'CANCELLED');
      }
      throw new ApiError('Request timed out', 408, 'TIMEOUT');
    }
    throw new ApiError('Network error - check your connection', 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeoutId);
    // Only clean up if we're still the active request (not replaced by a newer one)
    if (requestKey && activeRequests.get(requestKey) === controller) {
      activeRequests.delete(requestKey);
    }
  }
}

// Helper to handle response with improved error parsing
async function handleResponse<T>(response: Response): Promise<T> {
  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new ApiError('Invalid response from server', response.status, 'PARSE_ERROR');
  }

  if (!response.ok) {
    // S3-compatible providers (AWS, MinIO, Backblaze, etc.) each put error codes
    // in different response fields, so we check all known locations.
    const s3Code = data.s3Code || data.code || data.Code;
    const message = data.error || data.message || data.Message || 'Request failed';

    // Create detailed error
    const error = new ApiError(message, response.status, undefined, s3Code);

    // Use user-friendly message
    error.message = error.getUserMessage();
    throw error;
  }
  return data;
}

// Auth API
export async function login(password: string, rememberMe: boolean = false): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, rememberMe }),
  });
  await handleResponse(res);
}

export async function logout(): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/auth/logout`, {
    method: 'POST',
  });
  await handleResponse(res);
}

export async function getAuthStatus(): Promise<{ authenticated: boolean; loginTime: number | null; configured: boolean }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/auth/status`);
    return await handleResponse(res);
  } catch (err) {
    // Fallback for older servers or offline
    return { authenticated: false, loginTime: null, configured: true };
  }
}

export async function setup(password: string, sessionSecret?: string): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, sessionSecret }),
  });
  await handleResponse(res);
}

// Connection API
export interface Connection {
  id: number;
  name: string;
  endpoint: string;
  region: string;
  forcePathStyle: boolean;
  isActive: boolean;
  createdAt: string;
  bucket?: string | null;
}

export interface ConnectionConfig {
  name: string;
  endpoint: string;
  accessKey: string;
  secretKey: string;
  region?: string;
  forcePathStyle?: boolean;
  bucket?: string;
}

export async function listConnections(): Promise<Connection[]> {
  const res = await fetchWithTimeout(`${API_BASE}/connections`);
  const data = await handleResponse<{ connections: Connection[] }>(res);
  return data.connections;
}

export async function getActiveConnection(): Promise<Connection | null> {
  const res = await fetchWithTimeout(`${API_BASE}/connections/active`);
  const data = await handleResponse<{ active: Connection | null }>(res);
  return data.active;
}

export async function createConnection(config: ConnectionConfig): Promise<{ id: number }> {
  const res = await fetchWithTimeout(`${API_BASE}/connections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return handleResponse(res);
}

export async function updateConnection(id: number, config: Partial<ConnectionConfig>): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/connections/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  await handleResponse(res);
}

export async function deleteConnection(id: number): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/connections/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
}

export async function activateConnection(id: number): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/connections/${id}/activate`, {
    method: 'POST',
  });
  await handleResponse(res);
}

export async function disconnectConnection(): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/connections/disconnect`, {
    method: 'POST',
  });
  await handleResponse(res);
}

export async function testConnection(config: Omit<ConnectionConfig, 'name'>): Promise<{ bucketCount: number }> {
  const res = await fetchWithTimeout(`${API_BASE}/connections/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
    timeout: API_TIMEOUTS.CONNECTION_TEST,
  });
  return handleResponse(res);
}

// Bucket API
export async function listBuckets(): Promise<Bucket[]> {
  const res = await fetchWithTimeout(`${API_BASE}/buckets`);
  const data = await handleResponse<{ buckets: Bucket[] }>(res);
  return data.buckets;
}

export async function createBucket(name: string): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/buckets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  await handleResponse(res);
}

export async function deleteBucket(name: string): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/buckets/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    timeout: API_TIMEOUTS.DELETE_BUCKET,
  });
  await handleResponse(res);
}

// Object API
export async function listObjects(
  bucket: string,
  prefix: string = '',
  maxKeys?: number,
  continuationToken?: string
): Promise<{ objects: S3Object[]; nextContinuationToken?: string; isTruncated: boolean }> {
  const params = new URLSearchParams({ prefix });
  if (maxKeys !== undefined) {
    params.set('maxKeys', String(maxKeys));
  }
  if (continuationToken) {
    params.set('continuationToken', continuationToken);
  }
  const res = await fetchWithTimeout(`${API_BASE}/objects/${encodeURIComponent(bucket)}?${params}`, {
    requestKey: 'listObjects',
  });
  const data = await handleResponse<{ objects: S3Object[]; nextContinuationToken?: string; isTruncated: boolean }>(res);
  return { objects: data.objects, nextContinuationToken: data.nextContinuationToken, isTruncated: data.isTruncated };
}

export async function searchObjects(
  bucket: string,
  query: string
): Promise<S3Object[]> {
  const params = new URLSearchParams({ q: query });
  const res = await fetchWithTimeout(`${API_BASE}/objects/${encodeURIComponent(bucket)}/search?${params}`, {
    requestKey: 'searchObjects',
    timeout: API_TIMEOUTS.DEFAULT,
  });
  const data = await handleResponse<{ results: S3Object[] }>(res);
  return data.results;
}

export function getProxyUrl(bucket: string, key: string): string {
  const params = new URLSearchParams({ key });
  return `${API_BASE}/objects/${encodeURIComponent(bucket)}/proxy?${params}`;
}

// Zip downloads are two steps: this call validates the selection (expanding
// folders server-side) and returns a one-shot token; the browser then fetches
// getZipUrl() as a normal download so the archive streams straight to disk.
export async function createZipDownload(
  bucket: string,
  prefix: string,
  objects: Array<{ key: string; isFolder: boolean }>
): Promise<{ token: string; filename: string; fileCount: number }> {
  const res = await fetchWithTimeout(`${API_BASE}/objects/${encodeURIComponent(bucket)}/zip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, objects }),
    timeout: API_TIMEOUTS.ZIP_PREPARE,
  });
  return handleResponse(res);
}

export function getZipUrl(bucket: string, token: string): string {
  return `${API_BASE}/objects/${encodeURIComponent(bucket)}/zip/${token}`;
}

export async function uploadFiles(
  bucket: string,
  prefix: string,
  files: File[],
  renamedNames?: Map<File, string>,
  onProgress?: (percent: number) => void
): Promise<void> {
  const formData = new FormData();
  formData.append('prefix', prefix);

  // If we have renamed names, send them as a JSON array
  if (renamedNames && renamedNames.size > 0) {
    const names: string[] = [];
    files.forEach(file => {
      formData.append('files', file);
      names.push(renamedNames.get(file) || file.name);
    });
    formData.append('names', JSON.stringify(names));
  } else {
    files.forEach(file => formData.append('files', file));
  }

  const url = `${API_BASE}/objects/${encodeURIComponent(bucket)}/upload`;

  // XHR instead of fetch because fetch has no upload progress event support.
  // We need progress tracking for the upload progress bar.
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true;
    xhr.timeout = API_TIMEOUTS.UPLOAD;

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          const s3Code = data.s3Code || data.code || data.Code;
          const message = data.error || data.message || data.Message || 'Upload failed';
          const error = new ApiError(message, xhr.status, undefined, s3Code);
          error.message = error.getUserMessage();
          reject(error);
        } catch {
          reject(new ApiError('Upload failed', xhr.status, 'UPLOAD_ERROR'));
        }
      }
    };

    xhr.onerror = () => {
      reject(new ApiError('Network error - check your connection', 0, 'NETWORK_ERROR'));
    };

    xhr.ontimeout = () => {
      reject(new ApiError('Request timed out', 408, 'TIMEOUT'));
    };

    xhr.send(formData);
  });
}

export async function createFolder(bucket: string, path: string): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/objects/${encodeURIComponent(bucket)}/folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  await handleResponse(res);
}

export async function renameObject(bucket: string, oldKey: string, newKey: string): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/objects/${encodeURIComponent(bucket)}/rename`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldKey, newKey }),
    timeout: API_TIMEOUTS.RENAME,
  });
  await handleResponse(res);
}

export async function copyObject(
  sourceBucket: string,
  sourceKey: string,
  destBucket: string,
  destKey: string
): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/objects/${encodeURIComponent(sourceBucket)}/copy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceKey, destBucket, destKey }),
  });
  await handleResponse(res);
}

export async function deleteObject(bucket: string, key: string, isFolder: boolean): Promise<void> {
  const params = new URLSearchParams({ key, isFolder: String(isFolder) });
  const res = await fetchWithTimeout(`${API_BASE}/objects/${encodeURIComponent(bucket)}?${params}`, {
    method: 'DELETE',
    timeout: API_TIMEOUTS.DELETE_FOLDER,
  });
  await handleResponse(res);
}

export async function deleteObjects(
  bucket: string,
  objects: Array<{ key: string; isFolder: boolean }>
): Promise<{ deleted: string[]; failed: string[] }> {
  const res = await fetchWithTimeout(`${API_BASE}/objects/${encodeURIComponent(bucket)}/batch-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ objects }),
    timeout: API_TIMEOUTS.DELETE_FOLDER * 2, // Longer for batch operations
  });
  return handleResponse(res);
}
