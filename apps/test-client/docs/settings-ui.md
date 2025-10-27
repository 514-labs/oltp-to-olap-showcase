# Test Client Settings UI Implementation

## Summary

Added an in-app settings modal to the test client that allows users to configure the API URL without editing code or environment variables. The modal automatically appears when connection errors occur.

## Problem Solved

Previously, users had to:
1. Edit `.env` files
2. Restart the dev server
3. Manually edit source code
4. Know the exact port numbers for each backend

This created friction when switching between different backends or troubleshooting connection issues.

## Solution

Implemented a comprehensive settings UI with:
- **Settings modal** with preset backends
- **Auto-popup on connection errors**
- **Manual access via Settings button**
- **localStorage persistence** (survives page refreshes)
- **Instant reconnection** (no server restart needed)

## Architecture

### 1. Components Created

#### `src/components/SettingsModal.tsx`
A Dialog component that provides:
- Preset backend selection (TypeORM, SQLModel, Drizzle, Prisma, Sequelize)
- Custom URL input
- Visual feedback for current selection
- Connection error messaging
- Troubleshooting tips

**Features:**
- Click preset cards to quickly select a backend
- See current API URL at the top
- Manual URL entry for custom backends
- Validates and cleans URLs (removes trailing slashes)

#### `src/contexts/ApiContext.tsx`
React Context provider that manages:
- Current API URL state
- Settings modal visibility
- localStorage persistence
- Custom event listeners for API errors

**Key Functions:**
- `setApiUrl(url)` - Updates URL and persists to localStorage
- `showSettingsModal(connectionError)` - Opens modal (with error flag)
- `hideSettingsModal()` - Closes modal

### 2. API Client Updates

#### `src/lib/api.ts`
Enhanced to:
- Read API URL from localStorage (priority over env vars)
- Detect connection errors (network failures)
- Emit custom events to trigger settings modal
- Provide helpful error messages

**Error Detection:**
```typescript
catch (error) {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    // Network error - show settings modal
    showSettingsModal(true);
    throw new Error(`Unable to connect to backend at ${apiBaseUrl}`);
  }
}
```

### 3. Integration Points

#### `src/main.tsx`
Wraps the entire app with `ApiProvider`:
```typescript
<ApiProvider>
  <App />
</ApiProvider>
```

#### `src/App.tsx`
- Uses `useApi()` hook to access context
- Shows current API URL in header
- Provides Settings button for manual access
- Reloads data when API URL changes

## User Flows

### Flow 1: First-Time Setup
1. User opens app
2. Default URL is `http://localhost:3002`
3. If backend isn't running, settings modal appears automatically
4. User clicks a preset or enters custom URL
5. Clicks "Save & Reconnect"
6. App reloads data from new backend

### Flow 2: Switching Backends
1. User clicks Settings button in top-right
2. Selects different backend preset
3. Clicks "Save & Reconnect"
4. App immediately connects to new backend

### Flow 3: Connection Error
1. User performs an action (e.g., "Generate Customer")
2. API request fails due to network error
3. Settings modal automatically pops up with error message
4. User fixes the URL
5. Clicks "Save & Reconnect"
6. Operation retries automatically

## Configuration Priority

### API URL Priority
The API URL is determined by this priority order:

1. **localStorage** (set via Settings UI) ⭐ Highest priority
2. **Environment variable** (`VITE_API_URL` in `.env`)
3. **Default** (`http://localhost:3002`)

This means the Settings UI always takes precedence, allowing users to override any configuration.

### Backend Port Configuration
The Settings modal presets read ports from environment variables:

- `VITE_TYPEORM_PORT` - TypeORM backend port (default: 3000)
- `VITE_SQLMODEL_PORT` - SQLModel backend port (default: 3002)
- `VITE_DRIZZLE_PORT` - Drizzle backend port (default: 3003)
- `VITE_PRISMA_PORT` - Prisma backend port (default: 3004)
- `VITE_SEQUELIZE_PORT` - Sequelize backend port (default: 3005)

**Example `.env` configuration:**
```bash
# Custom port for TypeORM
VITE_TYPEORM_PORT=8080

# The Settings modal will now show "TypeORM - Port 8080"
```

This allows you to configure backend ports without modifying code, making the presets always show the correct ports for your environment.

## Persistence

Settings are stored in browser's `localStorage` with key `test_client_api_url`.

**Benefits:**
- Survives page refreshes
- Per-browser/per-user configuration
- No server restart needed
- Independent of environment variables

**To clear:**
```javascript
localStorage.removeItem('test_client_api_url')
```

## Technical Implementation Details

### Custom Event System

The API client and React components communicate via custom events:

**api.ts** (vanilla JS):
```typescript
window.dispatchEvent(
  new CustomEvent('show-api-settings', {
    detail: { connectionError: true }
  })
);
```

