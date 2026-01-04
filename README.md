# Railway Bucket Explorer

A modern, beautiful web-based file manager for S3-compatible storage buckets. Built with React and Express, designed to integrate seamlessly with Railway's design language.

![Railway Bucket Explorer](https://img.shields.io/badge/Railway-Bucket%20Explorer-C049FF?style=for-the-badge)

## Features

### File Operations
- **Upload** - Drag-and-drop or file picker with progress indicator
- **Download** - Secure presigned URLs for direct downloads
- **Rename** - Rename files and folders with a simple modal
- **Delete** - Delete files and folders with confirmation
- **Create Folder** - Create new folders for organization

### Bucket Management
- View all buckets with search/filter
- Create new buckets
- Delete empty buckets

### User Interface
- Dark theme matching Railway's design system
- Responsive layout for desktop and mobile
- Breadcrumb navigation for nested folders
- File type icons for common formats
- Loading states and skeleton placeholders
- Toast notifications for actions
- Context menus for quick actions

## Project Structure

```
railway-bucket-explorer/
├── client/                      # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── modals/          # Modal dialogs
│   │   │   ├── ContextMenu.tsx  # Right-click menu
│   │   │   ├── EmptyState.tsx   # Empty state placeholder
│   │   │   ├── ErrorBanner.tsx  # Error message banner
│   │   │   ├── FileTable.tsx    # File/folder table
│   │   │   ├── Header.tsx       # Top navigation bar
│   │   │   ├── Modal.tsx        # Reusable modal base
│   │   │   ├── Sidebar.tsx      # Bucket list sidebar
│   │   │   ├── Spinner.tsx      # Loading spinner
│   │   │   ├── Toast.tsx        # Notification toasts
│   │   │   ├── UploadProgress.tsx # Upload progress bar
│   │   │   └── DropOverlay.tsx  # Drag-drop overlay
│   │   ├── types/               # TypeScript interfaces
│   │   ├── utils/               # Utility functions
│   │   ├── api.ts               # API client
│   │   ├── App.tsx              # Main application
│   │   └── main.tsx             # Entry point
│   └── public/                  # Static assets
│
├── server/                      # Express backend (TypeScript)
│   ├── src/
│   │   ├── routes/              # API route handlers
│   │   │   ├── buckets.ts       # Bucket CRUD endpoints
│   │   │   ├── objects.ts       # Object CRUD endpoints
│   │   │   └── config.ts        # Configuration endpoints
│   │   ├── services/
│   │   │   └── s3.ts            # S3 SDK operations
│   │   ├── types/               # TypeScript interfaces
│   │   └── index.ts             # Server entry point
│   └── package.json
│
├── Dockerfile                   # Multi-stage production build
├── docker-compose.yml           # Local development with Minio
├── railway.toml                 # Railway deployment config
└── package.json                 # Root workspace scripts
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Storage | AWS SDK v3 for S3 operations |
| Dev Tools | Minio (local S3), Docker |
| Deployment | Docker container, Railway |

## Quick Start

### Prerequisites
- Node.js 18+
- Docker (for local S3 with Minio)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/subratomandalme/railway-bucket-explorer.git
   cd railway-bucket-explorer
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Start Minio (local S3)**
   ```bash
   docker-compose up minio -d
   ```

4. **Create environment file**
   ```bash
   cat > .env << EOF
   S3_ENDPOINT=http://localhost:9000
   S3_ACCESS_KEY=minioadmin
   S3_SECRET_KEY=minioadmin
   S3_REGION=us-east-1
   S3_FORCE_PATH_STYLE=true
   EOF
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

6. **Open the app**
   - App: http://localhost:5173
   - Minio Console: http://localhost:9001 (minioadmin/minioadmin)

## API Reference

### Bucket Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/buckets` | List all buckets |
| `POST` | `/api/buckets` | Create bucket `{name}` |
| `DELETE` | `/api/buckets/:name` | Delete bucket |

### Object Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/objects/:bucket` | List objects `?prefix=path/` |
| `GET` | `/api/objects/:bucket/download` | Get download URL `?key=path` |
| `GET` | `/api/objects/:bucket/metadata` | Get metadata `?key=path` |
| `POST` | `/api/objects/:bucket/upload` | Upload files (multipart) |
| `POST` | `/api/objects/:bucket/folder` | Create folder `{path}` |
| `PUT` | `/api/objects/:bucket/rename` | Rename `{oldKey, newKey}` |
| `POST` | `/api/objects/:bucket/copy` | Copy `{sourceKey, destKey}` |
| `DELETE` | `/api/objects/:bucket` | Delete `?key=path&isFolder=bool` |

### Config Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/config` | Get connection status |
| `GET` | `/api/config/environments` | Get env var documentation |
| `GET` | `/api/health` | Health check |

## Deployment

### Deploy to Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Set the environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `S3_ENDPOINT` | S3-compatible endpoint URL | Yes |
| `S3_ACCESS_KEY` | Access key ID | Yes |
| `S3_SECRET_KEY` | Secret access key | Yes |
| `S3_REGION` | AWS region | No (default: us-east-1) |
| `S3_FORCE_PATH_STYLE` | Use path-style URLs | No (default: true) |

4. Deploy!

### Connecting to Different Providers

**AWS S3:**
```
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
S3_FORCE_PATH_STYLE=false
```

**Cloudflare R2:**
```
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
```

**DigitalOcean Spaces:**
```
S3_ENDPOINT=https://<region>.digitaloceanspaces.com
```

## Component Overview

### Client Components

| Component | Purpose |
|-----------|---------|
| `App` | Main application with state management |
| `Sidebar` | Bucket list with search |
| `Header` | Breadcrumb navigation and actions |
| `FileTable` | File/folder table view |
| `Modal` | Reusable modal dialog |
| `Toast` | Auto-dismissing notifications |
| `ContextMenu` | Right-click action menu |
| `EmptyState` | Empty folder/bucket placeholder |
| `UploadProgress` | File upload progress bar |
| `DropOverlay` | Drag-and-drop visual indicator |
| `ErrorBanner` | Dismissible error messages |

### Server Services

| Service | Purpose |
|---------|---------|
| `s3.ts` | All S3 operations (list, upload, download, delete, copy, rename) |

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
