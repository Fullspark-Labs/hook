# hook

Git hooks manager with templates to prevent secrets, enforce branch naming, etc.

## Usage

```bash
hook list                    # List templates
hook install no-api-keys pre-commit   # Install template
hook install no-env pre-commit       # Block .env files
hook install check-jira commit-msg   # Require JIRA ticket
```

## Templates

- `no-api-keys` - Block API keys, tokens, secrets
- `no-env` - Block .env files
- `check-branch` - Enforce branch naming
- `check-jira` - Require JIRA ticket in commit
- `run-tests` - Run tests before commit
- `lint` - Run linter

## Install

```bash
npm install -g @fullsparklabs/hook
```