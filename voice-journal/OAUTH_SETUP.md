# OAuth 연동 설정 가이드

Voice Journal의 Google Sheets와 Notion 연동을 위한 OAuth 설정 가이드입니다.

## 1. Google OAuth 클라이언트 설정

### 1-1. Google Cloud Console 설정

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/ 접속
   - Firebase 프로젝트와 연결된 GCP 프로젝트 선택

2. **API 및 서비스 > 사용자 인증 정보**
   - 왼쪽 메뉴에서 "API 및 서비스" → "사용자 인증 정보" 클릭
   - "사용자 인증 정보 만들기" → "OAuth 클라이언트 ID" 선택

3. **애플리케이션 유형 선택**
   - "웹 애플리케이션" 선택
   - 이름: "Voice Journal - Google Sheets Integration"

4. **승인된 리디렉션 URI 설정**
   ```
   개발환경: http://localhost:5173/oauth/google/callback
   프로덕션: https://your-app-domain.com/oauth/google/callback
   ```

5. **Google Sheets API 활성화**
   - "API 및 서비스" → "라이브러리"
   - "Google Sheets API" 검색하여 활성화
   - "Google Drive API"도 활성화 (파일 생성용)

### 1-2. OAuth 동의 화면 설정

1. **OAuth 동의 화면 구성**
   - "API 및 서비스" → "OAuth 동의 화면"
   - 사용자 유형: "외부" 선택 (개인 프로젝트의 경우)

2. **앱 정보 입력**
   ```
   앱 이름: Voice Journal
   사용자 지원 이메일: your-email@gmail.com
   개발자 연락처 정보: your-email@gmail.com
   ```

3. **범위 추가**
   - "범위 추가 또는 삭제" 클릭
   - 다음 범위들 추가:
     - `https://www.googleapis.com/auth/spreadsheets`
     - `https://www.googleapis.com/auth/drive.file`

## 2. Notion OAuth 앱 설정 (2024년 최신 버전)

### 2-1. Notion 개발자 포털 설정

1. **Notion 개발자 포털 접속**
   - https://www.notion.so/my-integrations 접속
   - Notion 계정으로 로그인

2. **새 통합 만들기**
   - "새 통합" 또는 "New integration" 클릭
   - 기본 정보 입력:
     ```
     이름: Voice Journal Integration
     설명: Voice journal entries sync to Notion database
     워크스페이스: 연동할 워크스페이스 선택
     ```

3. **사용권한(Capabilities) 설정 ⭐ 새로운 기능**
   - **콘텐츠 기능:**
     - ✅ 페이지 읽기 (Read content)
     - ✅ 페이지 업데이트 (Update content)  
     - ✅ 페이지 삽입 (Insert content)
   
   - **사용자 정보:** (선택사항)
     - □ 사용자 정보 읽기 (Read user information)
   
   - **댓글 기능:** (선택사항)
     - □ 댓글 읽기 (Read comments)
     - □ 댓글 삽입 (Insert comments)

4. **OAuth 설정**
   - "OAuth" 탭으로 이동
   - "OAuth 활성화" 토글을 켜기
   
   **Redirect URIs 설정:**
   ```
   개발환경: http://localhost:5173/oauth/notion/callback
   스테이징: https://voice-journal-staging.vercel.app/oauth/notion/callback
   프로덕션: https://voice-journal.vercel.app/oauth/notion/callback
   Firebase: https://voice-journal-native.web.app/oauth/notion/callback
   ```

5. **OAuth 도메인 설정**
   - **허용된 도메인:** 
     ```
     localhost:5173
     voice-journal.vercel.app  
     voice-journal-staging.vercel.app
     voice-journal-native.web.app
     ```

6. **중요 정보 복사 📋**
   - **OAuth client ID** (공개키) - 클라이언트에서 사용
   - **OAuth client secret** (비밀키) - 서버에서만 사용
   - **Internal Integration Token** (내부 토큰) - 직접 API 호출시 사용

### 2-2. 새로운 "사용권한" 기능 상세 설명

Notion의 새로운 **사용권한(Permissions)** 시스템은 보안을 강화하기 위해 도입되었습니다:

**📚 콘텐츠 권한:**
- **Read content**: 페이지, 데이터베이스, 블록 읽기
- **Update content**: 기존 페이지/데이터베이스 수정  
- **Insert content**: 새 페이지/데이터베이스/블록 생성

**👤 사용자 권한:**
- **Read user information**: 사용자 프로필, 이메일 정보 접근
- **Read user information without email**: 이메일 제외 사용자 정보

**💬 댓글 권한:**
- **Read comments**: 댓글 읽기
- **Insert comments**: 새 댓글 작성

**🔍 Voice Journal에 필요한 최소 권한:**
```
✅ Read content        (기존 데이터베이스 구조 읽기)
✅ Update content      (기존 일기 엔트리 수정)  
✅ Insert content      (새 일기 엔트리 생성)
❌ User information    (선택사항 - 사용자 식별용)
❌ Comments           (선택사항 - 일기에 댓글 기능 원할 경우)
```

### 2-3. 데이터베이스 연결 설정

OAuth 인증 후에는 추가로 **데이터베이스 공유** 설정이 필요합니다:

1. **Notion 데이터베이스 생성**
   - 새 페이지 생성 → "데이터베이스" 선택
   - 데이터베이스 이름: "Voice Journal Entries"

2. **필요한 속성(Properties) 추가**
   ```
   - Title (제목) - Title 타입
   - Date (날짜) - Date 타입  
   - Content (내용) - Rich text 타입
   - Sentiment Score (감정 점수) - Number 타입
   - Keywords (키워드) - Multi-select 타입
   - Wins (성취) - Rich text 타입
   - Regrets (후회) - Rich text 타입
   - Tasks (할일) - Rich text 타입
   ```

