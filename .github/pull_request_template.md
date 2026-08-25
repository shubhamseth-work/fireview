---
name: Pull Request Template
about: Template for Vistiq pull requests
title: ''
labels: ''
assignees: ''
---

## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Refactor
- [ ] Performance improvement
- [ ] Security fix
- [ ] Test addition
- [ ] Chore (build, deps, etc.)

## Related Issues
Closes #(issue number)

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Security tests added/updated
- [ ] Manual testing performed

### Test Commands Run
```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Security Considerations
- [ ] No credentials/secrets exposed
- [ ] Webview messages validated
- [ ] CSP nonces used (if Webview changes)
- [ ] SecretStorage used for credentials
- [ ] Logs redact sensitive data

## Screenshots (if UI changes)
| Before | After |
|--------|-------|
| ![before](url) | ![after](url) |

## Checklist
- [ ] Code follows project style (ESLint + Prettier)
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] All tests pass (`npm run test`)
- [ ] Documentation updated (README, CHANGELOG, code comments)
- [ ] No console.log statements left in production code
- [ ] No `any` types without justification
- [ ] Commit messages follow Conventional Commits

## Breaking Changes
If this is a breaking change, describe:
1. What breaks
2. Migration path for users
3. Version bump needed (major)

## Additional Notes
Any other information reviewers should know.