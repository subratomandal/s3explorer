/**
 * @fileoverview Centralized TypeScript type definitions for the client application.
 * This file contains all shared interfaces used across the React components and API layer.
 */

/**
 * Represents an S3 bucket returned from the API.
 * @interface Bucket
 */
export interface Bucket {
  /** The unique name of the bucket */
  name: string;
  /** ISO timestamp of when the bucket was created */
  creationDate?: string;
}

/**
 * Represents an object (file or folder) stored in an S3 bucket.
 * @interface S3Object
 */
export interface S3Object {
  /** The full path/key of the object in the bucket */
  key: string;
  /** Size of the object in bytes (0 for folders) */
  size: number;
  /** ISO timestamp of when the object was last modified */
  lastModified?: string;
  /** Whether this object represents a folder (prefix) */
  isFolder: boolean;
}

/**
 * State for displaying toast notifications.
 * @interface ToastState
 */
export interface ToastState {
  /** The message to display in the toast */
  message: string;
  /** The type of toast - determines styling (green for success, red for error) */
  type: 'success' | 'error';
}

/**
 * State for the context menu including position and selected object.
 * @interface ContextMenuState
 */
export interface ContextMenuState {
  /** X coordinate (pixels from left) where the context menu should appear */
  x: number;
  /** Y coordinate (pixels from top) where the context menu should appear */
  y: number;
  /** The S3 object that was right-clicked */
  object: S3Object;
}
