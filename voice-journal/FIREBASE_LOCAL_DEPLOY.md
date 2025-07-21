# Firebase 로컬 배포 가이드

## 방법 1: 브라우저에서 직접 로그인 (권장)

로컬 컴퓨터에서 브라우저를 통해 Firebase에 로그인:

```bash
# 로컬 컴퓨터에서 실행
firebase login

# 로그인 성공 후 CI 토큰 생성
firebase login:ci
```

생성된 토큰을 복사해서 서버에서 사용:

```bash
# 서버에서 토큰으로 로그인
export FIREBASE_TOKEN="your-token-here"
firebase deploy --token "$FIREBASE_TOKEN"
```

## 방법 2: 서비스 계정 사용

### 1. Firebase Console에서 서비스 계정 생성

1. [Firebase Console](https://console.firebase.google.com/) → 프로젝트 설정
2. "서비스 계정" 탭 클릭
3. "새 비공개 키 생성" 클릭
4. JSON 파일 다운로드

### 2. 서비스 계정 키 설정

```bash
# 서비스 계정 키 파일을 안전한 위치에 저장
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# 또는 Firebase 특정 환경 변수 사용
export FIREBASE_SERVICE_ACCOUNT="/path/to/service-account-key.json"
```

### 3. 배포 실행

```bash
cd /home/zenbook1/voice-journal

# 프로젝트 ID 설정
firebase use your-project-id

# 배포 실행
firebase deploy
```

## 방법 3: GitHub Actions 자동 배포

### 1. Repository Secrets 설정

GitHub Repository → Settings → Secrets and variables → Actions에서 추가:

- `FIREBASE_SERVICE_ACCOUNT`: 서비스 계정 JSON 전체 내용
- `FIREBASE_PROJECT_ID`: Firebase 프로젝트 ID

### 2. 자동 배포 트리거

```bash
# main 브랜치에 push하면 자동 배포
git push origin main
```

## 임시 해결방법: 수동 업로드

Firebase CLI 없이도 Functions 코드를 수동으로 업로드할 수 있습니다:

### 1. Functions 소스 코드 압축

```bash
cd /home/zenbook1/voice-journal/functions
npm run build
tar -czf functions.tar.gz lib/ package.json
```

### 2. Firebase Console에서 수동 배포

1. Firebase Console → Functions
2. "함수 만들기" 또는 기존 함수 편집
3. 소스 코드 업로드
4. 트리거 설정 (HTTP, Firestore 등)

## 권장 방법

**가장 간단한 방법:**
1. 로컬 컴퓨터에서 `firebase login` 실행
2. `firebase login:ci`로 토큰 생성
3. 서버에서 토큰으로 배포

**장기적 방법:**
- GitHub Actions 자동 배포 설정
- 코드 변경 시 자동으로 Firebase에 배포