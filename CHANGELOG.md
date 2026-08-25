# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project structure and monorepo setup
- Core types and interfaces (FirestoreConnection, FirestoreDocument, FirestoreValue)
- Shared utilities (logger with secret redaction, config validation)
- Credential service using VS Code SecretStorage
- Service Account authentication provider
- Firestore service with Firebase Admin SDK
- VS Code extension shell (Activity Bar, Sidebar, WebviewPanel manager)
- React Webview UI (Vite + TypeScript)
- Collection explorer with virtualized tree
- Document viewer (Table, JSON/Tree, Raw JSON views)
- Document CRUD operations with production safety
- Basic query builder (WHERE, ORDER BY, LIMIT)
- JSON/CSV export with streaming
- JSON import with preview and conflict handling
- Firebase Emulator detection and connection
- Production safety mode (red indicator, typed confirmations)
- Project-to-project copy with 8-step migration workflow
- Document diff and project comparison
- Batch operations with progress/retry
- Local audit history
- Keyboard shortcuts and Command Palette integration
- Security hardening (CSP, message validation, secret audit)

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

---

## Release Template

### [X.Y.Z] - YYYY-MM-DD

#### Added
- Feature descriptions

#### Changed
- Changes to existing functionality

#### Deprecated
- Soon-to-be removed features

#### Removed
- Removed features

#### Fixed
- Bug fixes

#### Security
- Vulnerability fixes