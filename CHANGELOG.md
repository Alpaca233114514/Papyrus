# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- MCP Extension API for third-party integrations
- Markdown rendering API endpoint
- Web clipper browser extension support
- Daily note automation

### Changed
- Improved note editor with Obsidian-style edit/preview dual mode
- Enhanced markdown rendering with markdown-it

### Fixed
- PyInstaller 6.x compatibility issues
- Windows build strip command warnings
- Asset duplication in build

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

[Unreleased]: https://github.com/Alpaca233114514/Papyrus/compare/v2.0.0-beta.1...HEAD
[v2.0.0-beta.1]: https://github.com/Alpaca233114514/Papyrus/compare/v1.2.2...v2.0.0-beta.1
[v1.2.2]: https://github.com/Alpaca233114514/Papyrus/compare/v1.2.1...v1.2.2
[v1.2.1]: https://github.com/Alpaca233114514/Papyrus/compare/v1.2.0...v1.2.1
[v1.2.0]: https://github.com/Alpaca233114514/Papyrus/compare/v1.1.0...v1.2.0
[v1.1.0]: https://github.com/Alpaca233114514/Papyrus/compare/v1.0.0...v1.1.0
[v1.0.0]: https://github.com/Alpaca233114514/Papyrus/releases/tag/v1.0.0
