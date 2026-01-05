# Railway Bucket Explorer

A modern, beautiful web-based file manager for S3-compatible storage buckets. Built with React and Express, designed to integrate seamlessly with Railway's design language.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/bucket-explorer?referralCode=railway-bucket-explorer)

![Railway Bucket Explorer](https://img.shields.io/badge/Railway-Bucket%20Explorer-C049FF?style=for-the-badge)

## Features

### Multi-Environment Support
- **Connection Manager** - Switch between staging, production, or different providers without redeploying
- **Profile Persistence** - Save multiple connection profiles in browser storage
- **Dynamic Switching** - Change S3 credentials at runtime with instant bucket refresh

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
- Command Palette (Cmd+K) for keyboard-driven navigation
- Responsive layout for desktop and mobile
- Breadcrumb navigation for nested folders
- File type icons for common formats
- Loading states and skeleton placeholders
- Toast notifications for actions
- Context menus for quick actions
- Glass morphism and Railway-style UI polish

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Cmd+K` / `Ctrl+K` | Open command palette |
| `Cmd+,` / `Ctrl+,` | Open connection manager |
| `Escape` | Close modals |

## Project Structure

```
railway-bucket-explorer/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── modals/
│   │   │   │   └── ConnectionManagerModal.tsx  # Multi-environment switching
│   │   │   ├── CommandPalette.tsx   # Cmd+K navigation
│   │   │   ├── ContextMenu.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorBanner.tsx
│   │   │   ├── FileTable.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── UploadProgress.tsx
│   │   │   └── DropOverlay.tsx
│   │   ├── types/
│   │   ├── utils/
│   │   ├── api.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── public/
│
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── buckets.ts
│   │   │   ├── objects.ts
│   │   │   └── config.ts        # Dynamic connection switching
│   │   ├── services/
│   │   │   └── s3.ts
│   │   ├── types/
│   │   └── index.ts
│   └── package.json
│
├── Dockerfile
├── docker-compose.yml
├── railway.toml
├── railway.json                 # Railway template config
└── package.json
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Storage | AWS SDK v3 for S3 operations |
| Dev Tools | Minio (local S3), Docker, OrbStack |
| Deployment | Docker container, Railway |

## Quick Start

### Prerequisites
- Node.js 18+
- Docker (for local S3 with Minio)
- **OrbStack** (recommended for macOS) - Low resource Docker alternative

### Local Development with OrbStack

[OrbStack](https://orbstack.dev/) is the recommended way to run Docker containers on macOS due to its significantly lower resource usage compared to Docker Desktop.

1. **Install OrbStack**
   ```bash
   brew install orbstack
   ```

2. **Clone the repository**
   ```bash
   git clone https://github.com/subratomandalme/railway-bucket-explorer.git
   cd railway-bucket-explorer
   ```

3. **Install dependencies**
   ```bash
   npm run install:all
   ```

4. **Start Minio (local S3)**
   ```bash
   docker-compose up minio -d
   ```

5. **Create environment file**
   ```bash
   cat > .env << EOF
   S3_ENDPOINT=http://localhost:9000
   S3_ACCESS_KEY=minioadmin
   S3_SECRET_KEY=minioadmin
   S3_REGION=us-east-1
   S3_FORCE_PATH_STYLE=true
   EOF
   ```

6. **Start development servers**
   ```bash
   npm run dev
   ```

7. **Open the app**
   - App: http://localhost:5173
   - Minio Console: http://localhost:9001 (minioadmin/minioadmin)

## Multi-Environment Setup

### Using the Connection Manager

The Connection Manager allows you to switch between different S3 environments without redeploying:

1. Click the **Settings** icon in the header or press `Cmd+,`
2. Click **Add Connection** to create a new profile
3. Enter your S3 credentials (endpoint, access key, secret key)
4. Save and click on the profile to connect

Profiles are stored in your browser's local storage and persist across sessions.

### Environment Variable Profiles

For deployment scenarios, you can also configure multiple environments using environment variables:

```bash
# Primary connection (from environment)
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key

# Additional connections can be added via the UI
```

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
| `POST` | `/api/config/connect` | Switch S3 connection dynamically |
| `POST` | `/api/config/disconnect` | Revert to environment config |
| `POST` | `/api/config/test` | Test connection without switching |
| `GET` | `/api/config/environments` | Get env var documentation |
| `GET` | `/api/health` | Health check |

## Deployment

### One-Click Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/bucket-explorer?referralCode=railway-bucket-explorer)

Click the button above to deploy with one click. You'll be prompted to set the required environment variables.

### Manual Deploy to Railway

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

### Private Networking on Railway

For enhanced security when accessing private S3-compatible buckets:

1. **Deploy on Private Network**: In Railway's service settings, enable private networking
2. **Use Internal Endpoints**: If your S3 bucket is on Railway (e.g., Railway's Object Storage), use the internal DNS name
3. **Restrict Public Access**: The Bucket Explorer can run on a private network while still being accessible via Railway's public domain

Example configuration for Railway's private network:
```bash
# Internal endpoint (only accessible within Railway)
S3_ENDPOINT=http://your-minio-service.railway.internal:9000
```

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

**Railway Object Storage:**
```
S3_ENDPOINT=<provided-by-railway>
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
| `CommandPalette` | Cmd+K keyboard navigation |
| `ConnectionManagerModal` | Multi-environment switching |
| `Toast` | Auto-dismissing notifications |
| `ContextMenu` | Right-click action menu |
| `EmptyState` | Empty folder/bucket placeholder |
| `UploadProgress` | File upload progress bar |
| `DropOverlay` | Drag-and-drop visual indicator |
| `ErrorBanner` | Dismissible error messages |

### Server Services

| Service | Purpose |
|---------|---------|
| `s3.ts` | All S3 operations with dynamic connection support |
| `config.ts` | Connection switching and configuration endpoints |

## Security Considerations

- **Credentials Storage**: Connection profiles are stored in browser localStorage. For production use, consider implementing server-side encrypted storage.
- **Private Networks**: Run the Bucket Explorer on a private network when accessing sensitive buckets.
- **Access Control**: The app inherits permissions from the S3 credentials provided. Use IAM policies to restrict access.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
