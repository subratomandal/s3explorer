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
  DeleteObjectsCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { connections, ConnectionRecord } from './db.js';
import { unpackAndDecrypt } from './crypto.js';
import type { BucketInfo, ObjectInfo, ObjectMetadata } from '../types/index.js';

export type { BucketInfo, ObjectInfo, ObjectMetadata };

export interface S3ConnectionConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  region?: string;
  forcePathStyle?: boolean;
}

// Get S3 client - uses active connection from DB or provided config
function getS3Client(configOverride?: S3ConnectionConfig): S3Client {
  if (configOverride) {
    return new S3Client({
      endpoint: configOverride.endpoint,
      region: configOverride.region || 'us-east-1',
      credentials: {
        accessKeyId: configOverride.accessKey,
        secretAccessKey: configOverride.secretKey,
      },
      forcePathStyle: configOverride.forcePathStyle ?? true,
    });
  }

  // Get active connection from DB
  const active = connections.getActive();

  if (!active) {
    throw new Error('No active S3 connection. Please add and activate a connection.');
  }

  // Decrypt credentials
  const accessKey = unpackAndDecrypt(active.access_key_enc);
  const secretKey = unpackAndDecrypt(active.secret_key_enc);

  return new S3Client({
    endpoint: active.endpoint,
    region: active.region || 'us-east-1',
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: !!active.force_path_style,
  });
}

export async function listBuckets(config?: S3ConnectionConfig): Promise<BucketInfo[]> {
  const client = getS3Client(config);
  const command = new ListBucketsCommand({});
  const response = await client.send(command);

  return (response.Buckets || []).map(bucket => ({
    name: bucket.Name || '',
    creationDate: bucket.CreationDate,
  }));
}

export async function createBucket(name: string): Promise<void> {
  const client = getS3Client();
  const command = new CreateBucketCommand({ Bucket: name });
  await client.send(command);
}

async function emptyBucket(bucket: string): Promise<void> {
  const client = getS3Client();
  let continuationToken: string | undefined;

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
    });
    const listResponse = await client.send(listCommand);

    if (listResponse.Contents && listResponse.Contents.length > 0) {
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: listResponse.Contents.map(obj => ({ Key: obj.Key })),
          Quiet: true,
        },
      });
      await client.send(deleteCommand);
    }

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);
}

export async function deleteBucket(name: string): Promise<void> {
  const client = getS3Client();
  await emptyBucket(name);
  const command = new DeleteBucketCommand({ Bucket: name });
  await client.send(command);
}

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

  const objects: ObjectInfo[] = (response.Contents || [])
    .filter(obj => obj.Key !== prefix)
    .map(obj => ({
      key: obj.Key || '',
      size: obj.Size || 0,
      lastModified: obj.LastModified,
      isFolder: false,
    }));

  const prefixes = (response.CommonPrefixes || []).map(p => p.Prefix || '');

  prefixes.forEach(p => {
    objects.push({
      key: p,
      size: 0,
      isFolder: true,
    });
  });

  return { objects, prefixes };
}

export async function getObjectUrl(
  bucket: string,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn });
}

export async function getObjectStream(bucket: string, key: string) {
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await client.send(command);
  return response.Body;
}

// Size threshold for multipart upload (100MB)
const MULTIPART_THRESHOLD = 100 * 1024 * 1024;
// Part size for multipart upload (5MB minimum, using 10MB)
const PART_SIZE = 10 * 1024 * 1024;

export async function uploadObject(
  bucket: string,
  key: string,
  body: Buffer,
  contentType?: string
): Promise<void> {
  const client = getS3Client();

  // Use multipart upload for large files
  if (body.length > MULTIPART_THRESHOLD) {
    await uploadMultipart(client, bucket, key, body, contentType);
    return;
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await client.send(command);
}

// Multipart upload for large files
async function uploadMultipart(
  client: S3Client,
  bucket: string,
  key: string,
  body: Buffer,
  contentType?: string
): Promise<void> {
  // Start multipart upload
  const createCommand = new CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  const { UploadId } = await client.send(createCommand);

  if (!UploadId) {
    throw new Error('Failed to initiate multipart upload');
  }

  try {
    const parts: { ETag: string; PartNumber: number }[] = [];
    const totalParts = Math.ceil(body.length / PART_SIZE);

    // Upload parts in parallel (max 5 concurrent)
    const concurrency = 5;
    for (let i = 0; i < totalParts; i += concurrency) {
      const batch = [];
      for (let j = i; j < Math.min(i + concurrency, totalParts); j++) {
        const partNumber = j + 1;
        const start = j * PART_SIZE;
        const end = Math.min(start + PART_SIZE, body.length);
        const partBody = body.subarray(start, end);

        batch.push(
          client.send(new UploadPartCommand({
            Bucket: bucket,
            Key: key,
            UploadId,
            PartNumber: partNumber,
            Body: partBody,
          })).then(result => ({
            ETag: result.ETag!,
            PartNumber: partNumber,
          }))
        );
      }

      const results = await Promise.all(batch);
      parts.push(...results);
    }

    // Sort parts by part number (required for completion)
    parts.sort((a, b) => a.PartNumber - b.PartNumber);

    // Complete multipart upload
    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId,
      MultipartUpload: { Parts: parts },
    });
    await client.send(completeCommand);
  } catch (error) {
    // Abort on error
    try {
      await client.send(new AbortMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId,
      }));
    } catch (abortError) {
      console.error('Failed to abort multipart upload:', abortError);
    }
    throw error;
  }
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
  const client = getS3Client();
  const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
  await client.send(command);
}

export async function deleteFolder(bucket: string, prefix: string): Promise<void> {
  const client = getS3Client();

  const listCommand = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
  });
  const response = await client.send(listCommand);

  for (const obj of response.Contents || []) {
    if (obj.Key) {
      await deleteObject(bucket, obj.Key);
    }
  }
}

export async function renameObject(
  bucket: string,
  oldKey: string,
  newKey: string
): Promise<void> {
  const client = getS3Client();
  const isFolder = oldKey.endsWith('/');

  if (isFolder) {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: oldKey,
    });
    const response = await client.send(listCommand);

    for (const obj of response.Contents || []) {
      if (obj.Key) {
        const newObjKey = obj.Key.replace(oldKey, newKey);

        const copyCommand = new CopyObjectCommand({
          Bucket: bucket,
          CopySource: encodeURIComponent(`${bucket}/${obj.Key}`),
          Key: newObjKey,
        });
        await client.send(copyCommand);

        await deleteObject(bucket, obj.Key);
      }
    }
  } else {
    const copyCommand = new CopyObjectCommand({
      Bucket: bucket,
      CopySource: encodeURIComponent(`${bucket}/${oldKey}`),
      Key: newKey,
    });
    await client.send(copyCommand);

    await deleteObject(bucket, oldKey);
  }
}

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

export async function createFolder(bucket: string, path: string): Promise<void> {
  const client = getS3Client();
  const folderKey = path.endsWith('/') ? path : `${path}/`;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: folderKey,
    Body: Buffer.alloc(0),
  });
  await client.send(command);
}

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
