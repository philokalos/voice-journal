# 🛠️ Visual Studio Code 작업 환경 설정

## 1. 프로젝트 클론 및 설정

### 1.1 Git Repository 클론
```bash
# 프로젝트 클론
git clone https://github.com/your-username/voice-journal.git
cd voice-journal

# 최신 상태 확인
git pull origin main
git log --oneline -3
```

### 1.2 Node.js 의존성 설치
```bash
# 메인 프로젝트 의존성 설치
npm install --legacy-peer-deps

# Firebase Functions 의존성 설치
cd functions
npm install
cd ..
```

## 2. Visual Studio Code 확장 프로그램

### 2.1 필수 확장 프로그램 설치
VS Code에서 Extensions (Ctrl+Shift+X)를 열고 다음 확장 프로그램들을 설치하세요:

**React & TypeScript 개발:**
- `ES7+ React/Redux/React-Native snippets`
- `TypeScript Importer`
- `Auto Rename Tag`
- `Bracket Pair Colorizer`

**Firebase 개발:**
- `Firebase`
- `Firebase Snippets`

**코드 품질:**
- `ESLint`
- `Prettier - Code formatter`
- `Error Lens`

**유틸리티:**
- `GitLens — Git supercharged`
- `Path Intellisense`
- `Auto Import - ES6, TS, JSX, TSX`
- `Thunder Client` (API 테스트용)

### 2.2 권장 확장 프로그램
- `Tailwind CSS IntelliSense`
- `Console Ninja`
- `GitHub Copilot` (선택사항)
- `Live Server`
- `Markdown All in One`

## 3. VS Code 설정 파일

### 3.1 Workspace 설정 (.vscode/settings.json)
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.workingDirectories": ["voice-journal"],
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  "tailwindCSS.experimental.classRegex": [
    "tw`([^`]*)",
    "tw=\"([^\"]*)",
    "tw={\"([^\"}]*)",
    "tw\\.\\w+`([^`]*)",
    "tw\\(.*?\\)`([^`]*)"
  ]
}
```

### 3.2 작업 설정 (.vscode/tasks.json)
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "dev",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      },
      "label": "npm: dev",
      "detail": "npm run dev"
    },
    {
      "type": "npm",
      "script": "build",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      },
      "label": "npm: build",
      "detail": "npm run build"
    },
    {
      "type": "shell",
      "command": "cd functions && npm run build",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      },
      "label": "Firebase: build functions",
      "detail": "Build Firebase Cloud Functions"
    }
  ]
}
```

### 3.3 디버그 설정 (.vscode/launch.json)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug React App",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/vite",
      "args": ["--mode", "development"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Debug Firebase Functions",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/functions/lib/index.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

## 4. 환경 변수 설정

### 4.1 .env.local 파일 생성
프로젝트 루트에 `.env.local` 파일을 생성하고 Firebase 설정값을 입력하세요:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Optional: AI Services
VITE_OPENAI_API_KEY=your-openai-api-key-if-available

# Optional: Google OAuth
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## 5. Firebase 설정

### 5.1 Firebase CLI 설치 및 로그인
```bash
# Firebase CLI 설치 (전역)
npm install -g firebase-tools

# Firebase 로그인
firebase login

# 프로젝트 목록 확인
firebase projects:list

# 프로젝트 연결
firebase use your-project-id
```

### 5.2 Firebase 에뮬레이터 실행
```bash
# Firebase 에뮬레이터 시작
firebase emulators:start

# 또는 특정 서비스만
firebase emulators:start --only functions,firestore,storage
```

## 6. 개발 서버 실행

### 6.1 터미널 설정
VS Code에서 터미널을 여러 개 열어서 다음을 각각 실행:

**터미널 1 - 프론트엔드 개발 서버:**
```bash
npm run dev
```

**터미널 2 - Firebase 에뮬레이터 (선택사항):**
```bash
firebase emulators:start
```

**터미널 3 - Functions 빌드 감시:**
```bash
cd functions
npm run build:watch  # 또는 npm run build
```

## 7. 프로젝트 구조 이해

```
voice-journal/
├── .github/workflows/          # GitHub Actions
├── .vscode/                   # VS Code 설정
├── functions/                 # Firebase Cloud Functions
│   ├── src/index.ts          # Functions 소스코드
│   └── lib/                  # 컴파일된 JS
├── public/                   # 정적 파일
├── src/                      # React 소스코드
│   ├── domains/             # 도메인별 코드 구조
│   │   ├── auth/           # 인증 관련
│   │   ├── journaling/     # 음성일기 기능
│   │   └── security/       # 암호화 기능
│   ├── lib/                # 설정 및 유틸리티
│   └── pages/              # 페이지 컴포넌트
├── .env.local              # 환경 변수 (생성 필요)
├── .firebaserc            # Firebase 프로젝트 설정
├── firebase.json          # Firebase 서비스 설정
├── firestore.rules        # Firestore 보안 규칙
└── storage.rules          # Storage 보안 규칙
```

## 8. 주요 명령어 정리

### 8.1 개발 명령어
```bash
# 개발 서버 시작
npm run dev

# 프로덕션 빌드
npm run build

# 타입 체크
npm run type-check

# 린트 검사
npm run lint
```

### 8.2 Firebase 명령어
```bash
# Functions 빌드
cd functions && npm run build

# Firebase 배포
firebase deploy

# Functions만 배포
firebase deploy --only functions

# 에뮬레이터 시작
firebase emulators:start
```

## 9. 디버깅 팁

### 9.1 브라우저 디버깅
- Chrome DevTools에서 Network 탭으로 Firebase 요청 확인
- Console에서 Firebase 초기화 로그 확인
- Application 탭에서 IndexedDB, LocalStorage 확인

### 9.2 VS Code 디버깅
- F5를 눌러 디버그 모드 실행
- 중단점 설정으로 코드 흐름 추적
- Debug Console에서 변수 값 확인

### 9.3 Firebase 디버깅
```bash
# Functions 로그 확인
firebase functions:log

# 특정 Function 로그
firebase functions:log --only functionName
```

## 10. Git 워크플로우

### 10.1 브랜치 전략
```bash
# 새 기능 개발
git checkout -b feature/new-feature
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# main 브랜치로 병합 후 배포
git checkout main
git merge feature/new-feature
git push origin main  # 자동 배포 트리거
```

## 11. 문제 해결

### 11.1 자주 발생하는 문제
- **Firebase 연결 오류**: `.env.local` 환경 변수 확인
- **빌드 오류**: `npm install --legacy-peer-deps` 재실행
- **타입 오류**: `npm run type-check` 실행
- **포트 충돌**: 다른 포트 사용 (`npm run dev -- --port 3001`)

### 11.2 유용한 VS Code 단축키
- `Ctrl+Shift+P`: 명령 팔레트
- `Ctrl+```: 터미널 열기
- `Ctrl+Shift+E`: 파일 탐색기
- `F5`: 디버그 시작
- `Ctrl+Shift+F`: 전체 검색

이 가이드를 따라하시면 VS Code에서 Voice Journal 프로젝트를 완벽하게 개발할 수 있습니다!