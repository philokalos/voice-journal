#!/usr/bin/env node

/**
 * Security check script to ensure no secrets are exposed in the client bundle
 * Run this as part of the build process to catch accidental secret exposure
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patterns that should never appear in client bundles
const DANGEROUS_PATTERNS = [
  /sk-[a-zA-Z0-9]{48,}/g, // OpenAI API keys
  /supabase_service_role_[a-zA-Z0-9_]+/g, // Supabase service role keys
  /AKIA[0-9A-Z]{16}/g, // AWS access keys
  /google_client_secret_[a-zA-Z0-9_-]+/g, // Google client secrets
  /notion_secret_[a-zA-Z0-9_-]+/g, // Notion secrets
  /"[A-Za-z0-9+/]{88}=="/g, // Base64 encoded secrets (88 chars + ==)
  /Bearer [A-Za-z0-9_-]{100,}/g, // Bearer tokens
];

// Environment variable patterns that should not be in client code
const ENV_PATTERNS = [
  /process\.env\.(?!VITE_|NODE_ENV)[A-Z_]+/g,
  /import\.meta\.env\.(?!VITE_|MODE|DEV|PROD)[A-Z_]+/g,
];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const violations = [];

  // Check for dangerous patterns
  DANGEROUS_PATTERNS.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      violations.push({
        type: 'SECRET_EXPOSURE',
        pattern: pattern.toString(),
        matches: matches.slice(0, 3), // Limit output
        file: filePath
      });
    }
  });

  // Check for non-VITE env vars
  ENV_PATTERNS.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      violations.push({
        type: 'ENV_EXPOSURE',
        pattern: pattern.toString(),
        matches: matches.slice(0, 3),
        file: filePath
      });
    }
  });

  return violations;
}

function scanDirectory(dir, violations = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules and other build directories
      if (!['node_modules', '.git', 'dist', '.vercel'].includes(file)) {
        scanDirectory(fullPath, violations);
      }
    } else if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.tsx')) {
      const fileViolations = checkFile(fullPath);
      violations.push(...fileViolations);
    }
  });

  return violations;
}

function main() {
  console.log('🔍 Scanning for exposed secrets and environment variables...');
  
  const projectRoot = path.join(__dirname, '..');
  const violations = scanDirectory(projectRoot);

  if (violations.length === 0) {
    console.log('✅ No secret exposures detected!');
    process.exit(0);
  }

  console.log(`❌ Found ${violations.length} potential security issues:`);
  console.log('');

  violations.forEach((violation, index) => {
    console.log(`${index + 1}. ${violation.type} in ${violation.file}`);
    console.log(`   Pattern: ${violation.pattern}`);
    console.log(`   Matches: ${violation.matches.join(', ')}`);
    console.log('');
  });

  console.log('🚨 Security violations detected! Please review and fix before deploying.');
  console.log('');
  console.log('Common fixes:');
  console.log('- Ensure all client-side env vars use VITE_ prefix');
  console.log('- Move server secrets to Supabase Edge Functions');
  console.log('- Use environment variables instead of hardcoded secrets');
  console.log('- Double-check .env files are in .gitignore');

  process.exit(1);
}

main();