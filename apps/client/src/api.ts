import type { Bucket, S3Object } from './types';

const API_BASE = '/api';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

export type { Bucket, S3Object };

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Wrapper for fetch with timeout and better error handling
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options;

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
    throw new ApiError('Network error', 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper to handle response
async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(data.error || 'Request failed', response.status);
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

export async function getAuthStatus(): Promise<{ authenticated: boolean; loginTime: number | null }> {
  const res = await fetchWithTimeout(`${API_BASE}/auth/status`);
  return handleResponse(res);
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
    timeout: 60000, // Longer timeout for connection tests
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
    timeout: 120000, // Longer timeout for bucket deletion (empties first)
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

// Get presigned upload URL from server
async function getUploadUrl(
  bucket: string,
  fileName: string,
  contentType: string,
  prefix: string
): Promise<{ url: string; key: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/objects/${encodeURIComponent(bucket)}/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, contentType, prefix }),
  });
  return handleResponse(res);
}

// Upload file directly to S3 using presigned URL (fast - single hop)
async function uploadToPresignedUrl(url: string, file: File): Promise<void> {
  const response = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
  });

  if (!response.ok) {
    throw new ApiError('Upload failed', response.status);
  }
}

export async function uploadFiles(
  bucket: string,
  prefix: string,
  files: File[],
  onProgress?: (completed: number, total: number) => void
): Promise<void> {
  const total = files.length;
  let completed = 0;

  // Upload files in parallel (up to 3 concurrent)
  const concurrency = 3;
  const chunks: File[][] = [];
  for (let i = 0; i < files.length; i += concurrency) {
    chunks.push(files.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async (file) => {
        // Get presigned URL from server
        const { url } = await getUploadUrl(bucket, file.name, file.type, prefix);
        // Upload directly to S3
        await uploadToPresignedUrl(url, file);
        completed++;
        onProgress?.(completed, total);
      })
    );
  }
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
    timeout: 60000, // Longer for rename (copy + delete)
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
    timeout: 120000, // Longer for folder deletion (recursive)
  });
  await handleResponse(res);
}
