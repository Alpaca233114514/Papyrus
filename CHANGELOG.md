# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [v2.0.0beta.4] - 2026-04-27

### 🐛 Bug Fixes
- **Chat panel model sync**: the model dropdown now loads live provider/model data from `/api/providers` instead of a hardcoded static list.
- **AIConfig parsing**: `ChatPanel` now correctly unwraps the `{ success, config }` envelope returned by `/api/config/ai`, fixing the permanent "AI 配置不完整" warning.
- **Chat API contract**: fixed the request URL (`/api/ai/chat/stream` → `/api/chat`) and request body to match the TypeScript/Fastify backend expectations.
- **SSE format alignment**: backend `/chat` streaming now emits `{ type, data }` shaped events that the frontend `handleSSEStream` parser expects.
- **Model override support**: backend `chatStream` accepts an optional `overrideModel` parameter so the user-selected model is actually used for the conversation.
- **File attachment fallback**: the frontend no longer attempts multipart uploads (unsupported by the current Fastify backend); file names are appended to the message text as placeholders.

### 🔧 Refactor
- Extracted shared AI types (`AIConfig`, `ProviderModel`) from `ChatPanel.tsx` into `frontend/src/types/ai.ts`.

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

[Unreleased]: https://github.com/PapyrusOR/Papyrus_Desktop/compare/v2.0.0beta.4...HEAD
[v2.0.0beta.4]: https://github.com/PapyrusOR/Papyrus_Desktop/compare/v1.2.2...v2.0.0beta.4
[v1.2.2]: https://github.com/PapyrusOR/Papyrus_Desktop/compare/v1.2.1...v1.2.2
[v1.2.1]: https://github.com/PapyrusOR/Papyrus_Desktop/compare/v1.2.0...v1.2.1
[v1.2.0]: https://github.com/PapyrusOR/Papyrus_Desktop/compare/v1.1.0...v1.2.0
[v1.1.0]: https://github.com/PapyrusOR/Papyrus_Desktop/compare/v1.0.0...v1.1.0
[v1.0.0]: https://github.com/PapyrusOR/Papyrus_Desktop/releases/tag/v1.0.0
