# Apple Sign-In Setup Guide

Apple Sign-In을 Firebase Auth와 연동하기 위한 설정 가이드입니다.

## 1. Apple Developer Console 설정

### 1.1 App ID 생성
1. [Apple Developer Console](https://developer.apple.com/account/)에 로그인
2. **Certificates, Identifiers & Profiles** → **Identifiers** 이동
3. **App IDs** 선택 후 **+** 버튼 클릭
4. **App** 선택 후 Continue
5. 다음 정보 입력:
   - **Description**: Voice Journal App
   - **Bundle ID**: `com.voicejournal.app` (실제 번들 ID 사용)
6. **Capabilities**에서 **Sign In with Apple** 체크
7. **Continue** → **Register** 클릭

### 1.2 Service ID 생성
1. **Identifiers** → **Services IDs** 선택
2. **+** 버튼 클릭
3. **Services IDs** 선택 후 Continue
4. 다음 정보 입력:
   - **Description**: Voice Journal Web Service
   - **Identifier**: `com.voicejournal.web` (고유한 식별자)
5. **Sign In with Apple** 체크
6. **Configure** 버튼 클릭
7. **Primary App ID**: 위에서 생성한 App ID 선택
8. **Website URLs** 섹션에서:
   - **Domains**: `your-app-domain.com` (실제 도메인)
   - **Return URLs**: `https://your-project-id.firebaseapp.com/__/auth/handler`
9. **Save** → **Continue** → **Register**

### 1.3 Private Key 생성
1. **Keys** 섹션으로 이동
2. **+** 버튼 클릭
3. **Key Name**: Voice Journal Apple Auth Key
4. **Sign In with Apple** 체크
5. **Configure** 클릭하여 Primary App ID 선택
6. **Save** → **Continue** → **Register**
7. **Download** 버튼으로 .p8 파일 다운로드
8. **Key ID** 기록해두기 (나중에 필요)

## 2. Firebase Console 설정

### 2.1 Apple 인증 공급업체 활성화
1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 선택
2. **Authentication** → **Sign-in method** 이동
3. **Apple** 클릭하여 활성화
4. 다음 정보 입력:
   - **Service ID**: 위에서 생성한 Service ID (`com.voicejournal.web`)
   - **Apple Team ID**: Developer Account에서 확인 가능
   - **Key ID**: 위에서 기록한 Key ID
   - **Private Key**: 다운로드한 .p8 파일 내용 복사
5. **Save** 클릭

### 2.2 OAuth 리디렉션 도메인 추가
1. **Sign-in method** → **Authorized domains** 섹션
2. 필요한 도메인 추가:
   - `localhost` (개발용)
   - `your-app-domain.com` (프로덕션용)

## 3. 환경 변수 설정

Firebase 설정이 올바르게 되어 있는지 확인:

```typescript
// firebase.ts에서 이미 설정된 경우
const config = {
  apiKey: "your-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  // ... 기타 설정
}
```

## 4. 테스트

### 4.1 로컬 개발 환경
- `https://localhost:3000`에서 테스트 (HTTPS 필요)
- iOS Safari 또는 Chrome에서 Apple 로그인 테스트

### 4.2 프로덕션 환경
- 실제 도메인에서 Apple 로그인 플로우 테스트
- iOS 기기에서 직접 테스트

## 5. 주의사항

1. **HTTPS 필수**: Apple Sign-In은 HTTPS 환경에서만 작동
2. **iOS Safari 지원**: iOS에서 가장 잘 작동
3. **도메인 검증**: Apple Developer Console의 도메인과 Firebase의 도메인이 일치해야 함
4. **Private Key 보안**: .p8 파일은 안전하게 보관하고 버전 관리에 포함하지 말 것

## 6. 문제 해결

### 일반적인 오류들:
- **Invalid client**: Service ID 또는 도메인 설정 확인
- **Invalid grant**: Private Key나 Key ID 확인
- **Unauthorized domain**: Firebase Console의 승인된 도메인 확인

### 디버깅 팁:
- Chrome DevTools의 Network 탭에서 인증 요청 확인
- Firebase Auth 에뮬레이터 사용하여 로컬 테스트
- Apple Developer Console의 로그 확인

## 7. 코드 사용법

Apple Sign-In이 설정되면 컴포넌트에서 다음과 같이 사용:

```tsx
import { OAuthButton } from '../domains/auth/components/OAuthButton'

function LoginPage() {
  return (
    <div>
      <OAuthButton 
        onSuccess={() => console.log('로그인 성공')}
        onError={(error) => console.error('로그인 실패:', error)}
      />
    </div>
  )
}
```

Apple Sign-In 버튼이 자동으로 표시되며, 설정이 완료되면 정상적으로 작동합니다.