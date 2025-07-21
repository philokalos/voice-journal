#!/usr/bin/env node

/**
 * Deployment Test Script
 * 
 * Tests the deployment pipeline by running all necessary checks
 * that would normally run in CI/CD environment.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🚀 Voice Journal Deployment Test');
console.log('================================');

let errors = [];
let warnings = [];

function runCommand(command, description) {
  console.log(`\n📋 ${description}...`);
  try {
    const output = execSync(command, { 
      stdio: 'pipe',
      encoding: 'utf8',
      cwd: process.cwd()
    });
    console.log(`✅ ${description} - SUCCESS`);
    return output;
  } catch (error) {
    console.error(`❌ ${description} - FAILED`);
    console.error(`Error: ${error.message}`);
    errors.push(`${description}: ${error.message}`);
    return null;
  }
}

function checkFile(filePath, description) {
  console.log(`\n📋 Checking ${description}...`);
  if (fs.existsSync(path.join(projectRoot, filePath))) {
    console.log(`✅ ${description} exists`);
    return true;
  } else {
    console.log(`⚠️  ${description} missing`);
    warnings.push(`Missing: ${description}`);
    return false;
  }
}

function checkEnvironmentTemplate() {
  console.log('\n📋 Checking environment template...');
  const envExample = path.join(projectRoot, '.env.local.example');
  
  if (fs.existsSync(envExample)) {
    const content = fs.readFileSync(envExample, 'utf8');
    const requiredVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ];
    
    const missingVars = requiredVars.filter(varName => !content.includes(varName));
    
    if (missingVars.length === 0) {
      console.log('✅ Environment template has all required variables');
      return true;
    } else {
      console.log(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
      warnings.push(`Missing env vars: ${missingVars.join(', ')}`);
      return false;
    }
  } else {
    console.log('❌ .env.local.example not found');
    errors.push('Missing .env.local.example file');
    return false;
  }
}

async function main() {
  console.log('\n🔍 Pre-deployment Checks');
  console.log('========================');

  // Check essential files
  checkFile('package.json', 'Package.json');
  checkFile('vercel.json', 'Vercel configuration');
  checkFile('.github/workflows/deploy.yml', 'GitHub Actions workflow');
  checkFile('tsconfig.json', 'TypeScript configuration');
  checkFile('vite.config.ts', 'Vite configuration');
  checkEnvironmentTemplate();

  console.log('\n🛠️  Code Quality Checks');
  console.log('=======================');

  // Install dependencies
  runCommand('npm ci', 'Installing dependencies');

  // Run linting
  runCommand('npm run lint', 'ESLint check');

  // Run type checking
  runCommand('npm run type-check', 'TypeScript type check');

  // Run security checks
  try {
    runCommand('npm audit --audit-level high', 'High-severity security audit');
  } catch (error) {
    console.log('⚠️  Some moderate vulnerabilities found (development dependencies only)');
    warnings.push('Moderate security vulnerabilities in dev dependencies');
  }
  runCommand('npm run check:secrets', 'Secret exposure check');

  console.log('\n🏗️  Build Tests');
  console.log('===============');

  // Test build process
  runCommand('npm run build:unsafe', 'Production build test');

  console.log('\n📊 Test Results');
  console.log('===============');

  if (errors.length > 0) {
    console.log('\n❌ DEPLOYMENT NOT READY');
    console.log('Issues that must be fixed:');
    errors.forEach(error => console.log(`  • ${error}`));
  } else {
    console.log('\n✅ DEPLOYMENT READY');
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`  • ${warning}`));
  }

  console.log('\n🎯 Summary');
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (errors.length === 0) {
    console.log('\n🚀 Ready to deploy!');
    console.log('Next steps:');
    console.log('  1. Push to staging branch for staging deployment');
    console.log('  2. Create PR to main branch for production deployment');
    console.log('  3. Monitor deployment at https://vercel.com');
  } else {
    console.log('\n🛑 Fix errors before deploying');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n💥 Test script failed:', error);
  process.exit(1);
});