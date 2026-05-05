# @fullsparklabs/hook

Git hooks manager with templates. Block secrets, enforce conventions, run checks before commit.

## Installation

```bash
npm install -g @fullsparklabs/hook
```

## Quick Start

```bash
# List available templates
hook list

# Block API keys and secrets
hook install no-api-keys

# Block .env files
hook install no-env

# Require JIRA tickets
hook install check-jira commit-msg
```

## Built-in Templates

| Template | Hook Type | Description |
|----------|----------|-------------|
| `no-api-keys` | pre-commit | Block API keys, tokens, secrets |
| `no-env` | pre-commit | Block .env files |
| `no-secrets` | pre-commit | Block .pem, .key files |
| `check-jira` | commit-msg | Require PROJ-123 format |
| `check-branch` | pre-commit | Enforce feat/, fix/, etc. |
| `no-package-lock` | pre-commit | Prefer pnpm/yarn |
| `no-large-files` | pre-commit | Block >100KB files |
| `no-node-modules` | pre-commit | Block node_modules |
| `no-debugger` | pre-commit | Block debugger statements |
| `require-emoji` | commit-msg | Require emoji in commit |
| `check-merge-commit` | commit-msg | Block merge commits |

## Usage

### List Templates

```bash
hook list
```

### Install Template

```bash
hook install <template-name> [hook-type]

# Examples:
hook install no-api-keys           # installs to pre-commit
hook install no-api-keys pre-commit
hook install check-jira commit-msg
hook install no-env pre-push
```

### Create Custom Template

```bash
hook create <name> [code]

# Example:
hook create mycheck '#!/bin/bash
echo "Running my check..."
exit 0'
```

### List Installed Hooks

```bash
hook hooks
```

### Remove Hook

```bash
hook remove pre-commit
```

### Validate Template

```bash
hook validate no-api-keys
```

## Hook Types

- `pre-commit` - Runs before commit (check code, files)
- `pre-push` - Runs before push
- `commit-msg` - Runs after commit message
- `pre-rebase` - Runs before rebase
- `post-checkout` - Runs after checkout
- `post-merge` - Runs after merge

## How It Works

Hooks are installed to `.git/hooks/`:

```bash
.git/hooks/
├── pre-commit
├── commit-msg
└── pre-push
```

**Note**: These are local to your repository, not committed to git.

## Sharing Hooks with Team

Option 1: Store in repository

```bash
# Create a hooks directory
mkdir -p .githooks
cp .git/hooks/* .githooks/

# Use custom hooks directory
git config core.hooksPath .githooks
```

Option 2: Use a tool like [lefthook](https://github.com/arkark/lefthook) or [husky](https://github.com typicode/husky)

## Examples

### Block Secrets

```bash
hook install no-api-keys
# On commit:
# ❌ Commit blocked: src/config.js contains potential secret
# 💡 To allow this file, move secrets to environment variables
```

### Require JIRA Tickets

```bash
hook install check-jira commit-msg
# Commit message: "Fixed bug" 
# ❌ Commit message must include JIRA ticket (e.g., PROJ-123)
# Commit message: "PROJ-123: Fixed bug"
# ✅ Commit message contains JIRA ticket
```

### Enforce Branch Naming

```bash
hook install check-branch
# On branch: main
# ❌ Branch must start with: feat/, fix/, chore/, docs/, refactor/
# On branch: feat/add-login
# ✅ Branch name is valid
```

## Requirements

- Node.js 14+
- Git
- Bash (Linux/macOS) or Git Bash (Windows)

## License

MIT - Fullspark Labs