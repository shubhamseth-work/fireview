# FireView — Explore. Query. Manage.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Build Status](https://github.com/shubhamseth-work/fireview/workflows/CI/badge.svg)](https://github.com/shubhamseth-work/fireview/actions)
[![Security](https://github.com/shubhamseth-work/fireview/workflows/Security/badge.svg)](https://github.com/shubhamseth-work/fireview/actions)

> **FireView** is an open-source, privacy-first developer workspace for exploring, querying, editing, comparing, exporting, importing, and managing Firebase Firestore data directly inside VS Code-compatible IDEs.

## Features

- **Project Connections** — Connect multiple Firebase/Google Cloud projects with Service Account authentication
- **Firestore Explorer** — Browse collections and documents with virtualized tree view
- **Document Viewer** — Table view, JSON/Tree view, Raw JSON with syntax highlighting
- **Document CRUD** — Create, read, update, delete with production safety confirmations
- **Query Builder** — Visual query builder with WHERE, ORDER BY, LIMIT, pagination
- **Export/Import** — Stream JSON/CSV exports, import with preview and conflict handling
- **Firebase Emulator** — Local development with automatic `firebase.json` detection
- **Production Safety** — Red indicator, typed confirmations, double-confirm for bulk operations
- **Project-to-Project Copy** — 8-step migration workflow (staging → production)
- **Audit History** — Local activity log (no cloud backend)
- **Keyboard Shortcuts** — Platform-aware shortcuts for all major actions
- **Command Palette** — Full integration with VS Code Command Palette

## Installation

### VS Code Marketplace
*(Coming soon)*

### Manual Installation (Development)
```bash
# Clone the repository
git clone https://github.com/shubhamseth-work/fireview.git
cd fireview

# Install dependencies
npm install

# Build all packages
npm run build

# Package the extension
npm run package
```

## Quick Start

1. **Open FireView** — Click the FireView icon in the Activity Bar
2. **Add Connection** — Click "Connect Project" and provide Service Account JSON
3. **Select Project** — Choose your project from the sidebar
4. **Explore** — Expand Firestore → collections → documents
5. **Query** — Open Query Builder, build queries visually
6. **Export/Import** — Right-click collection for export/import options

## Authentication

### Service Account (Recommended)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to IAM & Admin → Service Accounts
3. Create or select a service account with Firestore permissions
4. Generate and download JSON key
5. In FireView: Connect Project → Service Account → Paste JSON

> **Security**: Credentials are stored in VS Code SecretStorage (OS keychain). Never exposed to Webview or logs.

### Firebase Emulator
1. Run `firebase emulators:start` in your project
2. FireView auto-detects `firebase.json` and emulator ports
3. Connect via "Firebase Emulator" in connection manager

## Development

### Prerequisites
- Node.js >= 18.0.0
- npm >= 10.0.0

### Setup
```bash
# Install dependencies
npm install

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Run tests
npm run test

# Start webview dev server (for UI development)
npm run dev

# Build extension
npm run build:extension
```

### Project Structure
```
fireview/
├── packages/           # Core business logic (VS Code agnostic)
│   ├── core/           # Interfaces & types
│   ├── shared/         # Logger, constants, config
│   ├── credentials/    # SecretStorage wrapper
│   ├── auth/           # Authentication providers
│   ├── firestore/      # Firestore service (Admin SDK)
│   ├── query-engine/   # Query AST & validation
│   ├── query-builder/  # Visual query builder state
│   ├── export/         # Export services
│   ├── import/         # Import services
│   ├── batch/          # Batch operations
│   ├── diff/           # Document diff
│   ├── project-compare/# Project comparison
│   ├── migration/      # 8-step migration workflow
│   ├── emulator/       # Emulator detection
│   └── audit/          # Local audit history
├── apps/
│   ├── vscode-extension/  # Extension host (VS Code APIs)
│   └── webview/           # React UI (Vite + TypeScript)
└── tests/
    ├── unit/
    ├── integration/
    └── security/
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Extension Host                          │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────────┐  │
│  │ Core Services│ │Firebase Admin│ │   SecretStorage     │  │
│  └──────┬──────┘ └──────┬───────┘ └──────────┬──────────┘  │
│         │             │                      │             │
│         └─────────────┼──────────────────────┘             │
│                       ▼                                    │
│              ┌────────────────┐                            │
│              │ Webview Messaging│                           │
│              └───────┬────────┘                            │
└──────────────────────┼────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │   React UI     │
              │  (Webview)     │
              └────────────────┘
```

**Core Principle**: Business logic lives in packages. React UI never calls Firebase directly — all communication goes through validated message passing.

## Security

- **No telemetry** — No analytics, tracking, or data collection
- **Local-first** — Data flows directly between your environment and Firebase
- **SecretStorage** — Credentials stored in OS keychain via VS Code
- **CSP** — Strict Content Security Policy with nonces
- **Message validation** — All Webview messages validated via schemas
- **No secrets in logs** — Automatic redaction of sensitive data

See [SECURITY.md](SECURITY.md) for details.

## Privacy

FireView operates as a **local-first application**. No FireView backend exists. Firestore data goes directly between your environment and Google/Firebase services.

```
User → FireView Extension → Google/Firebase APIs
```

NOT:
```
User → FireView Server → Google/Firebase
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines, code style, and pull request process.

## License

Apache-2.0 — See [LICENSE](LICENSE) for details.

---

**Disclaimer**: FireView is an independent open-source project and is **not affiliated with Google, Firebase, Microsoft, or VS Code**.