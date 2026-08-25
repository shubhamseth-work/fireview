# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x.x   | ✅ Current development |
| Future 1.x.x | ✅ Will be supported |

## Reporting a Vulnerability

**Do not open public issues for security vulnerabilities.**

Report security issues privately via:
- Email: security@vistiq.dev (or GitHub Security Advisories)
- GitHub: [Report a vulnerability](https://github.com/vistiq/vistiq-viewer/security/advisories/new)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We aim to respond within 48 hours and provide a fix timeline.

## Security Architecture

### Threat Model
Vistiq defends against:
- Malicious extensions/compromised workspace
- Compromised Webview (XSS, prototype pollution)
- Credential theft / token leakage
- Accidental production data deletion
- Supply chain attacks / dependency vulnerabilities
- Arbitrary code execution via project configs

### Credential Handling
- **Storage**: VS Code SecretStorage (OS keychain: Keychain/Windows Credential Manager/libsecret)
- **Never stored in**: Source code, `.env`, Webview localStorage, React state, logs, telemetry
- **Scope**: OAuth tokens, Service Account JSON, emulator configs
- **Rotation**: Disconnect/Remove Credentials commands clear secrets

### Webview Security
- **CSP**: Strict policy with `script-src 'nonce-<random>'`, `object-src 'none'`, `frame-ancestors 'none'`
- **Nonces**: Unique per Webview load
- **Permissions**: Minimal — no file access, no clipboard without gesture
- **Message Validation**: All messages validated via Zod schemas before processing

### Network Security
- **Direct connections only**: Extension Host → Firebase/Google APIs
- **No Vistiq backend**: No proxy, no middleware, no data collection
- **TLS enforced**: All Firebase Admin SDK traffic over HTTPS

### Logging & Audit
- **Redaction**: Automatic secret redaction (private keys, tokens, passwords)
- **Levels**: Info, Warning, Error, Debug (opt-in)
- **Local audit**: Timestamp, operation, project, path, result — NO sensitive data

### Dependency Security
- `npm audit` in CI on every PR
- Dependabot alerts enabled
- Pinned dependencies in `package-lock.json`
- Regular `npm update` with security review

## Secure Development Practices

### For Contributors
1. Never commit secrets — use `.env.local` (gitignored) for local dev
2. Run `npm audit` before PR
3. Validate all Webview messages
4. Use SecretStorage API for credentials
5. Add security tests for new features

### For Reviewers
- Check for credential exposure in logs/state
- Verify CSP nonces on new Webview features
- Confirm message validation schemas
- Audit dependency additions

## Security Testing

Run locally:
```bash
# Dependency audit
npm audit

# Security test suite
npm run test:security

# CSP validation (manual)
# Open DevTools in Webview → Console → check CSP violations
```

## Disclosure Timeline

1. **Day 0**: Vulnerability reported
2. **Day 1-2**: Acknowledgment + initial assessment
3. **Day 3-7**: Fix development + testing
4. **Day 7-14**: Patch release + advisory publication
5. **Ongoing**: Monitor for exploitation

## Contact

Security team: security@vistiq.dev

For non-security issues, use [GitHub Issues](https://github.com/vistiq/vistiq-viewer/issues).