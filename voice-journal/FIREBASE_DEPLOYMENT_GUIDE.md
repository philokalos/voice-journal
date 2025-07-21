# Firebase 배포 설정 가이드

## 1. Firebase Console 설정

### 1.1 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름: `voice-journal-prod` (또는 원하는 이름)
4. 프로젝트 ID: 고유한 ID 생성됨 (기록해둘 것)

### 1.2 Authentication 설정
1. 좌측 메뉴에서 "Authentication" 클릭
2. "시작하기" 클릭
3. "Sign-in method" 탭에서 다음 제공업체 활성화:
   - **이메일/비밀번호**: 사용 설정
   - **Google**: 사용 설정
   - **Apple** (선택사항): 추후 설정 가능

### 1.3 Firestore Database 설정
1. 좌측 메뉴에서 "Firestore Database" 클릭
2. "데이터베이스 만들기" 클릭
3. 보안 규칙 설정:
   - "테스트 모드에서 시작" 선택 (나중에 production 규칙 적용)
4. 위치 선택: `asia-northeast3 (Seoul)` 권장

### 1.4 Storage 설정
1. 좌측 메뉴에서 "Storage" 클릭
2. "시작하기" 클릭
3. 보안 규칙: 기본값 사용 (나중에 수정)
4. 위치: `asia-northeast3 (Seoul)` 권장

### 1.5 Functions 설정
1. 좌측 메뉴에서 "Functions" 클릭
2. "시작하기" 클릭
3. Node.js 업그레이드 알림이 나오면 "업그레이드" 선택

## 2. 프로젝트 설정 파일 생성

### 2.1 Firebase 설정 가져오기
1. Firebase Console에서 프로젝트 설정 (톱니바퀴 아이콘) 클릭
2. "일반" 탭에서 "내 앱" 섹션으로 스크롤
3. "웹 앱 추가" 클릭 (</> 아이콘)
4. 앱 닉네임: `voice-journal-web`
5. "Firebase Hosting 설정" 체크박스는 해제 (Vercel 사용)
6. "앱 등록" 클릭
7. **중요**: 설정 객체 복사해서 저장

### 2.2 환경 변수 파일 생성
프로젝트 루트에 `.env.local` 파일 생성:

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

# Optional: Google OAuth (for sheets integration)
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## 3. CLI 설정

### 3.1 Firebase CLI 설치 및 로그인
```bash
# CLI 설치
npm install -g firebase-tools

# Firebase 로그인
firebase login

# 프로젝트 목록 확인
firebase projects:list
```

### 3.2 프로젝트 연결
```bash
# 프로젝트 루트 디렉토리에서
cd /path/to/voice-journal

# Firebase 프로젝트 연결
firebase use --add

# 프로젝트 ID 입력하고 alias 설정 (예: prod)
# 또는 직접 설정:
firebase use your-project-id
```

### 3.3 .firebaserc 파일 확인
프로젝트 연결 후 생성되는 `.firebaserc` 파일:
```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

## 4. 보안 규칙 배포

### 4.1 Firestore 규칙 배포
```bash
firebase deploy --only firestore:rules
```

### 4.2 Storage 규칙 배포
```bash
firebase deploy --only storage
```

## 5. Cloud Functions 배포

### 5.1 Functions 의존성 설치
```bash
cd functions
npm install
```

### 5.2 Functions 환경 변수 설정
Cloud Functions에서 사용할 환경 변수 설정:
```bash
# OpenAI API Key (선택사항)
firebase functions:config:set openai.api_key="your-openai-api-key"

# Google OAuth 설정 (선택사항)
firebase functions:config:set google.client_id="your-client-id"
firebase functions:config:set google.client_secret="your-client-secret"
```

### 5.3 Functions 배포
```bash
# 프로젝트 루트에서
firebase deploy --only functions
```

## 6. Vercel 환경 변수 설정

### 6.1 Vercel Dashboard 설정
1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 선택
3. "Settings" → "Environment Variables" 클릭
4. Firebase 설정값들을 하나씩 추가:

```
VITE_FIREBASE_API_KEY = your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN = your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID = your-project-id
VITE_FIREBASE_STORAGE_BUCKET = your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID = 123456789
VITE_FIREBASE_APP_ID = 1:123456789:web:abcdef123456
```

### 6.2 환경 설정
- Environment: `Production`, `Preview`, `Development` 모두 체크
- Type: `Plain Text` (암호화된 값이 아닌 경우)

## 7. 배포 확인

### 7.1 Functions 동작 확인
```bash
# Functions 로그 확인
firebase functions:log

# 특정 Function 로그 확인
firebase functions:log --only logEntryAudit
```

### 7.2 Firestore 데이터 확인
Firebase Console → Firestore Database에서 데이터 저장 확인

### 7.3 Storage 파일 확인
Firebase Console → Storage에서 암호화된 오디오 파일 업로드 확인

## 8. 문제 해결

### 8.1 권한 오류
```bash
# Firebase 프로젝트 권한 확인
firebase projects:list

# 다시 로그인
firebase logout
firebase login
```

### 8.2 Functions 배포 오류
```bash
# Functions 로그 확인
firebase functions:log

# 특정 region 설정
firebase deploy --only functions --project your-project-id
```

### 8.3 CORS 오류
Functions에서 CORS 설정이 필요한 경우:
```javascript
// functions/src/index.ts에 추가
import * as cors from 'cors';
const corsHandler = cors({origin: true});
```

## 9. 완료 체크리스트

- [ ] Firebase 프로젝트 생성
- [ ] Authentication 설정 (Email, Google)
- [ ] Firestore Database 생성
- [ ] Storage 설정
- [ ] 웹 앱 등록 및 설정 정보 획득
- [ ] `.env.local` 파일 생성
- [ ] Firebase CLI 설치 및 로그인
- [ ] 프로젝트 연결 (`firebase use`)
- [ ] Firestore 규칙 배포
- [ ] Storage 규칙 배포
- [ ] Cloud Functions 배포
- [ ] Vercel 환경 변수 설정
- [ ] 전체 기능 테스트

## 10. 보안 권장사항

1. **API 키 보안**: Firebase API 키는 클라이언트에서 사용되므로 도메인 제한 설정
2. **Firestore 규칙**: Production에서는 반드시 엄격한 보안 규칙 적용
3. **Functions 권한**: 최소 권한 원칙 적용
4. **환경 변수**: 민감한 정보는 Vercel과 Firebase에서만 설정

이 가이드를 따라하면 Voice Journal 애플리케이션이 완전히 배포됩니다!