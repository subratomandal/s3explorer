import type { Bucket, S3Object } from './types';

const API_BASE = '/api';

export type { Bucket, S3Object };

export async function listBuckets(): Promise<Bucket[]> {
  const res = await fetch(`${API_BASE}/buckets`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.buckets;
}

export async function createBucket(name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/buckets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

export async function deleteBucket(name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/buckets/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

export async function listObjects(bucket: string, prefix: string = ''): Promise<S3Object[]> {
  const params = new URLSearchParams({ prefix });
  const res = await fetch(`${API_BASE}/objects/${encodeURIComponent(bucket)}?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.objects;
}

export async function getDownloadUrl(bucket: string, key: string): Promise<string> {
  const params = new URLSearchParams({ key });
  const res = await fetch(`${API_BASE}/objects/${encodeURIComponent(bucket)}/download?${params}`);
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
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

export async function createFolder(bucket: string, path: string): Promise<void> {
  const res = await fetch(`${API_BASE}/objects/${encodeURIComponent(bucket)}/folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

export async function renameObject(bucket: string, oldKey: string, newKey: string): Promise<void> {
  const res = await fetch(`${API_BASE}/objects/${encodeURIComponent(bucket)}/rename`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldKey, newKey }),
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
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

export async function deleteObject(bucket: string, key: string, isFolder: boolean): Promise<void> {
  const params = new URLSearchParams({ key, isFolder: String(isFolder) });
  const res = await fetch(`${API_BASE}/objects/${encodeURIComponent(bucket)}?${params}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

export interface ConnectionConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  region?: string;
  forcePathStyle?: boolean;
}

export interface ConnectionStatus {
  endpoint: string;
  region: string;
  forcePathStyle: boolean;
  connected: boolean;
  source: 'environment' | 'dynamic';
}

export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const res = await fetch(`${API_BASE}/config`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function connectToS3(config: ConnectionConfig): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/config/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function disconnectFromS3(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/config/disconnect`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function testConnection(config: ConnectionConfig): Promise<{ success: boolean; bucketCount: number }> {
  const res = await fetch(`${API_BASE}/config/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}
