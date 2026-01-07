import type { Bucket, S3Object } from './types';

const API_BASE = '/api';

export type { Bucket, S3Object };

// Auth API
export async function login(password: string, rememberMe: boolean = false): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, rememberMe }),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

export async function logout(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

export async function getAuthStatus(): Promise<{ authenticated: boolean; loginTime: number | null }> {
  const res = await fetch(`${API_BASE}/auth/status`, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
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
  const res = await fetch(`${API_BASE}/connections`, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.connections;
}

export async function getActiveConnection(): Promise<Connection | null> {
  const res = await fetch(`${API_BASE}/connections/active`, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.active;
}

export async function createConnection(config: ConnectionConfig): Promise<{ id: number }> {
  const res = await fetch(`${API_BASE}/connections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function updateConnection(id: number, config: Partial<ConnectionConfig>): Promise<void> {
  const res = await fetch(`${API_BASE}/connections/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

export async function deleteConnection(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/connections/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

export async function activateConnection(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/connections/${id}/activate`, {
    method: 'POST',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

export async function disconnectConnection(): Promise<void> {
  const res = await fetch(`${API_BASE}/connections/disconnect`, {
    method: 'POST',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

export async function testConnection(config: Omit<ConnectionConfig, 'name'>): Promise<{ bucketCount: number }> {
  const res = await fetch(`${API_BASE}/connections/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

// Bucket API
export async function listBuckets(): Promise<Bucket[]> {
  const res = await fetch(`${API_BASE}/buckets`, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.buckets;
}

export async function createBucket(name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/buckets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

export async function deleteBucket(name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/buckets/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

// Object API
export async function listObjects(bucket: string, prefix: string = ''): Promise<S3Object[]> {
  const params = new URLSearchParams({ prefix });
  const res = await fetch(`${API_BASE}/objects/${encodeURIComponent(bucket)}?${params}`, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.objects;
}

export async function getDownloadUrl(bucket: string, key: string): Promise<string> {
  const params = new URLSearchParams({ key });
  const res = await fetch(`${API_BASE}/objects/${encodeURIComponent(bucket)}/download?${params}`, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.url;
}

export async function uploadFiles(bucket: string, prefix: string, files: File[]): Promise<void> {
  const formData = new FormData();
  formData.append('prefix', prefix);
  files.forEach(file => formData.append('files', file));

  const res = await fetch(`${API_BASE}/objects/${encodeURIComponent(bucket)}/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

export async function createFolder(bucket: string, path: string): Promise<void> {
  const res = await fetch(`${API_BASE}/objects/${encodeURIComponent(bucket)}/folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

export async function renameObject(bucket: string, oldKey: string, newKey: string): Promise<void> {
  const res = await fetch(`${API_BASE}/objects/${encodeURIComponent(bucket)}/rename`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldKey, newKey }),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

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
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

export async function deleteObject(bucket: string, key: string, isFolder: boolean): Promise<void> {
  const params = new URLSearchParams({ key, isFolder: String(isFolder) });
  const res = await fetch(`${API_BASE}/objects/${encodeURIComponent(bucket)}?${params}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}
