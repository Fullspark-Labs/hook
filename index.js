#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HOME = process.env.HOME || process.env.USERPROFILE;
const CONFIG_DIR = path.join(HOME, '.config', 'hook');
const TEMPLATES_DIR = path.join(CONFIG_DIR, 'templates');
const TEMPLATES_FILE = path.join(__dirname, 'templates.json');

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

function loadTemplates() {
  try {
    return JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function listTemplates() {
  const templates = loadTemplates();
  console.log('\n📋 Available Templates:\n');
  
  Object.keys(templates).forEach(name => {
    const t = templates[name];
    console.log(`  ${name.padEnd(20)} ${t.description}`);
  });
  console.log('');
}

function listHooks() {
  const hookDir = getHooksDir();
  console.log('\n🔗 Installed Hooks:\n');
  
  HOOK_TYPES.forEach(hookType => {
    const hookPath = path.join(hookDir, hookType);
    if (fs.existsSync(hookPath)) {
      console.log(`    ${hookType} (installed)`);
    } else {
      console.log(`    ${hookType} (not installed)`);
    }
  });
  console.log('');
}

function installTemplate(templateName, hookType) {
  const templates = loadTemplates();
  const template = templates[templateName];
  
  if (!template) {
    console.log(`❌ Template not found: ${templateName}`);
    console.log(`   Run: hook list`);
    return;
  }
  
  if (!hookType) {
    hookType = template.hookType || 'pre-commit';
  }
  
  if (!HOOK_TYPES.includes(hookType)) {
    console.log(`❌ Invalid hook type: ${hookType}`);
    console.log(`   Valid: ${HOOK_TYPES.join(', ')}`);
    return;
  }
  
  let code = template.code || '';
  
  if (!code) {
    console.log(`❌ Template has no code: ${templateName}`);
    return;
  }
  
  const hookDir = getHooksDir();
  const hookPath = path.join(hookDir, hookType);
  
  fs.writeFileSync(hookPath, code, { mode: 0o755 });
  console.log(`✅ Installed: ${templateName} → .git/hooks/${hookType}`);
}

function removeHook(hookType) {
  if (!hookType) {
    console.log('Usage: hook remove <hook-type>');
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
  const templates = loadTemplates();
  const template = templates[templateName];
  
  if (!template) {
    console.log(`❌ Template not found: ${templateName}`);
    return;
  }
  
  console.log(`\n📄 ${templateName}`);
  console.log(`   ${template.description}`);
  console.log(`   Hook: ${template.hookType}`);
  console.log(`\n${template.code}`);
}

function showHelp() {
  console.log(`
🪝 hook - Git hooks manager

Usage:
  hook <command> [options]

Commands:
  list                      List available templates
  hooks                     List installed hooks
  install <template> [type]   Install template
  remove <type>              Remove hook
  validate <template>        Show template code
  help                      Show help

Examples:
  hook list
  hook install no-api-keys
  hook install check-jira commit-msg

Website: https://github.com/Fullspark-Labs/hook
`);
}

const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
  list: listTemplates,
  hooks: listHooks,
  install: () => installTemplate(args[0], args[1]),
  remove: () => removeHook(args[0]),
  validate: () => validateTemplate(args[0]),
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