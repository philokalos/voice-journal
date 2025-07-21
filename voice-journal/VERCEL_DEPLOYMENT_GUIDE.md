# Vercel Deployment Guide

Voice Journal의 CI/CD 파이프라인 및 Vercel 배포 가이드입니다.

## 🎯 개요

### 브랜치 전략
- **main**: 프로덕션 환경 (https://voice-journal.vercel.app)
- **staging**: 스테이징 환경 (https://voice-journal-staging.vercel.app)
- **feature/***: PR 미리보기 배포

### 배포 환경
| 환경 | 브랜치 | URL | 용도 |
|------|--------|-----|------|
| Production | main | voice-journal.vercel.app | 실제 서비스 |
| Staging | staging | voice-journal-staging.vercel.app | 테스트 및 QA |
| Preview | PR branches | auto-generated | 코드 리뷰 |

## 🚀 Vercel 프로젝트 설정

### 1. Vercel 계정 연결

```bash
# Vercel CLI 설치
npm install -g vercel

# Vercel 로그인
vercel login

# 프로젝트 연결
vercel link
```

### 2. 환경 변수 설정

#### Production 환경
```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_OPENAI_API_KEY production
vercel env add VITE_GOOGLE_CLIENT_ID production
vercel env add VITE_GOOGLE_CLIENT_SECRET production
vercel env add VITE_NOTION_CLIENT_ID production
vercel env add VITE_NOTION_CLIENT_SECRET production
```

#### Staging 환경
```bash
vercel env add VITE_SUPABASE_URL preview
vercel env add VITE_SUPABASE_ANON_KEY preview
# ... 기타 환경변수들
```

### 3. GitHub Actions 시크릿 설정

Repository Settings → Secrets에서 다음 시크릿들을 추가:

```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id

# Production 환경변수
PROD_VITE_SUPABASE_URL=your_prod_supabase_url
PROD_VITE_SUPABASE_ANON_KEY=your_prod_anon_key

# Staging 환경변수
STAGING_VITE_SUPABASE_URL=your_staging_supabase_url
STAGING_VITE_SUPABASE_ANON_KEY=your_staging_anon_key
```

## 🔄 배포 워크플로우

### 자동 배포

#### Production 배포
```bash
# main 브랜치에 푸시하면 자동 배포
git checkout main
git merge feature/your-feature
git push origin main
```

#### Staging 배포
```bash
# staging 브랜치에 푸시하면 자동 배포
git checkout staging
git merge feature/your-feature
git push origin staging
```

#### PR 미리보기
```bash
# PR 생성 시 자동으로 미리보기 배포 생성
git checkout -b feature/new-feature
git push origin feature/new-feature
# GitHub에서 PR 생성
```

### 수동 배포

```bash
# Preview 배포
npm run deploy:preview

# Staging 배포
npm run deploy:staging

# Production 배포
npm run deploy:production
```

## 🏗️ CI/CD 파이프라인

### Pipeline 단계

1. **Quality Check**: 코드 품질 및 보안 검사
   - ESLint 검사
   - TypeScript 타입 체크
   - 보안 스캔
   - 시크릿 누출 검사

2. **Build Test**: 환경별 빌드 테스트
   - Production 빌드
   - Staging 빌드

3. **Deploy**: 환경별 배포
   - Production (main 브랜치)
   - Staging (staging 브랜치)
   - Preview (PR 브랜치)

4. **Health Check**: 배포 후 상태 확인
   - 애플리케이션 헬스체크
   - 핵심 기능 테스트

5. **Notify**: 팀 알림
   - 배포 성공/실패 알림

### 빌드 명령어

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "devCommand": "npm run dev"
}
```

## 🛡️ 보안 설정

### HTTP Headers
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: microphone=(self), camera=(), geolocation=(), payment=()
- Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

### 캐시 설정
- 정적 자산: 1년 캐시
- Service Worker: 캐시 비활성화
- Manifest: 1일 캐시

## 📊 모니터링 및 로그

### Vercel Analytics
- 성능 메트릭
- 사용자 분석
- Core Web Vitals

### 로그 확인
```bash
# Vercel 로그 보기
vercel logs

# 실시간 로그
vercel logs --follow
```

### 상태 확인
```bash
# 헬스체크
curl https://voice-journal.vercel.app/health

# 빌드 상태
vercel ls
```

## 🚨 트러블슈팅

### 일반적인 문제들

#### 빌드 실패
```bash
# 로컬에서 빌드 테스트
npm run build

# 의존성 문제 해결
npm ci
npm run build
```

#### 환경변수 누락
```bash
# 환경변수 확인
vercel env ls

# 환경변수 추가
vercel env add VARIABLE_NAME production
```

#### 배포 실패
```bash
# 배포 로그 확인
vercel logs

# 롤백
vercel rollback [deployment-url]
```

### 보안 스캔 실패
```bash
# 시크릿 검사
npm run check:secrets

# 보안 취약점 확인
npm audit
npm audit fix
```

## 🔧 고급 설정

### 커스텀 도메인 설정
```bash
# 도메인 추가
vercel domains add your-domain.com

# DNS 설정 확인
vercel domains inspect your-domain.com
```

### 팀 관리
```bash
# 팀원 추가
vercel teams invite user@example.com

# 권한 관리
vercel teams members
```

## 📈 성능 최적화

### Bundle 분석
```bash
# Bundle analyzer 실행
npm run build:analyze
```

### 캐시 전략
- 정적 자산은 최대 캐시 설정
- HTML 파일은 캐시 비활성화
- Service Worker는 즉시 업데이트

## 🎯 베스트 프랙티스

### 1. 브랜치 관리
- main: 항상 배포 가능한 상태 유지
- staging: QA 및 테스트용
- feature/*: 기능 개발용

### 2. 배포 전 체크리스트
- [ ] 로컬 빌드 성공
- [ ] 테스트 통과
- [ ] 환경변수 설정 확인
- [ ] 보안 스캔 통과

### 3. 모니터링
- 배포 후 헬스체크 확인
- 성능 메트릭 모니터링
- 에러 로그 확인

### 4. 롤백 전략
- 문제 발생 시 즉시 롤백
- 이전 버전으로 빠른 복구
- 문제 원인 분석 후 재배포

---

## 📞 지원

배포 관련 문제가 있을 경우:
1. GitHub Actions 로그 확인
2. Vercel 대시보드 점검
3. 환경변수 설정 검토
4. 팀 슬랙 채널에 문의

배포 파이프라인이 안정적으로 운영될 수 있도록 이 가이드를 참고하여 배포를 진행해주세요.