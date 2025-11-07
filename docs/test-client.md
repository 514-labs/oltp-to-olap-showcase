# Test Client Documentation

The interactive React test client lives in `apps/test-client`. Use it to exercise any backend and watch CDC events propagate through the CDC pipeline.

## Key Resources

- [Test Client README](../apps/test-client/README.md) — End-to-end usage guide
- [Port Configuration Notes](../apps/test-client/docs/port-configuration.md) — Point the UI at different backends
- [Settings UI Walkthrough](../apps/test-client/docs/settings-ui.md) — Dynamic backend switching details
- [Environment Variable Reference](../apps/test-client/docs/environment-variables.md) — Vite variables that drive the presets

## Quick Start

```bash
cd apps/test-client
pnpm install
pnpm dev
# Visit http://localhost:3001
```

When the app boots it defaults to the SQLModel backend (`http://localhost:3002`). Use the in-app **Settings** button to switch to TypeORM or any custom endpoint.

> Make sure at least one backend API is running before launching the client. The modal will prompt you automatically if no server is available.
