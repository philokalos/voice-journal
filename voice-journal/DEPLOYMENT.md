# 배포 가이드

## 🚀 Vercel 배포 (권장)

### 1. GitHub 저장소 생성 및 푸시
```bash
# Git 초기화 (아직 안 했다면)
git init
git add .
git commit -m "🎉 Initial commit: Voice Journal MVP"

# GitHub에 저장소 생성 후
git remote add origin https://github.com/yourusername/voice-journal.git
git branch -M main
git push -u origin main
```

### 2. Vercel 배포
1. https://vercel.com 방문
2. GitHub 계정으로 로그인
3. "New Project" 클릭
4. GitHub 저장소 선택
5. 환경 변수 설정:
   - `VITE_SUPABASE_URL`: Supabase 프로젝트 URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase Anon Key
   - `VITE_FIREBASE_API_KEY`: Firebase API Key
   - `VITE_FIREBASE_AUTH_DOMAIN`: Firebase Auth Domain
   - `VITE_FIREBASE_PROJECT_ID`: Firebase Project ID
   - `VITE_FIREBASE_STORAGE_BUCKET`: Firebase Storage Bucket
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`: Firebase Messaging Sender ID
   - `VITE_FIREBASE_APP_ID`: Firebase App ID
6. Deploy 클릭

### 3. 환경 변수 설정
Vercel 대시보드 → Settings → Environment Variables:
```
# Supabase 설정
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Firebase 설정 (음성 파일 저장용)
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# AI 분석 (선택적)
VITE_OPENAI_API_KEY=your-openai-api-key
VITE_ANTHROPIC_API_KEY=your-anthropic-api-key

# Supabase Edge Functions (서버사이드)
OPENAI_API_KEY=your-openai-api-key-for-functions
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# 구글 시트 연동 (선택적)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

## 🔧 Netlify 배포 (대안)

### 1. Netlify CLI 설치
```bash
npm install -g netlify-cli
```

### 2. 빌드 및 배포
```bash
npm run build
netlify deploy --prod --dir=dist
```

## 📱 PWA 기능
- ✅ 자동 SW 등록
- ✅ 오프라인 지원
- ✅ 모바일 설치 가능

## 🌐 도메인 설정
배포 후 Supabase에서 Site URL 업데이트:
1. Supabase 대시보드 → Authentication → Settings
2. Site URL: `https://your-app.vercel.app`
3. Additional Redirect URLs 추가

## 🔐 보안 설정
- ✅ CORS 헤더 설정됨
- ✅ Frame 보호 설정됨
- ✅ Content-Type 보호 설정됨

## 📊 성능 최적화
- ✅ Vite 번들 최적화
- ✅ 이미지 lazy loading
- ✅ 가상화된 리스트
- ✅ React Query 캐싱