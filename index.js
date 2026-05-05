#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const HOME = process.env.HOME || process.env.USERPROFILE;
const CONFIG_DIR = path.join(HOME, '.config', 'hook');
const TEMPLATES_DIR = path.join(CONFIG_DIR, 'templates');
const BUILTIN_DIR = path.join(__dirname, 'templates');

if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}
if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

const HOOK_TYPES = ['pre-commit', 'pre-push', 'commit-msg', 'pre-rebase', 'post-checkout', 'post-merge', 'pre-receive'];

function getGitRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function getHooksDir() {
  const gitRoot = getGitRoot();
  if (!gitRoot) {
    console.log('❌ Not in a git repository');
    process.exit(1);
  }
  return path.join(gitRoot, '.git', 'hooks');
}

function isWindows() {
  return process.platform === 'win32';
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

const TEMPLATES = {
  'no-api-keys': {
    description: 'Block API keys, tokens, and secrets from commits',
    hookType: 'pre-commit',
    code: `#!/bin/bash
# Block API keys, tokens, secrets from being committed
# Patterns: API_KEY, TOKEN, SECRET, password, private_key, AWS keys, etc.

BLOCKED_PATTERNS="(api[_-]?key|apikey|token|secret|password|private[_-]?key|aws[_-]?access|aws[_-]?secret|PRIVATE[_-]?KEY|API[_-]?KEY|TOKEN|PASSWORD|SECRET)"

echo "🔍 Checking for secrets..."

files=$(git diff --cached --name-only --diff-filter=ACM)
FOUND=

for file in $files; do
  [ -f "$file" ] || continue
  
  if grep -Eiqo "$BLOCKED_PATTERNS" "$file" 2>/dev/null | head -1 > /dev/null; then
    echo "❌ Blocked: $file contains potential secret (API key, token, etc.)"
    FOUND=1
  fi
done

if [ -n "$FOUND" ]; then
  echo ""
  echo "💡 To allow this file, move secrets to environment variables or .env file"
  echo "💡 Add to .gitignore: echo '.env' >> .gitignore"
  exit 1
fi

echo "✅ No secrets detected"
exit 0`
  },

  'no-env': {
    description: 'Block .env files from being committed',
    hookType: 'pre-commit',
    code: `#!/bin/bash
# Block .env and environment files

echo "🔍 Checking for .env files..."

files=$(git diff --cached --name-only --diff-filter=ACM)
FOUND=

for file in $files; do
  case "$file" in
    *.env|.env|.env.*|.env.local|.env.development|.env.production)
      echo "❌ Blocked: $file is an environment file"
      FOUND=1
      ;;
  esac
done

if [ -n "$FOUND" ]; then
  echo ""
  echo "💡 Environment files should not be committed"
  echo "💡 Add to .gitignore: echo '.env' >> .gitignore"
  exit 1
fi

echo "✅ No .env files detected"
exit 0`
  },

  'no-secrets': {
    description: 'Block common secret file names (pem, key, etc.)',
    hookType: 'pre-commit',
    code: `#!/bin/bash
# Block secret key files

BLOCKED_FILES="(\\.pem$|\\.key$|id_rsa$|id_ed25519$|\\.secret$|credentials$|\\.p12$|\\.pfx$)"

echo "🔍 Checking for secret files..."

files=$(git diff --cached --name-only --diff-filter=ACM)
FOUND=

for file in $files; do
  if echo "$file" | grep -Eq "$BLOCKED_FILES"; then
    echo "❌ Blocked: $file appears to be a secrets file"
    FOUND=1
  fi
done

if [ -n "$FOUND" ]; then
  echo "💡 Private keys should not be committed"
  exit 1
fi

echo "✅ No secret files detected"
exit 0`
  },

  'check-jira': {
    description: 'Require JIRA ticket format in commit messages (e.g., PROJ-123)',
    hookType: 'commit-msg',
    code: `#!/bin/bash
# Require JIRA ticket format: PROJECT-123

COMMIT_MSG_FILE=$1

if [ -z "$COMMIT_MSG_FILE" ]; then
  echo "❌ Commit message file not provided"
  exit 1
fi

COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")
BRANCH_NAME=$(git symbolic-ref --short HEAD 2>/dev/null | sed 's/.*\\///')

echo "🔍 Checking JIRA format..."

# Check branch name first
if [ -n "$BRANCH_NAME" ]; then
  if echo "$BRANCH_NAME" | grep -Eq "^[A-Z]+-[0-9]+-"; then
    echo "✅ Branch contains JIRA ticket: $BRANCH_NAME"
    exit 0
  fi
fi

# Check commit message
if echo "$COMMIT_MSG" | grep -Eq "^[A-Z]+-[0-9]+:"; then
  echo "✅ Commit message contains JIRA ticket"
  exit 0
fi

echo "❌ Commit message must include JIRA ticket (e.g., PROJ-123: Fix bug)"
echo "   Example: PROJ-123: Initialize project"
echo ""
echo "💡 Or use branch naming: git checkout -b PROJ-123-feature-name"
exit 1`
  },

  'check-branch': {
    description: 'Enforce branch naming (feat/, fix/, chore/, etc.)',
    hookType: 'pre-commit',
    code: `#!/bin/bash
# Enforce branch naming convention

ALLOWED_PREFIXES="^(feat|fix|chore|docs|refactor|test|ci|build)\/"
BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null)

if [ -z "$BRANCH" ]; then
  echo "❌ Not on a branch (detached HEAD)"
  exit 1
fi

echo "🔍 Checking branch: $BRANCH"

if echo "$BRANCH" | grep -Eq "$ALLOWED_PREFIXES"; then
  echo "✅ Branch name is valid"
  exit 0
fi

echo "❌ Branch must start with: feat/, fix/, chore/, docs/, refactor/, test/"
echo "   Example: git checkout -b feat/add-login"
exit 1`
  },

  'no-package-lock': {
    description: 'Prefer pnpm/yarn lock files over package-lock.json',
    hookType: 'pre-commit',
    code: `#!/bin/bash
# Block package-lock.json (prefer pnpm or yarn)

echo "🔍 Checking lock files..."

files=$(git diff --cached --name-only --diff-filter=ACM)
FOUND=

for file in $files; do
  case "$file" in
    package-lock.json)
      echo "❌ Blocked: Use pnpm-lock.yaml or yarn.lock instead"
      FOUND=1
      ;;
  esac
done

if [ -n "$FOUND" ]; then
  echo "💡 Use pnpm (fast, efficient) or yarn instead of npm"
  exit 1
fi

echo "✅ No package-lock.json detected"
exit 0`
  },

  'no-large-files': {
    description: 'Block files larger than 100KB',
    hookType: 'pre-commit',
    code: `#!/bin/bash
# Block files larger than 100KB

MAX_SIZE=100000

echo "🔍 Checking file sizes..."

files=$(git diff --cached --name-only --diff-filter=ACM)
FOUND=

for file in $files; do
  [ -f "$file" ] || continue
  SIZE=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null)
  
  if [ "$SIZE" -gt "$MAX_SIZE" ]; then
    echo "❌ Blocked: $file is too large ($SIZE bytes)"
    FOUND=1
  fi
done

if [ -n "$FOUND" ]; then
  echo "💡 Use Git LFS for large files: git lfs track '*.psd'"
  exit 1
fi

echo "✅ All files under size limit"
exit 0`
  },

  'no-node-modules': {
    description: 'Block node_modules from being committed',
    hookType: 'pre-commit',
    code: `#!/bin/bash
# Block node_modules

echo "🔍 Checking for node_modules..."

files=$(git diff --cached --name-only --diff-filter=ACM)
FOUND=

for file in $files; do
  case "$file" in
    node_modules/*|node_modules)
      echo "❌ Blocked: node_modules should not be committed"
      FOUND=1
      ;;
  esac
done

if [ -n "$FOUND" ]; then
  echo "💡 Use npm install after cloning: npm install"
  exit 1
fi

echo "✅ No node_modules detected"
exit 0`
  },

  'no-debugger': {
    description: 'Block debugger statements in code',
    hookType: 'pre-commit',
    code: `#!/bin/bash
# Block debugger statements

echo "🔍 Checking for debugger statements..."

files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(js|ts|jsx|tsx|py|go|rs)$')
FOUND=

for file in $files; do
  [ -f "$file" ] || continue
  
  if grep -Eq "(debugger|console\\.log)" "$file" 2>/dev/null | head -1 > /dev/null; then
    echo "❌ Blocked: $file contains debugger or console.log"
    FOUND=1
  fi
done

if [ -n "$FOUND" ]; then
  echo "💡 Remove debugger statements before committing"
  exit 1
fi

echo "✅ No debug statements detected"
exit 0`
  },

  'require-emoji': {
    description: 'Require emoji in commit messages',
    hookType: 'commit-msg',
    code: `#!/bin/bash
# Require emoji in commit message

EMOJI="(✨|🚧|✅|🐛|📝|🎨|🔥|💄|🔧|📦|🚀|💎)"
COMMIT_MSG_FILE=$1

if [ -z "$COMMIT_MSG_FILE" ]; then
  echo "❌ Commit message file not provided"
  exit 1
fi

COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

if echo "$COMMIT_MSG" | grep -Eq "$EMOJI"; then
  echo "✅ Commit message has emoji"
  exit 0
fi

echo "❌ Commit message should include emoji"
echo "   ✨ - new feature"
echo "   🚧 - work in progress"
echo "   🐛 - bug fix"
echo "   📝 - documentation"
echo "   🔧 - refactor"
echo "   ✅ - tests"
exit 1`
  },

  'check-merge-commit': {
    description: 'Block merge commits in commit-msg',
    hookType: 'commit-msg',
    code: `#!/bin/bash
# Block merge commits

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

if echo "$COMMIT_MSG" | grep -qi "^Merge"; then
  echo "❌ Merge commits should be avoided"
  echo "💡 Use git rebase instead: git rebase main"
  exit 1
fi

exit 0`
  }
};

function listTemplates() {
  console.log('\n📋 Available Templates:\n');
  console.log('  Built-in templates:');
  Object.keys(TEMPLATES).forEach(name => {
    const t = TEMPLATES[name];
    console.log(`    ${name.padEnd(20)} - ${t.description}`);
  });
  console.log('');
  console.log('  Custom templates (in ~/.config/hook/templates/):');
  
  let hasCustom = false;
  if (fs.existsSync(TEMPLATES_DIR)) {
    fs.readdirSync(TEMPLATES_DIR).forEach(file => {
      if (file.endsWith('.sh') || file.endsWith('.bash')) {
        hasCustom = true;
        console.log(`    ${file.replace(/\.(sh|bash)$/, '')}`);
      }
    });
  }
  
  if (!hasCustom) {
    console.log('    (none created yet)');
  }
  console.log('');
}

function listHooks() {
  const hookDir = getHooksDir();
  console.log('\n🔗 Installed Hooks:\n');
  
  HOOK_TYPES.forEach(hookType => {
    const hookPath = path.join(hookDir, hookType);
    if (fs.existsSync(hookPath)) {
      const stats = fs.statSync(hookPath);
      const size = stats.size;
      console.log(`    ${hookType} (${size} bytes)`);
    } else {
      console.log(`    ${hookType} (not installed)`);
    }
  });
  console.log('');
}

function installTemplate(templateName, hookType) {
  if (!hookType) {
    hookType = TEMPLATES[templateName]?.hookType || 'pre-commit';
  }
  
  if (!HOOK_TYPES.includes(hookType)) {
    console.log(`❌ Invalid hook type: ${hookType}`);
    console.log(`   Valid types: ${HOOK_TYPES.join(', ')}`);
    return;
  }
  
  let code = TEMPLATES[templateName]?.code;
  
  if (!code) {
    const customPath = path.join(TEMPLATES_DIR, templateName + '.sh');
    if (fs.existsSync(customPath)) {
      code = fs.readFileSync(customPath, 'utf8');
    }
  }
  
  if (!code) {
    console.log(`❌ Template not found: ${templateName}`);
    console.log(`   Run: hook list`);
    return;
  }
  
  let shebang = '#!/bin/bash';
  if (isWindows()) {
    shebang = '#!/usr/bin/env bash';
  }
  
  const fullCode = code.replace('#!/bin/bash', shebang).replace('#!/usr/bin/env bash', shebang);
  
  const hookDir = getHooksDir();
  const hookPath = path.join(hookDir, hookType);
  
  fs.writeFileSync(hookPath, fullCode, { mode: 0o755 });
  console.log(`✅ Installed: ${templateName} → .git/hooks/${hookType}`);
}

function createTemplate(name, code) {
  if (!name) {
    console.log('Usage: hook create <name> [template-content]');
    return;
  }
  
  const defaultCode = `#!/bin/bash
# Custom hook: ${name}
# Add your validation logic here

echo "Running ${name}..."

# Add your checks here
# exit 0 - allow
# exit 1 - block

echo "✅ ${name} passed"
exit 0`;
  
  const content = code || defaultCode;
  const outPath = path.join(TEMPLATES_DIR, name + '.sh');
  
  fs.writeFileSync(outPath, content, { mode: 0o755 });
  console.log(`✅ Created template: ${name}`);
  console.log(`   Path: ${outPath}`);
  console.log(`   Install: hook install ${name} pre-commit`);
}

function removeHook(hookType) {
  if (!hookType) {
    console.log('Usage: hook remove <hook-name>');
    return;
  }
  
  if (!HOOK_TYPES.includes(hookType)) {
    console.log(`❌ Invalid hook: ${hookType}`);
    return;
  }
  
  const hookDir = getHooksDir();
  const hookPath = path.join(hookDir, hookType);
  
  if (fs.existsSync(hookPath)) {
    fs.unlinkSync(hookPath);
    console.log(`✅ Removed: .git/hooks/${hookType}`);
  } else {
    console.log(`⚠️  Not installed: ${hookType}`);
  }
}

function validateTemplate(templateName) {
  const t = TEMPLATES[templateName];
  if (!t) {
    console.log(`❌ Template not found: ${templateName}`);
    return;
  }
  
  console.log(`\n📄 Template: ${templateName}`);
  console.log(`   Description: ${t.description}`);
  console.log(`   Hook type: ${t.hookType}`);
  console.log(`\n📝 Code:\n`);
  console.log(t.code);
}

function showHelp() {
  console.log(`
🪝 hook - Git hooks manager

Usage:
  hook <command> [options]

Commands:
  list                      List available templates
  hooks                     List installed hooks in current repo
  install <template> [type]   Install template to hooks (default: pre-commit)
  create <name> [code]       Create custom template
  remove <hook>              Remove installed hook
  validate <template>        Show template code
  help                      Show this help

Examples:
  hook list
  hook install no-api-keys
  hook install check-jira commit-msg
  hook install no-env pre-commit
  hook create myhook '#!/bin/bash\necho "custom"\nexit 0'

Template Types:
  pre-commit    Runs before commit
  pre-push    Runs before git push
  commit-msg  Runs after commit message
  pre-rebase  Runs before rebase

Note: Hooks are installed to .git/hooks/ (not Git-managed)
     Commit the hooks directory to share with team:
     git add .git/hooks && git commit -m "Add hooks"

Website: https://github.com/Fullspark-Labs/hook
`);
}

const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
  list: listTemplates,
  hooks: listHooks,
  install: () => {
    if (args.length < 1) {
      console.log('Usage: hook install <template> [hook-type]');
      console.log('  Example: hook install no-api-keys pre-commit');
      listTemplates();
      return;
    }
    installTemplate(args[0], args[1]);
  },
  create: () => {
    createTemplate(args[0], args.slice(1).join(' '));
  },
  remove: () => {
    removeHook(args[0]);
  },
  validate: () => {
    if (args.length < 1) {
      console.log('Usage: hook validate <template>');
      return;
    }
    validateTemplate(args[0]);
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
  console.log(`Unknown command: ${cmd}`);
  showHelp();
}