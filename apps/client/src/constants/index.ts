// API and Network Constants
export const API_TIMEOUTS = {
  DEFAULT: 30000,           // 30 seconds - standard operations
  UPLOAD: 300000,           // 5 minutes - file uploads
  DELETE_BUCKET: 120000,    // 2 minutes - bucket deletion (empties first)
  DELETE_FOLDER: 120000,    // 2 minutes - recursive folder deletion
  RENAME: 60000,            // 1 minute - rename (copy + delete)
  CONNECTION_TEST: 60000,   // 1 minute - connection testing
} as const;

// UI Constants
export const UI_DELAYS = {
  SEARCH_DEBOUNCE: 150,     // Debounce delay for search inputs (ms)
  TOAST_DURATION: 3000,     // Toast notification display time (ms)
  COPY_FEEDBACK: 2000,      // "Copied" feedback display time (ms)
  UPLOAD_PROGRESS_FAKE: 200, // Fake progress update interval (ms)
  ANIMATION_STAGGER: 30,    // Stagger delay between animated items (ms)
} as const;

// File Size Constants
export const FILE_SIZES = {
  MAX_UPLOAD: 100 * 1024 * 1024,        // 100MB - max single upload
  MULTIPART_THRESHOLD: 100 * 1024 * 1024, // 100MB - threshold for multipart
  MULTIPART_CHUNK_SIZE: 5 * 1024 * 1024,  // 5MB - chunk size for multipart
} as const;

// Validation Constants
export const VALIDATION = {
  BUCKET_NAME_MIN: 3,
  BUCKET_NAME_MAX: 63,
  OBJECT_KEY_MAX: 1024,
  FILE_NAME_MAX: 255,
} as const;

// Pagination Constants
export const PAGINATION = {
  OBJECTS_PER_PAGE: 1000,   // S3 list objects limit
  VIRTUAL_SCROLL_THRESHOLD: 100, // Use virtual scroll when items exceed this
  ROW_HEIGHT: 44,           // Height of each row in virtual scroll (px)
  OVERSCAN_COUNT: 5,        // Extra rows to render above/below viewport
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  THEME: 's3-explorer-theme',
  WELCOME_DISMISSED: 's3-explorer-welcome-dismissed',
} as const;

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  COMMAND_PALETTE: 'k',     // Cmd/Ctrl + K
  CONNECTIONS: ',',         // Cmd/Ctrl + ,
  UPLOAD: 'u',              // Cmd/Ctrl + U
  NEW_FOLDER: 'n',          // Cmd/Ctrl + Shift + N
  REFRESH: 'r',             // Cmd/Ctrl + R (with shift to avoid browser refresh)
} as const;

// Preview Configuration
export const PREVIEW = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB max for preview
  SUPPORTED_IMAGE_TYPES: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp'],
  SUPPORTED_TEXT_TYPES: ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'tsx', 'jsx', 'yml', 'yaml', 'toml', 'ini', 'cfg', 'log', 'sh', 'bash', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp'],
  SUPPORTED_VIDEO_TYPES: ['mp4', 'webm', 'ogg'],
  SUPPORTED_AUDIO_TYPES: ['mp3', 'wav', 'ogg', 'aac', 'm4a'],
} as const;
