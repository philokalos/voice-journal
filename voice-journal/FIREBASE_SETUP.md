# Firebase Storage 설정 가이드

## 📋 개요
음성 파일을 클라우드에 저장하기 위해 Firebase Storage를 사용합니다.

## 🚀 Firebase 프로젝트 생성

### 1. Firebase 콘솔 접속
1. https://console.firebase.google.com 접속
2. Google 계정으로 로그인
3. "프로젝트 추가" 클릭

### 2. 프로젝트 설정
1. **프로젝트 이름**: `voice-journal` (또는 원하는 이름)
2. **Google Analytics**: 선택사항 (권장: 사용 안함)
3. 프로젝트 생성 완료

### 3. Storage 설정
1. Firebase 콘솔에서 "Storage" 메뉴 클릭
2. "시작하기" 클릭
3. **보안 규칙 설정**:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /voices/{userId}/{entryId}/{allPaths=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
4. **Storage 위치**: 가까운 지역 선택 (예: asia-northeast3)

### 4. 웹 앱 설정
1. 프로젝트 설정 → "일반" 탭
2. "앱 추가" → 웹 앱 선택
3. **앱 닉네임**: `voice-journal-web`
4. Firebase Hosting 설정 체크 해제
5. 앱 등록

### 5. 구성 정보 복사
앱 등록 후 표시되는 구성 정보를 복사:
```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## 🔧 환경 변수 설정

### 로컬 개발용 (.env.local)
```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

### Vercel 배포용
Vercel 대시보드 → Settings → Environment Variables에 위 값들을 추가

## 🔐 보안 설정

### Storage 보안 규칙
- 인증된 사용자만 자신의 파일에 접근 가능
- 파일 경로: `/voices/{userId}/{entryId}/{timestamp}.webm`
- 최대 파일 크기: 10MB (필요시 조정 가능)

### CORS 설정
Firebase Storage는 자동으로 CORS를 처리하므로 별도 설정 불필요

## 📊 사용량 모니터링

### Storage 사용량 확인
1. Firebase 콘솔 → Storage
2. "사용량" 탭에서 저장소 사용량 확인
3. "할당량" 탭에서 한도 설정 가능

### 무료 할당량
- **저장소**: 5GB
- **다운로드**: 1GB/일
- **업로드**: 20,000회/일

## 🛠️ 트러블슈팅

### 업로드 실패 시
1. Firebase 구성 정보 확인
2. Storage 보안 규칙 확인
3. 사용자 인증 상태 확인
4. 네트워크 연결 상태 확인

### 파일 재생 실패 시
1. CORS 설정 확인
2. 파일 URL 유효성 확인
3. 브라우저 개발자 도구에서 에러 확인

## 📝 참고사항
- 음성 파일 형식: WebM (브라우저 호환성 최적)
- 파일명 규칙: `{timestamp}.webm`
- 자동 삭제: 현재 미구현 (향후 추가 예정)