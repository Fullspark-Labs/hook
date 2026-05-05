#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HOME = process.env.HOME || process.env.USERPROFILE;
const CONFIG_DIR = path.join(HOME, '.config', 'hook');
const TEMPLATES_DIR = path.join(__dirname, 'templates');
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

function loadTemplate(name) {
  const file = path.join(TEMPLATES_DIR, name + '.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function listTemplates() {
  console.log('\n📋 Available Templates:\n');
  
  const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.json'));
  files.forEach(file => {
    const name = file.replace('.json', '');
    const t = loadTemplate(name);
    if (t) {
      console.log(`  ${name.padEnd(20)} ${t.description || ''}`);
    }
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
  const template = loadTemplate(templateName);
  
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
  
  if (!template.code) {
    console.log(`❌ Template has no code: ${templateName}`);
    return;
  }
  
  const hookDir = getHooksDir();
  const hookPath = path.join(hookDir, hookType);
  
  fs.writeFileSync(hookPath, template.code, { mode: 0o755 });
  console.log(`✅ Installed: ${templateName} → .git/hooks/${hookType}`);
}

function removeHook(hookType) {
  if (!HOOK_TYPES.includes(hookType)) {
    console.log(`❌ Invalid: ${hookType}`);
    return;
  }
  
  const hookDir = getHooksDir();
  const hookPath = path.join(hookDir, hookType);
  
  if (fs.existsSync(hookPath)) {
    fs.unlinkSync(hookPath);
    console.log(`✅ Removed: .git/hooks/${hookType}`);
  }
}

function validateTemplate(templateName) {
  const template = loadTemplate(templateName);
  
  if (!template) {
    console.log(`❌ Not found: ${templateName}`);
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
  list                      List templates
  hooks                     List installed hooks
  install <name> [type]     Install template
  remove <type>              Remove hook
  validate <name>            Show template
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

if (!cmd || cmd === 'list') {
  listTemplates();
} else if (cmd === 'hooks') {
  listHooks();
} else if (cmd === 'install') {
  installTemplate(args[0], args[1]);
} else if (cmd === 'remove') {
  removeHook(args[0]);
} else if (cmd === 'validate') {
  validateTemplate(args[0]);
} else {
  showHelp();
}