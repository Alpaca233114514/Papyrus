# Release Notes

**Version**: v2.0.0-beta.4
**Date**: 2026-04-28

## Highlights

- **File Management**: Browse, upload, and organize files directly within Papyrus with a new dedicated Files page
- **Batch Operations**: Select and delete multiple cards or notes at once
- **Data Reset**: Clear all app data with a single click from Settings

## What's New

### File Management System
- New **Files page** with a real folder tree and file list, replacing the previous static mock data
- Create folders, upload files, and download files through the UI
- Full backend support: dedicated database table, core CRUD logic, and REST API endpoints at `/api/files`

### Batch Operations
- **Batch delete cards**: Select multiple cards in the Scroll page and delete them in one action
- **Batch delete notes**: Multi-select notes with checkbox UI in the Notes page, then delete all selected

### Data Reset
- New "Reset Data" button in Settings → Data, with a confirmation popup
- Clears all cards, notes, and associated data from the local database

## Improvements

### Backend
- **Graceful shutdown**: Server now handles SIGTERM/SIGINT to cleanly stop MCP server, file watcher, HTTP server, and database connection
- **Database robustness**: Added `PRAGMA busy_timeout = 5000` to prevent SQLITE_BUSY errors under concurrent access
- **Obsidian import**: Enhanced with folder exclusion support and title-based deduplication

### Electron
- **Reliable process termination**: Backend process kill now uses `taskkill /T /F` on Windows with retry logic; Unix uses SIGTERM with 3-second SIGKILL fallback
- **Quit app API**: Frontend can now programmatically trigger app quit via `electronAPI.quitApp()`

### Build & CI
- **Optimized packaging**: `asarUnpack` narrowed from `backend/**/*` to specific paths, reducing package size
- **Dependency verification**: CI now verifies backend production dependencies (e.g., fastify) exist after pruning
- **Platform-specific artifact checks**: Each build verifies its unpacked app contains required dependencies

### Frontend
- **Auth resilience**: API client caches auth tokens and retries on 401 responses
- **Persistent minimize-to-tray**: Setting is now saved to `localStorage` across sessions
- **Start page shortcuts**: Quick links to Notes, Files, Charts, and Settings
- **Avatar fallback**: User avatar defaults to initials or "?" when no name is set

## Bug Fixes
- Card list now refreshes automatically when cards are imported from the Title Bar
- Provider form reset now happens after successful API save, preventing data loss
- Error messages throughout Settings show backend error details instead of generic messages
- API key IDs now use `Date.now()` instead of hardcoded `'1'`

## Testing
- New unit tests for the file management core module (`backend/tests/unit/files.test.ts`)
- Production dependency audit integrated into CI pipeline

## Contributors

- ALPACA LI
