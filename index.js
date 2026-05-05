#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'hook');
const TEMPLATES_DIR = path.join(CONFIG_DIR, 'templates');
const SHARE_FILE = path.join(CONFIG_DIR, 'share.json');

if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}
if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

const DEFAULT_TEMPLATES = {
  'no-api-keys': `#!/bin/bash
# Prevent committing API keys, tokens, secrets
files=$(git diff --cached --name-only)
for file in $files; do
  if grep -Eq '(apiKey|api_key|apikey|secret|token|password|private_key|PRIVATE_KEY|API_KEY|TOKEN|PASSWORD)' "$file" 2>/dev/null; then
    echo "❌ Commit blocked: $file contains potential secrets"
    exit 1
  fi
done
echo "✅ No secrets detected"
exit 0`,

  'no-env': `#!/bin/bash
# Block .env files
files=$(git diff --cached --name-only)
for file in $files; do
  if [[ "$file" == *.env || "$file" == .env* ]]; then
    echo "❌ Commit blocked: $file is a .env file"
    exit 1
  fi
done
exit 0`,

  'check-branch': `#!/bin/bash
# Enforce branch naming
branch=$(git symbolic-ref --short HEAD 2>/dev/null)
if [[ ! "$branch" =~ ^(feat|fix|chore|docs|refactor)/ ]]; then
  echo "❌ Branch must start with feat/, fix/, chore/, docs/, or refactor/"
  exit 1
fi
exit 0`,

  'check-jira': `#!/bin/bash
# Require JIRA ticket in commit
commit_msg=$(cat "$1")
if [[ ! "$commit_msg" =~ ^[A-Z]+-[0-9]+ ]]; then
  echo "❌ Commit message must include JIRA ticket (e.g., PROJ-123)"
  exit 1
fi
exit 0`,

  'run-tests': `#!/bin/bash
# Run tests before commit
npm test || exit 1
exit 0`,

  'lint': `#!/bin/bash
# Run lint
npm run lint || exit 1
exit 0`,

  'prettier': `#!/bin/bash
# Format code
npx prettier --write .
exit 0`
};

function getHooksDir() {
  const dir = execSync('git rev-parse --show-toplevel 2>/dev/null', { encoding: 'utf8' }).trim();
  return path.join(dir, '.git', 'hooks');
}

function listTemplates() {
  console.log('\n📋 Available Templates:\n');
  Object.keys(DEFAULT_TEMPLATES).forEach(t => console.log(`  ${t}`));
}

function installTemplate(templateName, hookName) {
  const hookDir = getHooksDir();
  const hookPath = path.join(hookDir, hookName);
  
  // Check default templates first, then custom
  let content = DEFAULT_TEMPLATES[templateName];
  if (!content) {
    // Try custom template
    const customPath = path.join(TEMPLATES_DIR, templateName);
    if (fs.existsSync(customPath)) {
      content = fs.readFileSync(customPath, 'utf8');
    }
  }
  
  if (!content) {
    console.log(`❌ Template not found: ${templateName}`);
    console.log(`   Run: hook list (to see available templates)`);
    return;
  }
  
  fs.writeFileSync(hookPath, content, { mode: 0o755 });
  console.log(`✅ Installed ${templateName} → .git/hooks/${hookName}`);
}

function createTemplate(name, content) {
  const outPath = path.join(TEMPLATES_DIR, name);
  fs.writeFileSync(outPath, content);
  console.log(`✅ Saved as: ${name}`);
}

function share(templateName) {
  const content = DEFAULT_TEMPLATES[templateName];
  if (!content) {
    console.log(`❌ Template not found: ${templateName}`);
    return;
  }
  
  let shareData = {};
  if (fs.existsSync(SHARE_FILE)) {
    shareData = JSON.parse(fs.readFileSync(SHARE_FILE, 'utf8'));
  }
  
  shareData[templateName] = {
    content,
    description: `Auto-generated template: ${templateName}`
  };
  
  fs.writeFileSync(SHARE_FILE, JSON.stringify(shareData, null, 2));
  console.log(`✅ Shared ${templateName}`);
}

function showHelp() {
  console.log(`
hook - Git hooks manager

Usage: hook <command> [options]

Commands:
  list                - List available templates
  install <template>    - Install template to hooks (e.g., hook install no-api-keys pre-commit)
  create <name>       - Create custom hook
  share <template>    - Share template (for export)
  help                - Show this help

Examples:
  hook list
  hook install no-api-keys pre-commit
  hook install no-env pre-commit
  hook install check-jira commit-msg
`);
}

const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
  list: listTemplates,
  install: () => {
    if (args.length < 2) {
      console.log('Usage: hook install <template> <hook-name>');
      return;
    }
    installTemplate(args[0], args[1]);
  },
  create: () => {
    if (args.length < 1) {
      console.log('Usage: hook create <name> [template-file]');
      console.log('  Create custom hook template');
      console.log('  Example: hook create myhook < template.sh');
      return;
    }
    const name = args[0];
    
    let content = '';
    if (process.stdin.isTTY) {
      content = `#!/bin/bash
# Custom hook: ${name}
echo "Hello from ${name}"
exit 0`;
    } else {
      // Read from stdin
      content = fs.readFileSync(0, 'utf8');
    }
    
    const outPath = path.join(TEMPLATES_DIR, name);
    fs.writeFileSync(outPath, content, { mode: 0o755 });
    console.log(`✅ Created template: ${name}`);
    console.log(`   Install with: hook install ${name} pre-commit`);
  },
  share: () => {
    if (args.length < 1) {
      console.log('Usage: hook share <template>');
      return;
    }
    share(args[0]);
  },
  help: showHelp,
  '-h': showHelp,
  '--help': showHelp
};

if (!cmd || cmd === 'list') {
  listTemplates();
} else if (commands[cmd]) {
  commands[cmd]();
} else {
  showHelp();
}