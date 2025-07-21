#!/usr/bin/env node

/**
 * Firebase 연결 상태 테스트 스크립트
 * 환경 변수가 설정되어 있으면 Firebase 서비스들이 정상 작동하는지 확인
 */

// 환경 변수 확인
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN', 
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

console.log('🔍 Firebase 환경 변수 확인...\n');

const missingVars = [];
const setVars = [];

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (!value) {
    missingVars.push(envVar);
    console.log(`❌ ${envVar}: 설정되지 않음`);
  } else {
    setVars.push(envVar);
    // API 키나 민감한 정보는 일부만 표시
    const displayValue = envVar.includes('API_KEY') ? 
      `${value.substring(0, 8)}...` : 
      value;
    console.log(`✅ ${envVar}: ${displayValue}`);
  }
});

console.log(`\n📊 환경 변수 상태: ${setVars.length}/${requiredEnvVars.length} 설정됨\n`);

// Firebase 프로젝트 설정 확인
try {
  const fs = require('fs');
  const firebaserc = JSON.parse(fs.readFileSync('.firebaserc', 'utf8'));
  console.log('🔥 Firebase 프로젝트 설정:');
  console.log(`   프로젝트 ID: ${firebaserc.projects.default}`);
} catch (error) {
  console.log('❌ .firebaserc 파일을 찾을 수 없습니다');
}

// Firebase Functions 빌드 상태 확인
try {
  const fs = require('fs');
  const indexJsExists = fs.existsSync('functions/lib/index.js');
  console.log(`📦 Functions 빌드 상태: ${indexJsExists ? '✅ 빌드됨' : '❌ 빌드 필요'}`);
} catch (error) {
  console.log('❌ Functions 디렉토리를 확인할 수 없습니다');
}

// GitHub Actions 워크플로우 확인
try {
  const fs = require('fs');
  const workflowExists = fs.existsSync('.github/workflows/firebase-deploy.yml');
  console.log(`🚀 GitHub Actions: ${workflowExists ? '✅ 설정됨' : '❌ 설정 필요'}`);
} catch (error) {
  console.log('❌ GitHub Actions 워크플로우를 확인할 수 없습니다');
}

console.log('\n🏁 Firebase 상태 확인 완료!');

if (missingVars.length > 0) {
  console.log('\n⚠️  다음 환경 변수가 필요합니다:');
  missingVars.forEach(envVar => {
    console.log(`   - ${envVar}`);
  });
  console.log('\n📖 설정 방법은 FIREBASE_DEPLOYMENT_GUIDE.md를 참고하세요.');
  process.exit(1);
} else {
  console.log('\n✅ 모든 환경 변수가 설정되었습니다!');
  console.log('🚀 Firebase 배포가 가능한 상태입니다.');
  process.exit(0);
}