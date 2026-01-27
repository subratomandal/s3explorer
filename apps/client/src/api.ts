import type { Bucket, S3Object } from './types';
import { API_TIMEOUTS } from './constants';

const API_BASE = '/api';

export type { Bucket, S3Object };

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
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = API_TIMEOUTS.DEFAULT, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      credentials: 'include',
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timed out', 408, 'TIMEOUT');
    }
    throw new ApiError('Network error - check your connection', 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeoutId);
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
    // Extract S3 error code if present
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

export async function setup(password: string): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
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
}

export interface ConnectionConfig {
  name: string;
  endpoint: string;
  accessKey: string;
  secretKey: string;
  region?: string;
  forcePathStyle?: boolean;
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
export async function listObjects(bucket: string, prefix: string = ''): Promise<S3Object[]> {
  const params = new URLSearchParams({ prefix });
  const res = await fetchWithTimeout(`${API_BASE}/objects/${encodeURIComponent(bucket)}?${params}`);
  const data = await handleResponse<{ objects: S3Object[] }>(res);
  return data.objects;
}

export async function getDownloadUrl(bucket: string, key: string): Promise<string> {
  const params = new URLSearchParams({ key });
  const res = await fetchWithTimeout(`${API_BASE}/objects/${encodeURIComponent(bucket)}/download?${params}`);
  const data = await handleResponse<{ url: string }>(res);
  return data.url;
}

export function getPreviewUrl(bucket: string, key: string): string {
  const params = new URLSearchParams({ key });
  return `${API_BASE}/objects/${encodeURIComponent(bucket)}/proxy?${params}`;
}

export async function uploadFiles(
  bucket: string,
  prefix: string,
  files: File[],
  renamedNames?: Map<File, string>
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

  const res = await fetchWithTimeout(`${API_BASE}/objects/${encodeURIComponent(bucket)}/upload`, {
    method: 'POST',
    body: formData,
    timeout: API_TIMEOUTS.UPLOAD,
  });
  await handleResponse(res);
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