3. **통합 앱과 데이터베이스 연결**
   - 데이터베이스 우측 상단 "..." 메뉴 클릭
   - "연결 추가" → "Voice Journal Integration" 선택
   - 권한 확인 후 "허용" 클릭

## 3. Firebase Functions 환경 변수 설정

### 3-1. Firebase CLI를 통한 환경 변수 설정

1. **Firebase CLI 설치 및 로그인**
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use your-project-id
   ```

2. **Google OAuth 설정**
   ```bash
   # Google OAuth 클라이언트 ID 설정
   firebase functions:config:set google.client_id="your-google-client-id"
   
   # Google OAuth 클라이언트 시크릿 설정  
   firebase functions:config:set google.client_secret="your-google-client-secret"
   
   # Google OAuth 리디렉션 URI 설정
   firebase functions:config:set google.redirect_uri="https://your-domain.com/oauth/google/callback"
   ```

3. **Notion OAuth 설정**
   ```bash
   # Notion OAuth 클라이언트 ID 설정
   firebase functions:config:set notion.client_id="your-notion-client-id"
   
   # Notion OAuth 클라이언트 시크릿 설정
   firebase functions:config:set notion.client_secret="your-notion-client-secret"
   
   # Notion OAuth 리디렉션 URI 설정  
   firebase functions:config:set notion.redirect_uri="https://your-domain.com/oauth/notion/callback"
   ```

4. **설정 확인**
   ```bash
   firebase functions:config:get
   ```

### 3-2. 로컬 개발 환경 설정

1. **functions/.runtimeconfig.json 생성**
   ```bash
   cd functions
   firebase functions:config:get > .runtimeconfig.json
   ```

2. **환경 변수 파일 생성 (선택사항)**
   ```bash
   # functions/.env 파일 생성
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret  
   GOOGLE_REDIRECT_URI=http://localhost:5173/oauth/google/callback
   
   NOTION_CLIENT_ID=your-notion-client-id
   NOTION_CLIENT_SECRET=your-notion-client-secret
   NOTION_REDIRECT_URI=http://localhost:5173/oauth/notion/callback
   ```

## 4. 배포 및 테스트

### 4-1. Firebase Functions 배포

```bash
# Functions 디렉토리로 이동
cd functions

# 의존성 설치 (필요시)
npm install

# Functions 빌드
npm run build

# Firebase에 배포
firebase deploy --only functions

# 특정 함수만 배포 (필요시)
firebase deploy --only functions:googleSheetsOAuth,functions:notionOAuth
```

### 4-2. 프론트엔드 배포

```bash
# 메인 프로젝트 루트로 이동
cd ..

# 프로덕션 빌드
npm run build

# Firebase Hosting에 배포 (설정되어 있는 경우)
firebase deploy --only hosting

# 또는 Vercel 배포
vercel --prod
```

### 4-3. 환경별 설정 관리

#### 개발 환경 (localhost)
```bash
# 리디렉션 URI 설정
firebase functions:config:set google.redirect_uri="http://localhost:5173/oauth/google/callback"
firebase functions:config:set notion.redirect_uri="http://localhost:5173/oauth/notion/callback"
```

#### 프로덕션 환경
```bash
# 실제 도메인으로 설정
firebase functions:config:set google.redirect_uri="https://your-app-domain.com/oauth/google/callback" 
firebase functions:config:set notion.redirect_uri="https://your-app-domain.com/oauth/notion/callback"
```

### 4-4. 테스트 절차

1. **OAuth 설정 확인**
   ```bash
   # 설정된 환경 변수 확인
   firebase functions:config:get
   ```

2. **로컬 테스트**
   ```bash
   # 개발 서버 실행
   npm run dev
   
   # Settings 페이지에서 연동 버튼 클릭 테스트
   # http://localhost:5173/settings
   ```

3. **Functions 로그 확인**
   ```bash
   # 실시간 로그 모니터링
   firebase functions:log --only googleSheetsOAuth,notionOAuth
   ```

## 5. 문제 해결 가이드

### 5-1. "OAuth not configured" 오류
```bash
# 환경 변수가 제대로 설정되었는지 확인
firebase functions:config:get

# 설정이 없다면 다시 설정
firebase functions:config:set google.client_id="your-client-id"
firebase deploy --only functions
```

### 5-2. CORS 오류
- Google/Notion 개발자 콘솔에서 허용된 도메인 확인
- 리디렉션 URI가 정확히 일치하는지 확인

### 5-3. 팝업 차단 오류
- 브라우저에서 팝업 허용 설정
- 또는 새 탭에서 OAuth 플로우 진행

## 6. 보안 고려사항

### 6-1. 환경 변수 보안
- `.runtimeconfig.json`을 `.gitignore`에 추가
- 클라이언트 시크릿은 절대 프론트엔드에 노출하지 말 것

### 6-2. HTTPS 사용
- 프로덕션에서는 반드시 HTTPS 사용
- OAuth 리디렉션 URI도 HTTPS로 설정

### 6-3. 토큰 저장
- Firebase Firestore의 보안 규칙 설정
- 토큰 암호화 고려 (선택사항)

## 7. 추가 기능

### 7-1. 자동 동기화 설정
- 일기 작성 시 자동으로 Google Sheets/Notion에 동기화
- 주기적 동기화 스케줄러 구현

### 7-2. 데이터 매핑 커스터마이징
- 사용자가 원하는 필드만 동기화하도록 설정
- 데이터 변환 규칙 추가

### 7-3. 에러 복구 시스템
- 동기화 실패 시 자동 재시도
- 사용자에게 상세한 오류 정보 제공