# Test Client Port Configuration

## Summary

Made the test-client app's API endpoint dynamically configurable via environment variables, allowing it to connect to different backend servers running on different ports.

## Problem

The test-client had a hardcoded API URL (`http://localhost:3002`) in `src/lib/api.ts`. This meant it could only connect to one backend at a time. Since different ORM examples run on different ports, users had to manually edit the code to switch backends.

## Solution

Implemented environment-based configuration using Vite's built-in environment variable support.

## Changes Made

### 1. Dynamic API URL Configuration
**File:** `apps/test-client/src/lib/api.ts`

Changed from:
```typescript
const API_BASE_URL = 'http://localhost:3002';
```

To:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

// Log API URL on first module load for debugging
console.log(`[API] Connecting to backend: ${API_BASE_URL}`);
```

- Reads `VITE_API_URL` environment variable
- Falls back to port 3002 (SQLModel backend) if not set
- Logs the API URL to browser console for debugging

### 2. Environment Variable Template
**File:** `apps/test-client/.env.example` (new file)

Created example configuration file documenting all backend ports:
```bash
# For TypeORM backend (default)
# VITE_API_URL=http://localhost:3000

# For SQLModel backend (default if not set)
VITE_API_URL=http://localhost:3002

# For Drizzle backend
# VITE_API_URL=http://localhost:3003

# For Prisma backend
# VITE_API_URL=http://localhost:3004

# For Sequelize backend
# VITE_API_URL=http://localhost:3005
```

### 3. Updated .gitignore
**File:** `apps/test-client/.gitignore`

Added explicit patterns to ensure `.env` files are not committed:
```gitignore
# Environment variables
.env
.env.local
.env.*.local
```

### 4. Updated Documentation
**File:** `apps/test-client/README.md`

Added comprehensive configuration section:

**Installation Section:**
- Added steps to copy and configure `.env` file
- Documented optional nature of configuration

**New "Backend Configuration" Section:**
- Explains two methods: .env file and inline environment variables
- Shows examples for both TypeORM and SQLModel backends
- Documents default behavior

**Updated Troubleshooting:**
- Added steps to verify VITE_API_URL is set correctly
- Explained how to check configuration via browser console
- Added reminder to restart dev server after changing .env

## Usage

### Method 1: Using .env File (Recommended)

```bash
cd apps/test-client

# Copy the example file
cp .env.example .env

# Edit .env and uncomment/set the backend you want
# For TypeORM:
echo "VITE_API_URL=http://localhost:3000" > .env

# Start the client
pnpm dev
```

### Method 2: Inline Environment Variable

```bash
# TypeORM backend
VITE_API_URL=http://localhost:3000 pnpm dev

# SQLModel backend
VITE_API_URL=http://localhost:3002 pnpm dev
```

### Verification

When the test client starts, check the browser console. You should see:
```
[API] Connecting to backend: http://localhost:3000
```

This confirms which backend the client is configured to use.

## Backend Port Reference

| Backend    | Default Port | API URL Variable                      | Port Variable              |
|------------|--------------|---------------------------------------|----------------------------|
| TypeORM    | 3000         | `VITE_API_URL=http://localhost:3000` | `VITE_TYPEORM_PORT=3000`   |
| SQLModel   | 3002         | `VITE_API_URL=http://localhost:3002` | `VITE_SQLMODEL_PORT=3002`  |
| Drizzle    | 3003         | `VITE_API_URL=http://localhost:3003` | `VITE_DRIZZLE_PORT=3003`   |
| Prisma     | 3004         | `VITE_API_URL=http://localhost:3004` | `VITE_PRISMA_PORT=3004`    |
| Sequelize  | 3005         | `VITE_API_URL=http://localhost:3005` | `VITE_SEQUELIZE_PORT=3005` |

**Port Configuration:**
- `VITE_API_URL` - Sets the initial API URL
- `VITE_*_PORT` - Configures the port shown in Settings modal presets

**Note:** Currently only TypeORM and SQLModel have full API servers implemented. The other backends are library examples without HTTP servers.

### Customizing Backend Ports

If your backends run on different ports, configure them in `.env`:

```bash
# Example: TypeORM on custom port
VITE_TYPEORM_PORT=8080
VITE_API_URL=http://localhost:8080

# The Settings modal will now show TypeORM on port 8080
```

## Technical Details

### Why VITE_ Prefix?

Vite requires environment variables to be prefixed with `VITE_` to be exposed to client-side code. This is a security feature to prevent accidentally leaking server-side secrets to the browser.

### Why import.meta.env?

Vite uses ES modules and provides environment variables through `import.meta.env` rather than `process.env`. This is the standard way to access env vars in Vite applications.

### Console Logging

The console.log statement executes once when the api.ts module is first loaded. This helps with debugging without adding overhead to every API call.

## Future Improvements

Potential enhancements:
1. Add UI selector to switch backends without restarting
2. Detect available backends automatically
3. Store last-used backend in localStorage
4. Add health check on startup to verify backend availability
5. Show current backend in the UI header

## Related Files

- `apps/test-client/src/lib/api.ts` - API client implementation
- `apps/test-client/.env.example` - Environment variable template
- `apps/test-client/.gitignore` - Git ignore patterns
- `apps/test-client/README.md` - User documentation
- `apps/test-client/vite.config.ts` - Vite configuration (no changes needed - Vite handles env vars automatically)
