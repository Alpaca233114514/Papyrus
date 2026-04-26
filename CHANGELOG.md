# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [v2.0.0-beta.3] - 2026-04-26

This release migrates the backend from Python/FastAPI to TypeScript/Fastify, hardens the cross-platform release pipeline, and ships note/card history. **The Python backend has been fully removed** — distributions no longer require a bundled CPython runtime.

### 🚀 Architecture
- **Backend rewritten in TypeScript** on Node.js + Fastify (was Python + FastAPI / Uvicorn). Single Node runtime now powers Electron, frontend tooling, and the API.
- **AI subsystem rewritten in TypeScript**: provider abstraction, streaming, tools, and config validation all in TS.
- **MCP subsystem rewritten in TypeScript**: REST endpoints for note/vault CRUD, search, and indexing.
- **File watcher** (`chokidar`) wired into the server for live database/vault change detection.

### 🎉 New Features
- **Note & card version history** with rollback: every update auto-saves a content-hashed version; rollback creates a forward version (no destructive history).
- **Tool-call approval flow**: AI tool invocations support manual / auto-approve modes with a pending queue and call history.
- **Provider/model management API**: add, update, delete, enable, set-default for AI providers, models, and API keys.
- **Encrypted API key storage** at rest (AES-GCM with a per-install master key, salt, and auth tag).

### 🐛 Bug Fixes
- **Obsidian vault import works on all platforms in CI**: replaced fragile string-prefix `home`-check with an OS-level `dev`+`ino` walk, fixing failures caused by Windows 8.3 short paths (`RUNNER~1`), macOS `/var` ↔ `/private/var` aliasing, and Linux `/tmp` not being under `$HOME`.
- **Server direct-run detection** correctly identifies the packaged main entry on all platforms.
- **API test isolation**: integration tests no longer share state across files; flaky timeouts removed.
- **Console noise** removed from logger and AI provider tests.
- Multiple P0/P1/P2 backend bugs surfaced by the TS migration audit.

### 🔒 Security
- **Audit-driven hardening**: Critical/High advisories from the security review have been resolved. `npm audit --omit=dev --audit-level=high` is now enforced in CI for both `frontend/` and `backend/`.
- **SSRF protection** for AI base URL validation; private/loopback addresses now rejected for cloud providers (still allowed for `ollama` / local).
- **Explicit error reporting**: errors no longer silently swallowed — context is included in messages so failures are diagnosable.
- **Path traversal hardened** for note attachments and Obsidian import (`dev`+`ino` containment instead of string compare).
- **Auth token** required for mutating MCP/API requests; tokens generated and persisted on first run.
- **Rate limiting** added to the public API surface.

### 🔧 Build & Release Pipeline
- **Three-platform GitHub Actions matrix** (Windows x64, macOS arm64, Linux x64) producing NSIS installer + portable, DMG + ZIP, AppImage + deb + tar.gz.
- **Auto-trigger on tag push** (`v*`): builds run, draft GitHub Release is created with categorized release notes generated from commit history.
- **Production dependency audit gate** before build.
- **Backend / frontend build verification steps** fail fast if outputs are missing.
- **Test artifact upload on failure** — CI now attaches `backend/test-output.log` to failed runs for offline debugging.
- **Apple Developer signing slots** present (commented) — uncomment env vars when an Apple ID is available.

### ⚠️ Breaking Changes
- **Python backend removed**: `src/Papyrus.py`, `src/ai/*.py`, `src/mcp/*.py`, `tests/test_*.py`, `tools/diagnose.py`, `requirements.txt`, `run.pyw` are deleted. Anyone running from source must now use Node.js 24+ instead of Python.
- **Data directory layout** now lives under the new `paths.dataDir` (defaults to `$HOME/PapyrusData` or `PAPYRUS_DATA_DIR`); the JSON-file migration path imports legacy `cards.json` / `notes.json` on first run.
- **MCP / API auth** is mandatory for write operations; existing clients must include the auth token from `~/.papyrus/auth.token`.

---

## [v2.0.0-beta.1] - 2026-03-29

