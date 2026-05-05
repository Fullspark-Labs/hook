# hook

<p align="center">
  <a href="https://www.npmjs.com/package/@fullsparklabs/hook">
    <img src="https://img.shields.io/npm/v/@fullsparklabs/hook.svg" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/@fullsparklabs/hook">
    <img src="https://img.shields.io/npm/dm/@fullsparklabs/hook.svg" alt="npm downloads">
  </a>
  <a href="https://github.com/Fullspark-Labs/hook/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/@fullsparklabs/hook.svg" alt="license">
  </a>
</p>

Git hooks manager with templates. Prevent secrets, enforce rules, run checks.

## Why hook?

- **Secure** - Block API keys, tokens, secrets from being committed
- **Enforced** - Set branch naming, commit message rules
- **Shareable** - Export hooks as Gists for team use

## Installation

```bash
npm install -g @fullsparklabs/hook
```

Or use directly:

```bash
npx @fullsparklabs/hook list
```

## Usage

### List Templates

```bash
hook list

# Output:
# 📋 Available Templates:
# no-api-keys
# no-env
# check-branch
# check-jira
# run-tests
# lint
# prettier
```

### Prevent Secrets in Code

```bash
hook install no-api-keys pre-commit

# Now commits containing "apiKey", "token", "secret" will be blocked
```

### Block .env Files

```bash
hook install no-env pre-commit

# Blocks any .env files from being committed
```

### Require JIRA Tickets

```bash
hook install check-jira commit-msg

# Commit message must include JIRA ticket (e.g., PROJ-123)
```

### Create Custom Template

```bash
# Create a file called myhook.sh
hook create myhook < myhook.sh

# Or pipe content directly
echo '#!/bin/bash
echo "Running my hook"
exit 0' | hook create myhook
```

Then install:
```bash
hook install myhook pre-commit

### Run Tests Before Commit

```bash
hook install run-tests pre-commit

# Runs npm test before allowing commit
```

## Examples

| Use Case | Command |
|---------|---------|
| Block secrets | `hook install no-api-keys pre-commit` |
| Block .env | `hook install no-env pre-commit` |
| Enforce branch | `hook install check-branch pre-push` |
| Require JIRA | `hook install check-jira commit-msg` |
| Run tests | `hook install run-tests pre-commit` |
| Run lint | `hook install lint pre-commit` |
| Create custom | `hook create myhook < file.sh` |
| Use custom | `hook install myhook pre-commit` |

## Templates

| Template | Description |
|---------|-------------|
| `no-api-keys` | Block API keys, tokens, secrets |
| `no-env` | Block .env files |
| `check-branch` | Enforce branch naming |
| `check-jira` | Require JIRA ticket in commit |
| `run-tests` | Run tests before commit |
| `lint` | Run linter |
| `prettier` | Format code |

## License

MIT