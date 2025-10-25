# Settings Modal Environment Variable Configuration

## Summary

Updated the SettingsModal component to dynamically read backend ports from environment variables instead of using hardcoded values. This allows users to configure the preset backend ports via `.env` file to match their actual backend configurations.

## Problem

The Settings modal had hardcoded port numbers for each backend preset:
```typescript
const PRESET_BACKENDS = [
  { name: 'TypeORM', url: 'http://localhost:3000', port: 3000 },
  { name: 'SQLModel', url: 'http://localhost:3002', port: 3002 },
  // ... etc
];
```

If a user's backends ran on different ports, the presets would be incorrect and misleading.

## Solution

Made the preset ports configurable via environment variables with sensible defaults:

```typescript
const getBackendPort = (envVarName: string, defaultPort: number): number => {
  const envPort = import.meta.env[envVarName];
  return envPort ? parseInt(envPort, 10) : defaultPort;
};

const PRESET_BACKENDS = [
  {
    name: 'TypeORM',
    port: getBackendPort('VITE_TYPEORM_PORT', 3000),
    get url() {
      return `http://localhost:${this.port}`;
    },
  },
  // ... etc
];
```

## Environment Variables

### New Variables

| Variable               | Default | Description                          |
|------------------------|---------|--------------------------------------|
| `VITE_TYPEORM_PORT`    | 3000    | Port for TypeORM backend preset      |
| `VITE_SQLMODEL_PORT`   | 3002    | Port for SQLModel backend preset     |
| `VITE_DRIZZLE_PORT`    | 3003    | Port for Drizzle backend preset      |
| `VITE_PRISMA_PORT`     | 3004    | Port for Prisma backend preset       |
| `VITE_SEQUELIZE_PORT`  | 3005    | Port for Sequelize backend preset    |

### Existing Variable

| Variable           | Default                   | Description                |
|--------------------|---------------------------|----------------------------|
| `VITE_API_URL`     | http://localhost:3002     | Initial API URL to connect |

## Usage Examples

### Example 1: Default Configuration
No `.env` file needed - defaults work out of the box:
- TypeORM shows "Port 3000"
- SQLModel shows "Port 3002"
- etc.

### Example 2: Custom TypeORM Port
If your TypeORM backend runs on port 8080:

**`.env` file:**
```bash
VITE_TYPEORM_PORT=8080
VITE_API_URL=http://localhost:8080
```

**Result:**
- Settings modal shows "TypeORM - Port 8080"
- Initial connection uses port 8080

### Example 3: Multiple Custom Ports
Configure all backends with custom ports:

**`.env` file:**
```bash
VITE_TYPEORM_PORT=8001
VITE_SQLMODEL_PORT=8002
VITE_DRIZZLE_PORT=8003
VITE_PRISMA_PORT=8004
VITE_SEQUELIZE_PORT=8005
```

**Result:**
All presets in Settings modal show the correct custom ports.

## Files Modified

### 1. `src/components/SettingsModal.tsx`
**Changes:**
- Added `getBackendPort()` helper function
- Modified `PRESET_BACKENDS` to use getter for `url` property
- Reads from environment variables with fallback to defaults

**Key Code:**
```typescript
const getBackendPort = (envVarName: string, defaultPort: number): number => {
  const envPort = import.meta.env[envVarName];
  return envPort ? parseInt(envPort, 10) : defaultPort;
};
```

### 2. `.env.example`
**Changes:**
- Added documentation for all port variables
- Included examples showing default values
- Explained when and why to use these variables

**New Section:**
```bash
# Backend Port Configuration
# These define the ports shown in the Settings modal presets
# Defaults are shown - uncomment and change if your backends use different ports

# TypeORM Backend Port (default: 3000)
# VITE_TYPEORM_PORT=3000
```

### 3. Documentation Updates
Updated the following docs:
- `TEST_CLIENT_PORT_CONFIG.md` - Added port variable table
- `TEST_CLIENT_SETTINGS_UI.md` - Added backend port configuration section
- `README.md` - Added example of configuring custom ports

## Technical Details

### Why Use Getter for `url`?

The `url` property is defined as a getter:
```typescript
{
  name: 'TypeORM',
  port: getBackendPort('VITE_TYPEORM_PORT', 3000),
  get url() {
    return `http://localhost:${this.port}`;
  },
}
```

This ensures the URL is always constructed from the current port value, keeping the object structure clean and reactive.

### Why `import.meta.env`?

Vite exposes environment variables through `import.meta.env` instead of `process.env`. This is the standard way to access env vars in Vite applications.

### Why `VITE_` Prefix?

Vite requires the `VITE_` prefix for environment variables to be exposed to client-side code. This is a security feature to prevent accidentally exposing server-side secrets.

### Type Safety

The `getBackendPort()` function ensures proper type handling:
- Reads string from env
- Parses to integer
- Falls back to default if not set or invalid

## Benefits

1. **Flexibility**: Users can configure backend ports without code changes
2. **Environment-Specific**: Different ports for dev/staging/prod
3. **Self-Documenting**: Presets always show correct ports
4. **No Surprises**: What you see in Settings matches reality
5. **Easy Testing**: Quickly test different port configurations

## Backwards Compatibility

Fully backwards compatible:
- Defaults match previous hardcoded values
- No breaking changes
- Optional enhancement - not required

Users without `.env` configuration see no difference in behavior.

## Example Workflow

### Developer Setup
```bash
# 1. Clone repo
git clone ...

# 2. Copy .env.example
cd apps/test-client
cp .env.example .env

# 3. Check backend ports
cd ../typeorm-example
grep DEFAULT_PORT src/index.ts
# Output: const DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10);

# 4. Backends use defaults - no changes needed
cd ../test-client
pnpm dev

# 5. Settings modal shows correct ports automatically
```

### Custom Port Setup
```bash
# Backend runs on custom port
cd apps/typeorm-example
PORT=8080 pnpm dev

# Configure test client to match
cd ../test-client
echo "VITE_TYPEORM_PORT=8080" >> .env
echo "VITE_API_URL=http://localhost:8080" >> .env
pnpm dev

# Settings modal now shows "TypeORM - Port 8080"
```

## Testing

To verify the configuration works:

1. **Test defaults:**
   ```bash
   # Remove any .env file
   rm .env
   pnpm dev
   # Open Settings - should show default ports (3000, 3002, etc.)
   ```

2. **Test custom port:**
   ```bash
   echo "VITE_TYPEORM_PORT=9999" > .env
   pnpm dev
   # Open Settings - TypeORM should show "Port 9999"
   ```

3. **Test multiple custom ports:**
   ```bash
   cat > .env << EOF
   VITE_TYPEORM_PORT=8001
   VITE_SQLMODEL_PORT=8002
   EOF
   pnpm dev
   # Open Settings - both should show custom ports
   ```

## Future Enhancements

Potential improvements:
1. **Auto-detect running backends**: Scan ports and show only available backends
2. **Health check integration**: Show green/red status for each preset
3. **Port availability check**: Warn if port is already in use
4. **Import backend config**: Read ports directly from backend package.json
5. **Docker integration**: Detect Docker container ports automatically

## Summary

This enhancement makes the Settings modal truly dynamic and environment-aware. Users can now configure their backend ports once in `.env` and have the UI automatically reflect the correct configuration. This eliminates confusion and makes the test client more production-ready.