### 🎉 New Features
- **Complete UI Rewrite**: Brand new interface with React 19 + TypeScript + Arco Design
  - New Start Page with recent notes, review queue, and solar term themes
  - New Scroll Page for flashcard study
  - New Notes Page with folder management and relation graph
  - Chat Panel for AI conversations
  - Settings Page with accessibility options

- **Accessibility Improvements**: WCAG 2.1 AAA compliance
  - Global accessibility styles (`frontend/src/a11y.css`)
  - Accessibility settings panel (reduce motion, high contrast, screen reader optimization)
  - Complete ARIA attributes support
  - Keyboard navigation optimization
  - Skip Link navigation
  - Accessibility icons

- **MCP (Model Context Protocol) Support**
  - REST API for note CRUD operations
  - Vault indexing and reading endpoints
  - Search functionality
  - Extension-friendly architecture

### 🚀 Architecture
- **Frontend**: React 19 + TypeScript + Arco Design + Tailwind CSS
- **Backend**: Python 3.14 + FastAPI + Uvicorn
- **Desktop**: Electron 30 + Electron Builder
- **AI Integration**: OpenAI, Anthropic, Ollama support

### 🔧 Build & Distribution
- Single-file PyInstaller builds
- Cross-platform support (Windows, macOS, Linux)
- Automated GitHub Actions workflows
- Smaller app size with dependency optimization

---

## [v1.2.2] - 2026-03-13

### 🐛 Bug Fixes
- Fixed API Key encoding error with non-ASCII characters
- Added configuration validation mechanism
- Three-layer protection:
  - Config validation: `AIConfig.validate_config()`
  - UI layer: Settings window catches `ValueError`
  - Request fallback: `AIProvider` handles `UnicodeEncodeError`

### 💡 Improvements
- Better error messages indicating which provider/field has issues
- Prevent saving invalid configurations

---

## [v1.2.1] - 2026-03-11

### 🎉 New Features
#### SM-2 Algorithm
- Replaced simple algorithm with proven SM-2 spaced repetition
- Dynamic interval adjustment based on answer quality
- Per-card Easiness Factor
- Full backward compatibility

#### AI Assistant
- Modern conversation interface
- Pure chat mode: Natural language interaction
- Agent mode: Tool-based interactions

---

## [v1.2.0] - 2026-03-08

### 🎉 New Features
- Obsidian Vault import support
- File tree navigation
- Note relations and graph view
- Tag system

### 🐛 Bug Fixes
- Database migration improvements
- Better error handling for corrupted data

---

## [v1.1.0] - 2026-02-20

### 🎉 New Features
- Initial AI integration
- Chat interface
- Card generation from notes

### 🔧 Technical
- Python 3.14 migration
- FastAPI backend

---

## [v1.0.0] - 2026-01-15

### 🎉 Initial Release
- Basic flashcard functionality
- Simple spaced repetition
- Local data storage
- Electron desktop app

---

## Release Checklist

When creating a new release:

1. Update the `[Unreleased]` section with all changes
2. Move changes to a new version section
3. Update the version links at the bottom
4. Commit: `git add CHANGELOG.md && git commit -m "chore: update changelog for vX.X.X"`
5. Tag: `git tag vX.X.X`
6. Push: `git push && git push --tags`

---

[Unreleased]: https://github.com/PapyrusOR/Papyrus_Desktop/compare/v2.0.0-beta.3...HEAD
[v2.0.0-beta.3]: https://github.com/PapyrusOR/Papyrus_Desktop/compare/v2.0.0-beta.1...v2.0.0-beta.3
[v2.0.0-beta.1]: https://github.com/PapyrusOR/Papyrus_Desktop/compare/v1.2.2...v2.0.0-beta.1
[v1.2.2]: https://github.com/PapyrusOR/Papyrus_Desktop/compare/v1.2.1...v1.2.2
[v1.2.1]: https://github.com/PapyrusOR/Papyrus_Desktop/compare/v1.2.0...v1.2.1
[v1.2.0]: https://github.com/PapyrusOR/Papyrus_Desktop/compare/v1.1.0...v1.2.0
[v1.1.0]: https://github.com/PapyrusOR/Papyrus_Desktop/compare/v1.0.0...v1.1.0
[v1.0.0]: https://github.com/PapyrusOR/Papyrus_Desktop/releases/tag/v1.0.0
