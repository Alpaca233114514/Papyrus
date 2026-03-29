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
