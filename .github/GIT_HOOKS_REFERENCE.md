# Git Hooks Quick Reference

Quick guide for working with Git hooks in the Stellar-Veriphy project.

## What Are Git Hooks?

Git hooks are scripts that run automatically at specific points in the Git workflow. This project uses [Husky](https://typicode.github.io/husky/) to manage hooks.

## Active Hooks

### pre-commit

**Runs**: Before every commit  
**Purpose**: Lint and format staged files  
**Command**: `npx lint-staged`

**What gets checked**:
- `frontend/**/*.{ts,tsx}` → ESLint with auto-fix
- `contracts/**/*.rs` → Rustfmt formatting

**Example**:
```bash
git add frontend/app/page.tsx
git commit -m "Update homepage"
# → Hook runs ESLint --fix on page.tsx
# → If fixes applied, you'll need to stage and commit again
```

---

### pre-push

**Runs**: Before every push  
**Purpose**: Build frontend to catch errors  
**Command**: `pnpm build:frontend`

**What gets checked**:
- TypeScript compilation
- Next.js build
- All frontend code

**Example**:
```bash
git push origin feature/my-feature
# → Hook runs pnpm build:frontend
# → If build fails, push is blocked
```

---

## Common Workflows

### Normal Commit (hooks run automatically)

```bash
# 1. Stage files
git add .

# 2. Commit (pre-commit hook runs automatically)
git commit -m "feat: add new feature"

# 3. If lint-staged made changes, stage and commit again
git add .
git commit -m "feat: add new feature"

# 4. Push (pre-push hook runs automatically)
git push
```

---

### Skip Hooks (not recommended)

```bash
# Skip pre-commit
git commit --no-verify -m "message"
git commit -n -m "message"

# Skip pre-push
git push --no-verify
git push -n
```

**Warning**: Skipping hooks may cause CI failures!

---

### Disable Hooks Temporarily

```bash
# Disable for one command
HUSKY=0 git commit -m "message"

# Disable for session
export HUSKY=0
git commit -m "message"
git push
unset HUSKY
```

---

## Troubleshooting

### Hook doesn't run

```bash
# Reinstall hooks
pnpm install

# Check hook permissions
ls -la .husky/
# Should see: -rwxr-xr-x for pre-commit and pre-push

# Make executable if needed
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
```

---

### lint-staged fails

```bash
# See what's wrong
cd frontend
pnpm lint

# Fix manually
pnpm lint --fix

# Check staged files
git diff --cached --name-only
```

---

### pre-push build fails

```bash
# Build locally to see errors
pnpm build:frontend

# Fix errors, then try again
git push
```

---

### Files not auto-fixed

If lint-staged fixes files but they're not committed:

```bash
# Check status
git status

# Stage fixed files
git add .

# Commit again
git commit -m "your message"
```

---

## Configuration

### lint-staged (package.json)

```json
{
  "lint-staged": {
    "frontend/**/*.{ts,tsx}": [
      "eslint --fix"
    ],
    "contracts/**/*.rs": [
      "rustfmt --edition 2021"
    ]
  }
}
```

### pre-commit (.husky/pre-commit)

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

### pre-push (.husky/pre-push)

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔨 Building frontend..."
pnpm build:frontend
```

---

## Best Practices

✅ **Do**:
- Let hooks run automatically
- Fix issues locally before pushing
- Stage fixed files after auto-fix
- Test build manually: `pnpm build:frontend`

❌ **Don't**:
- Skip hooks without good reason
- Commit broken code
- Push without testing locally
- Disable hooks permanently

---

## Quick Commands

```bash
# Install/reinstall hooks
pnpm install

# Run lint-staged manually
npx lint-staged

# Run pre-push check manually
pnpm build:frontend

# Check hook status
ls -la .husky/

# Make hooks executable
chmod +x .husky/pre-commit .husky/pre-push

# Skip one commit (emergency only)
git commit --no-verify -m "message"

# Disable hooks temporarily
HUSKY=0 git commit -m "message"
```

---

## Hook Execution Order

```
git commit
    ↓
pre-commit hook
    ↓
lint-staged
    ↓
ESLint --fix (frontend)
rustfmt (contracts)
    ↓
✅ Success → Commit created
❌ Failure → Commit blocked

git push
    ↓
pre-push hook
    ↓
pnpm build:frontend
    ↓
✅ Success → Push proceeds
❌ Failure → Push blocked
```

---

## Related Files

- `.husky/pre-commit` - Pre-commit hook script
- `.husky/pre-push` - Pre-push hook script
- `.husky/README.md` - Detailed documentation
- `package.json` - lint-staged configuration
- `CONTRIBUTING.md` - Development guidelines

---

## Getting Help

1. Read `.husky/README.md` for detailed docs
2. Check `git status` to see what's staged
3. Run hooks manually to debug
4. Ask in team chat if stuck

---

**Remember**: Hooks are your friends! They catch errors early and keep code quality high. 🚀
