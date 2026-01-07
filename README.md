# S3 Explorer

Self-hosted S3 file browser. Single-user, secure, minimal.

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Container                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   Express Server                        │ │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐│ │
│  │  │   Auth   │──│ Sessions │──│    API Routes         ││ │
│  │  │ (Argon2) │  │ (SQLite) │  │ /buckets /objects     ││ │
│  │  └──────────┘  └──────────┘  │ /connections          ││ │
│  │                              └───────────┬───────────┘│ │
│  │  ┌──────────────────────────────────────┼────────────┐│ │
│  │  │            SQLite + AES-256-GCM      │            ││ │
│  │  │  • sessions • connections (encrypted)│            ││ │
│  │  └──────────────────────────────────────┴────────────┘│ │
│  └────────────────────────────────────────────────────────┘ │
│                             │                                │
│  ┌──────────────────────────▼───────────────────────────┐   │
│  │           /data (Railway Volume)                      │   │
│  │   s3explorer.db   encryption.key                      │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    [ S3 / MinIO / R2 ]
```

## Quick Start

### Railway

1. Fork repo
2. New project → Deploy from GitHub
3. Add volume: mount path `/data`
4. Set environment variables:
   ```
   APP_PASSWORD=YourSecureP@ssw0rd!   # Required: 12+ chars, upper, lower, number, special
   SESSION_SECRET=<random-64-chars>   # Required: openssl rand -hex 32
   ```
5. Deploy

### Docker

```bash
# Create .env
cat > .env << EOF
APP_PASSWORD=YourSecureP@ssw0rd!
SESSION_SECRET=$(openssl rand -hex 32)
EOF

# Run
docker-compose up -d

# Open http://localhost:3000
```

### Local Dev

```bash
# Install
npm run install:all

# Set password
export APP_PASSWORD="YourSecureP@ssw0rd!"
export DATA_DIR="./data"

# Run
npm run dev
```

## Environment Variables

| Variable         | Required | Description                                                               |
| ---------------- | -------- | ------------------------------------------------------------------------- |
| `APP_PASSWORD`   | Yes      | Login password. Must be 12+ chars with upper, lower, number, special char |
| `SESSION_SECRET` | Yes      | Session signing key. Use `openssl rand -hex 32`                           |
| `DATA_DIR`       | No       | SQLite/key storage path. Default: `/data`                                 |
| `PORT`           | No       | Server port. Default: `3000`                                              |

## Security

- **Auth**: Password hashed with Argon2id
- **Sessions**: httpOnly, secure, sameSite=strict cookies
- **S3 creds**: AES-256-GCM encrypted at rest
- **Rate limit**: 10 attempts per 15min, 30min lockout
- **Headers**: helmet.js security headers
- **Input**: Sanitized bucket names, file paths

## Features

- Multi-connection S3 management (AWS, MinIO, R2, etc.)
- File upload/download/delete/rename
- Folder navigation
- Bucket create/delete
- Presigned URLs for downloads

## Stack

- **Frontend**: React, Tailwind, Vite
- **Backend**: Express, TypeScript
- **Database**: SQLite (better-sqlite3)
- **Auth**: Argon2, express-session

## License

MIT
