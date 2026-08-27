# Vistiq VS Code Extension - Publish Instructions

Complete step-by-step guide to build, package, and publish the Vistiq VS Code Extension to the Visual Studio Code Marketplace.

---

## Prerequisites

### One-time Setup

```bash
# Install vsce globally (if not already installed)
npm install -g @vscode/vsce

# Or use npx (recommended, uses local version)
# npx vsce <command>

# Login to publisher account (run once)
vsce login vistiq
# Enter Personal Access Token when prompted
```

### Create Personal Access Token (PAT)

1. Go to [Azure DevOps](https://dev.azure.com/) → User Settings → Personal Access Tokens
2. Click **New Token**
3. Configure:
   - **Name**: `vistiq-vscode-marketplace`
   - **Organization**: `All accessible organizations`
   - **Expiration**: Set appropriate date
   - **Scopes**: `Marketplace` → `Manage` (check this box)
4. Copy the token immediately (shown only once)
5. Use with `vsce login vistiq` or `vsce publish -p <token>`

---

## Directory Structure

```
vistiq-viewer/
├── apps/vscode-extension/          # Extension source
│   ├── package.json                # Extension manifest
│   ├── src/                        # TypeScript source
│   ├── esbuild.config.mjs          # Build config
│   └── resources/icon.png          # Extension icon
├── packages/                       # Internal packages (@vistiq/*)
└── package.json                    # Root workspace config
```

---

## Step-by-Step Commands

### 1. Install Dependencies (First time or after pull)

```bash
# From root directory
cd /Users/username/Projects/node-apps/vistiq-viewer
npm install
```

### 2. Build All Packages + Extension

```bash
# Build everything (internal packages + extension + webview)
npm run build
```

**What this does:**
- Builds all `@vistiq/*` packages in `packages/` via `tsc`
- Builds webview (`vistiq-webview`) via `tsc && vite build`
- Bundles extension via `esbuild` → `apps/vscode-extension/dist/extension.js`

### 3. Run Quality Checks (Optional but Recommended)

```bash
# From root or extension directory
cd apps/vscode-extension

# Type checking
npm run typecheck

# Linting
npm run lint

# Format check
npm run format:check

# Run tests
npm run test
```

### 4. Clean Build (If Needed)

```bash
# From extension directory
cd apps/vscode-extension
npm run clean
npm run build
```

### 5. Package Extension (.vsix)

```bash
# From extension directory
cd apps/vscode-extension
npm run package
# OR
npx vsce package
```

**Output:** `vistiq-viewer-<version>.vsix` (e.g., `vistiq-viewer-0.1.0.vsix`)

**Verify package contents:**
```bash
npx vsce ls
# Lists files that will be included in package
```

### 6. Test Extension Locally (Before Publish)

```bash
# Install in VS Code for testing
code --install-extension vistiq-viewer-0.1.0.vsix

# Or drag .vsix into VS Code Extensions view → "Install from VSIX"
```

### 7. Publish to Marketplace

#### Option A: Direct Publish (Recommended)

```bash
# From extension directory
cd apps/vscode-extension

# Patch version (0.1.0 → 0.1.1)
npx vsce publish patch

# Minor version (0.1.0 → 0.2.0)
npx vsce publish minor

# Major version (0.1.0 → 1.0.0)
npx vsce publish major

# Specific version
npx vsce publish 1.2.3
```

#### Option B: Publish Pre-packaged .vsix

```bash
# From extension directory
cd apps/vscode-extension
npx vsce publish vistiq-viewer-0.1.0.vsix
```

#### Option C: With PAT (CI/CD)

```bash
npx vsce publish -p <your-personal-access-token>
# Or
npx vsce publish patch -p <your-personal-access-token>
```

---

## Version Management

### Update Version in package.json

```bash
# From extension directory
cd apps/vscode-extension

# Update version manually in package.json, then:
npm run build
npm run package
npx vsce publish
```

### Or Use vsce Version Bump

```bash
# Automatically updates package.json version
npx vsce publish patch   # 0.1.0 → 0.1.1
npx vsce publish minor   # 0.1.0 → 0.2.0
npx vsce publish major   # 0.1.0 → 1.0.0
```

---

## Complete Workflow Summary

### Quick Publish (After Initial Setup)

```bash
# 1. Navigate to project
cd /Users/usersname/Projects/node-apps/vistiq-viewer

# 2. Pull latest changes
git pull

# 3. Install any new deps
npm install

# 4. Build everything
npm run build

# 5. Run quality checks
cd apps/vscode-extension
npm run typecheck && npm run lint && npm run test

# 6. Package
npm run package

# 7. Test locally (optional)
code --install-extension vistiq-viewer-0.1.0.vsix

# 8. Publish
npx vsce publish patch
```

### CI/CD Pipeline Commands

```yaml
# Example GitHub Actions steps
- name: Install dependencies
  run: npm ci

- name: Build
  run: npm run build

- name: Test
  run: cd apps/vscode-extension && npm run test

- name: Package
  run: cd apps/vscode-extension && npx vsce package

- name: Publish
  run: cd apps/vscode-extension && npx vsce publish -p ${{ secrets.VSCE_PAT }}
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `vsce: command not found` | `npm install -g @vscode/vsce` or use `npx vsce` |
| `EACCES: permission denied` | Run with `sudo` or fix npm permissions |
| `Missing LICENSE.md` | Add LICENSE file or ignore warning |
| `Publisher not found` | Run `vsce login vistiq` first |
| `Version already exists` | Bump version: `vsce publish patch` |
| `Token expired` | Create new PAT in Azure DevOps |

### Verify Published Extension

```bash
# Check published version
npx vsce show vistiq.vistiq-viewer

# Or visit marketplace:
# https://marketplace.visualstudio.com/items?itemName=vistiq.vistiq-viewer
```

---

## Useful VS Code Commands

```bash
# Open extension development host
code --extensionDevelopmentPath=apps/vscode-extension

# Uninstall extension
code --uninstall-extension vistiq.vistiq-viewer

# List installed extensions
code --list-extensions
```

---

## File Checklist Before Publish

- [ ] `package.json` version updated
- [ ] `CHANGELOG.md` updated
- [ ] `README.md` current
- [ ] `LICENSE` file present
- [ ] Icon at `resources/icon.png` (128x128)
- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] Extension tested locally

---

## Quick Reference Card

| Command | Description |
|---------|-------------|
| `npm run build` | Build all packages + extension |
| `npm run package` | Create .vsix file |
| `npx vsce publish patch` | Publish patch version bump |
| `npx vsce publish minor` | Publish minor version bump |
| `npx vsce publish major` | Publish major version bump |
| `npx vsce login vistiq` | Login to publisher |
| `npx vsce show vistiq.vistiq-viewer` | Show published extension info |
| `code --install-extension *.vsix` | Install local .vsix for testing |

---

*Last updated: 2026-08-27*
*Project: vistiq-viewer*
*Publisher: vistiq*