**ApiContext.tsx** (React):
```typescript
useEffect(() => {
  const handleShowSettings = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    showSettingsModal(detail.connectionError);
  };

  window.addEventListener('show-api-settings', handleShowSettings);
  return () => window.removeEventListener('show-api-settings', handleShowSettings);
}, []);
```

This allows the non-React API module to trigger React UI updates.

### Auto-Reconnection

When the user saves a new API URL, the App component automatically reloads data:

```typescript
useEffect(() => {
  loadData();
}, [apiUrl]); // Triggers when apiUrl changes
```

This provides instant feedback on whether the new URL works.

## UI Components

### Settings Button
Located in the top-right corner of the header:
- Gear icon with "Settings" label
- Opens modal on click
- Always accessible

### Settings Modal
- **Title**: Shows "Connection Error" if triggered by error, otherwise "API Settings"
- **Current Status**: Displays current API URL
- **Quick Presets**: 5 cards for common backends (2-column grid)
- **Custom Input**: Text field for manual URL entry
- **Help Section**: Troubleshooting tips in blue box
- **Actions**: Cancel and "Save & Reconnect" buttons

### Current URL Display
Small text under the page title showing:
```
Connected to: http://localhost:3000
```

## Error Handling

### Connection Errors Trigger Modal
Any `fetch()` error that includes "fetch" in the message is treated as a connection error:
- Network unreachable
- Server not running
- Port incorrect
- DNS failure

### User-Friendly Messages
Modal shows context-specific help:
- "Unable to connect to the backend API"
- "Please check the URL and ensure the backend server is running"
- Troubleshooting checklist

## Files Created/Modified

### New Files
1. `src/components/SettingsModal.tsx` - Settings dialog component
2. `src/contexts/ApiContext.tsx` - API URL state management
3. `TEST_CLIENT_SETTINGS_UI.md` - This documentation

### Modified Files
1. `src/lib/api.ts` - Added localStorage support and error detection
2. `src/App.tsx` - Added Settings button and useApi hook
3. `src/main.tsx` - Wrapped app with ApiProvider
4. `README.md` - Updated configuration docs

### Dependencies Added
- Added shadcn/ui Dialog component via CLI

## Testing Checklist

- [x] Settings modal opens when clicking Settings button
- [x] Settings modal auto-opens on connection error
- [x] Preset backends can be selected
- [x] Custom URL can be entered
- [x] Settings persist after page refresh
- [x] Data reloads when URL changes
- [x] Error messages are clear and helpful
- [x] Current URL displays in header
- [x] Modal closes after saving
- [x] Cancel button works

## Future Enhancements

Possible improvements:
1. **Health Check on Save**: Ping `/health` endpoint before closing modal
2. **Recent URLs**: Show history of previously used URLs
3. **Auto-Detect Available Backends**: Scan common ports for running servers
4. **Connection Status Indicator**: Real-time green/red dot in header
5. **Retry Logic**: Automatic reconnection attempts with exponential backoff
6. **Import/Export Settings**: Share configuration between browsers
7. **Backend Metadata**: Show backend name, version, and capabilities
8. **Quick Switch**: Dropdown in header for one-click backend switching

## Usage Examples

### Example 1: Testing TypeORM Backend
```bash
# Terminal 1: Start TypeORM backend
cd apps/typeorm-example
pnpm dev

# Terminal 2: Start test client
cd apps/test-client
pnpm dev

# Browser:
# 1. Click Settings
# 2. Click "TypeORM" card (Port 3000)
# 3. Click "Save & Reconnect"
# 4. Generate test data
```

### Example 2: Troubleshooting Connection
```bash
# Backend isn't running
# Browser shows automatic error modal
# Follow troubleshooting steps in modal
# Start backend, then click "Save & Reconnect"
```

### Example 3: Custom Backend
```bash
# Using a backend on a different machine
# Browser:
# 1. Click Settings
# 2. Enter: http://192.168.1.100:8080
# 3. Click "Save & Reconnect"
```

## Backwards Compatibility

The implementation is fully backwards compatible:

- **Existing .env files** still work
- **Environment variables** are respected as fallback
- **No breaking changes** to API
- **localStorage** is optional enhancement

Users who don't use the UI will experience no change in behavior.

## Browser Support

Uses standard Web APIs:
- `localStorage` (supported in all modern browsers)
- `CustomEvent` (supported in all modern browsers)
- React Context (React 16.3+)

No special polyfills required.

## Security Considerations

- **No sensitive data stored**: Only the API URL is persisted
- **localStorage is domain-scoped**: Can't be accessed by other sites
- **No CORS bypass**: Still subject to browser CORS policies
- **User-controlled**: Users explicitly choose what URLs to use

## Summary

The Settings UI transforms the test client from requiring code/config changes to a fully self-service tool. Users can:
- Switch backends instantly
- Troubleshoot connection issues interactively
- Configure custom backends without technical knowledge
- Get automatic help when things go wrong

This significantly improves the developer experience for testing the OLTP-to-OLAP pipeline across different ORM implementations.
