# 🚀 Voice Journal 개발 빠른 시작 가이드

## 📋 개발 환경 설정 (5분)

### 1. 프로젝트 클론 및 의존성 설치
```bash
# 1. Repository 클론
git clone https://github.com/your-username/voice-journal.git
cd voice-journal

# 2. 메인 프로젝트 의존성 설치
npm install --legacy-peer-deps

# 3. Firebase Functions 의존성 설치
cd functions
npm install
cd ..
```

### 2. VS Code에서 프로젝트 열기
```bash
code .
```

### 3. 권장 확장 프로그램 설치
VS Code에서 확장 프로그램 패널(Ctrl+Shift+X)을 열고:
- "Show Recommendations" 클릭
- 모든 권장 확장 프로그램 설치 (자동으로 제안됨)

## 🔧 환경 설정

### 4. 환경 변수 파일 생성
프로젝트 루트에 `.env.local` 파일을 생성:

```bash
# Firebase Configuration (Firebase Console에서 획득)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com  
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# Optional: AI Services
VITE_OPENAI_API_KEY=your-openai-key-if-available
```

### 5. Firebase CLI 설정 (한 번만)
```bash
# Firebase CLI 전역 설치
npm install -g firebase-tools

# Firebase 로그인
firebase login

# 프로젝트 연결
firebase use your-project-id
```

## 🚀 개발 서버 시작

### 6. 개발 서버 실행
VS Code 터미널에서:

```bash
# 프론트엔드 개발 서버 시작
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

### 7. Firebase Functions 개발 (선택사항)
별도 터미널에서:

```bash
# Functions 빌드 (한 번)
cd functions
npm run build

# 에뮬레이터 시작 (선택사항)
firebase emulators:start
```

## 📁 주요 파일 위치

```
voice-journal/
├── src/
│   ├── pages/Dashboard.tsx        # 메인 페이지
│   ├── pages/Settings.tsx         # 설정 페이지  
│   ├── domains/auth/              # 인증 관련
│   ├── domains/journaling/        # 음성일기 기능
│   ├── domains/security/          # 암호화 기능
│   └── lib/firebase.ts           # Firebase 설정
├── functions/src/index.ts         # Cloud Functions
├── firestore.rules               # DB 보안 규칙
└── .env.local                   # 환경 변수 (생성 필요)
```

## 🛠️ VS Code 주요 기능

### 작업 실행 (Ctrl+Shift+P)
- "Tasks: Run Task" → 다음 작업들 실행 가능:
  - `npm: dev` - 개발 서버 시작
  - `npm: build` - 프로덕션 빌드
  - `Firebase: build functions` - Functions 빌드
  - `Firebase: start emulators` - 에뮬레이터 시작

### 디버깅 (F5)
- React 앱 디버깅
- Firebase Functions 디버깅
- Chrome 브라우저 연결

## 🔍 개발 워크플로우

### 1. 일반적인 개발 순서
1. VS Code에서 프로젝트 열기
2. `npm run dev`로 개발 서버 시작
3. 코드 수정 (자동 리로드)
4. Git commit & push (자동 배포)

### 2. Firebase Functions 개발
1. `functions/src/index.ts` 수정
2. `cd functions && npm run build`
3. `firebase emulators:start` (로컬 테스트)
4. `firebase deploy --only functions` (배포)

### 3. 프로덕션 배포
```bash
git add .
git commit -m "Feature: 새 기능 추가"
git push origin main  # 자동으로 Vercel + Firebase 배포
```

## ⚡ 빠른 명령어

```bash
# 개발
npm run dev              # 개발 서버
npm run build           # 빌드
npm run preview         # 빌드 미리보기

# Firebase
firebase login          # 로그인
firebase deploy         # 전체 배포
firebase emulators:start # 에뮬레이터

# Git
git status             # 상태 확인
git add .              # 스테이징
git commit -m "msg"    # 커밋
git push origin main   # 푸시 (자동 배포)
```

## 🐛 문제 해결

### 자주 발생하는 문제
- **모듈 오류**: `npm install --legacy-peer-deps` 재실행
- **Firebase 오류**: `.env.local` 환경 변수 확인
- **포트 충돌**: `npm run dev -- --port 3001`
- **TypeScript 오류**: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

이제 VS Code에서 Voice Journal을 완벽하게 개발할 수 있습니다! 🎉