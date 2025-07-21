# GitHub Actions Firebase 자동 배포 설정

## 1. Firebase 서비스 계정 생성

### 1.1 Firebase Console 접속
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택 (또는 새 프로젝트 생성)
3. 좌측 상단 톱니바퀴 아이콘 → "프로젝트 설정" 클릭

### 1.2 서비스 계정 생성
1. "서비스 계정" 탭 클릭
2. "새 비공개 키 생성" 버튼 클릭
3. "키 생성" 확인 → JSON 파일 자동 다운로드
4. **중요**: 이 JSON 파일을 안전하게 보관 (다시 다운로드 불가)

### 1.3 서비스 계정 권한 확인
생성된 서비스 계정이 다음 권한을 가지고 있는지 확인:
- Firebase Admin SDK Administrator Service Agent
- Cloud Functions Developer
- Firebase Rules Admin

## 2. GitHub Repository Secrets 설정

### 2.1 GitHub Repository 접속
1. https://github.com/your-username/voice-journal 접속
2. "Settings" 탭 클릭
3. 좌측 메뉴에서 "Secrets and variables" → "Actions" 클릭

### 2.2 필수 Secrets 추가

**FIREBASE_SERVICE_ACCOUNT**
- "New repository secret" 클릭
- Name: `FIREBASE_SERVICE_ACCOUNT`
- Secret: 다운로드받은 JSON 파일의 전체 내용 복사 붙여넣기
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

**FIREBASE_PROJECT_ID**
- Name: `FIREBASE_PROJECT_ID`
- Secret: Firebase 프로젝트 ID (예: voice-journal-prod)

**선택적 Secrets (필요시 추가)**
- `VITE_FIREBASE_API_KEY`: Firebase 웹 API 키
- `VITE_OPENAI_API_KEY`: OpenAI API 키 (AI 기능용)
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth 클라이언트 ID

## 3. Firebase 프로젝트 설정

### 3.1 Firebase 프로젝트 생성 (아직 없다면)
1. Firebase Console에서 "프로젝트 추가" 클릭
2. 프로젝트 이름: `voice-journal-prod`
3. Google Analytics 설정 (선택사항)
4. 프로젝트 생성 완료

### 3.2 필수 서비스 활성화
**Authentication**
1. Authentication → "시작하기"
2. Sign-in method에서 "이메일/비밀번호", "Google" 활성화

**Firestore Database**
1. Firestore Database → "데이터베이스 만들기"
2. "테스트 모드에서 시작" 선택
3. 위치: asia-northeast3 (Seoul) 권장

**Storage**
1. Storage → "시작하기"
2. 기본 보안 규칙으로 시작
3. 위치: asia-northeast3 (Seoul) 권장

**Cloud Functions**
1. Functions → "시작하기"
2. Node.js 런타임 선택

### 3.3 웹 앱 등록
1. 프로젝트 설정 → "내 앱" 섹션
2. "웹 앱 추가" (</> 아이콘) 클릭
3. 앱 닉네임: `voice-journal-web`
4. Firebase Hosting 설정은 체크 해제 (Vercel 사용)
5. 설정 정보 복사해서 별도 저장

## 4. 로컬 .firebaserc 파일 생성

프로젝트 루트에 `.firebaserc` 파일 생성:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

## 5. GitHub Actions 워크플로우 확인

`.github/workflows/firebase-deploy.yml` 파일이 이미 생성되어 있습니다.
이 파일이 다음을 자동으로 처리합니다:

- ✅ 코드 체크아웃
- ✅ Node.js 환경 설정
- ✅ 의존성 설치
- ✅ 프로젝트 빌드
- ✅ Firebase Functions 배포
- ✅ Firestore 규칙 배포
- ✅ Storage 규칙 배포

## 6. 배포 테스트

### 6.1 자동 배포 트리거
```bash
# 변경사항을 main 브랜치에 push하면 자동 배포
git add .
git commit -m "Setup GitHub Actions Firebase deployment"
git push origin main
```

### 6.2 배포 상태 확인
1. GitHub Repository → "Actions" 탭에서 워크플로우 실행 상태 확인
2. Firebase Console → Functions에서 배포된 함수 확인
3. 웹 앱에서 기능 테스트

## 7. 환경 변수 설정 (Vercel)

Vercel Dashboard에서 환경 변수 추가:

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 선택 → Settings → Environment Variables
3. Firebase 설정값 추가:

```
VITE_FIREBASE_API_KEY = AIza...
VITE_FIREBASE_AUTH_DOMAIN = your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID = your-project-id
VITE_FIREBASE_STORAGE_BUCKET = your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID = 123456789
VITE_FIREBASE_APP_ID = 1:123456789:web:abcdef
```

## 8. 완료 체크리스트

- [ ] Firebase 프로젝트 생성
- [ ] Authentication, Firestore, Storage 서비스 활성화
- [ ] 웹 앱 등록 및 설정 정보 획득
- [ ] Firebase 서비스 계정 생성 및 JSON 파일 다운로드
- [ ] GitHub Repository Secrets 설정
  - [ ] FIREBASE_SERVICE_ACCOUNT
  - [ ] FIREBASE_PROJECT_ID
- [ ] `.firebaserc` 파일 생성
- [ ] Vercel 환경 변수 설정
- [ ] Git push로 자동 배포 테스트
- [ ] Firebase Console에서 Functions 배포 확인
- [ ] 웹 앱 기능 테스트

## 9. 문제 해결

### GitHub Actions 실패시
1. Actions 탭에서 로그 확인
2. Secrets 설정 재확인
3. Firebase 프로젝트 권한 확인

### Functions 배포 실패시
- 함수 메모리/타임아웃 설정 확인
- 의존성 버전 충돌 확인
- Firebase 규칙 권한 확인

이 설정 완료 후 코드 변경시마다 자동으로 Firebase에 배포됩니다!