<small>
  
## Contributing to S3 Explorer

Thanks for your interest in contributing, this covers everything you need


### Project Structure

```
s3explorer/
  apps/
    client/          # React frontend (Vite + Tailwind)
      src/
        api.ts       # API client, error handling, request cancellation
        App.tsx      # Root component, auth flow, state management
        components/  # UI components
        hooks/       # useDebounce, useNetworkStatus
        utils/       # Formatting, validation, file helpers
        types/       # TypeScript interfaces
        constants/   # Timeouts, pagination, storage keys
    server/          # Express backend (TypeScript)
      src/
        index.ts     # Server entry, middleware, route mounting
        middleware/   # Auth (Argon2, rate limiting, sessions)
        routes/      # API routes (auth, buckets, objects, connections, setup)
        services/    # S3 client, SQLite, AES-256-GCM encryption, zip streaming
        types/       # Shared interfaces
```

### Local Development

```bash
git clone https://github.com/subratomandal/s3explorer.git
cd s3explorer
npm run install:all

export APP_PASSWORD='DevPassword123!'
export SESSION_SECRET='dev-secret-not-for-production-use!!'
export DATA_DIR='./data'

npm run dev
```

Backend on :3000, frontend on :5173, Vite proxies `/api` to Express

### Before You Start

1. Check existing [issues](https://github.com/subratomandal/s3explorer/issues)
2. For large changes, open an issue first

### Branch Naming

1. `fix/short-description`
2. `feat/short-description`
3. `docs/short-description`

### Code Style

1. TypeScript strict mode, avoid `any`
2. Functional React components, hooks only
3. Tailwind utility classes, base styles in `index.css`
4. camelCase for variables, PascalCase for components, UPPER_SNAKE for constants
5. Comments only where the "why" isn't obvious

### Testing Changes

```bash
cd apps/client && npx tsc --noEmit
cd apps/server && npx tsc --noEmit
npm run build
```

### Key Files

| File | What it does |
|------|-------------|
| `apps/client/src/api.ts` | Every API call, error mapping, upload progress |
| `apps/client/src/App.tsx` | All app state, auth flow, event handlers |
| `apps/server/src/services/s3.ts` | S3 SDK wrapper, all bucket/object operations |
| `apps/server/src/services/zip.ts` | Streams folder/multi-file downloads as a `.zip` |
| `apps/server/src/services/db.ts` | SQLite schema, session store, CRUD |
| `apps/server/src/services/crypto.ts` | AES-256-GCM encrypt/decrypt for stored credentials |
| `apps/server/src/middleware/auth.ts` | Password verification, rate limiting, sessions |

### Pull Requests

1. One feature or fix per PR
2. Both `tsc --noEmit` checks must pass
3. Test in dark and light themes, desktop and mobile

### License

By contributing, you agree your work is licensed under MIT

</small>
