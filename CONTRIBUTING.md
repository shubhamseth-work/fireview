# Contributing to FireView

Thank you for your interest in contributing to FireView! This document outlines the process and guidelines for contributing.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 10.0.0
- VS Code or Cursor for testing

### Development Setup
```bash
git clone https://github.com/shubhamseth-work/fireview.git
cd fireview
npm install
npm run build
```

## Development Workflow

### Branch Naming
- `feature/<short-description>` — New features
- `fix/<short-description>` — Bug fixes
- `docs/<short-description>` — Documentation updates
- `refactor/<short-description>` — Code refactoring
- `test/<short-description>` — Test additions/updates

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `security`

Examples:
```
feat(auth): add Service Account authentication provider
fix(firestore): handle timestamp serialization in document viewer
docs(readme): update installation instructions
```

### Pull Request Process
1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes with tests
4. Run `npm run typecheck`, `npm run lint`, `npm run test`
5. Ensure all checks pass
6. Submit PR with clear description
7. Address review comments
8. Squash and merge after approval

## Code Style

### TypeScript
- Strict mode enabled — no `any` without justification
- Use `type` over `interface` for unions/intersections
- Prefer `const` over `let`, avoid `var`
- Use functional patterns where practical
- Explicit return types for public APIs

### Testing
- Unit tests for all business logic (target: ≥80% coverage)
- Integration tests with Firebase Emulator
- Security tests for credential handling, CSP, message validation
- No production Firebase in automated tests

### File Organization
- One primary export per file
- Co-locate tests with source (`*.test.ts`)
- Use barrel exports (`index.ts`) for package public API

## Architecture Guidelines

### Package Boundaries
- **Core packages** (`packages/*`) — Zero VS Code dependencies
- **Extension host** (`apps/vscode-extension`) — VS Code APIs only
- **Webview** (`apps/webview`) — React UI, no Firebase SDKs

### Message Passing
All Webview ↔ Extension Host communication:
```typescript
// Define message schema
interface Message {
  type: 'REQUEST' | 'RESPONSE' | 'EVENT';
  payload: unknown;
  requestId?: string;
}

// Validate every message
function validateMessage(msg: unknown): Message { ... }
```

### Security
- Never expose credentials to Webview
- Use SecretStorage for all secrets
- Redact secrets in logs automatically
- Validate all external input

## Testing Requirements

### Before Submitting PR
```bash
npm run typecheck  # Must pass
npm run lint       # Must pass
npm run test       # Must pass
npm run build      # Must pass
```

### Test Categories
| Category | Command | Purpose |
|----------|---------|---------|
| Unit | `npm run test:unit` | Pure logic, no external deps |
| Integration | `npm run test:integration` | Firebase Emulator |
| Security | `npm run test:security` | CSP, secrets, injection |

## Documentation

- Update README for user-facing changes
- Update ARCHITECTURE.md for structural changes
- Add JSDoc for public APIs
- Keep CHANGELOG.md updated

## Release Process

Maintainers handle releases:
1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag
4. GitHub Actions builds and publishes VSIX

## Questions?

- Open a [Discussion](https://github.com/shubhamseth-work/fireview/discussions)
- Check existing [Issues](https://github.com/shubhamseth-work/fireview/issues)
- Review [Architecture Decision Records](docs/adr/)

---

**Remember**: FireView is security-first, privacy-first, and developer-first. When in doubt, choose the more secure option.