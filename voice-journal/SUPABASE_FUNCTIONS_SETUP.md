# Supabase Edge Functions 설정 가이드

## 📋 개요
음성 파일 처리를 위한 Supabase Edge Functions를 배포하고 설정하는 방법입니다.

## 🚀 필수 준비사항

### 1. Supabase CLI 설치
```bash
npm install -g supabase
```

### 2. Supabase 프로젝트 로그인
```bash
supabase login
```

### 3. 프로젝트 연결
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

## 🔧 Edge Functions 배포

### 1. voice-processing 함수 배포
```bash
supabase functions deploy voice-processing
```

### 2. 환경 변수 설정
Supabase 대시보드 → Settings → Edge Functions → Environment Variables:

```bash
# OpenAI API Key (음성 전사 및 분석용)
OPENAI_API_KEY=your-openai-api-key

# Supabase 설정 (함수 내부에서 DB 접근용)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. 함수 URL 확인
배포 후 함수 URL:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/voice-processing
```

## 🔐 보안 설정

### 1. RLS (Row Level Security) 정책
Supabase 대시보드 → Database → Tables → entries:

```sql
-- 사용자는 자신의 엔트리만 읽기/쓰기 가능
CREATE POLICY "Users can only access their own entries" ON entries
FOR ALL USING (auth.uid() = user_id);
```

### 2. Service Role Key 보안
- Service Role Key는 절대 클라이언트에 노출하지 마세요
- Edge Functions에서만 사용하세요
- 정기적으로 키를 로테이션하세요

## 🧪 테스트

### 1. 로컬 테스트
```bash
# 로컬에서 Edge Functions 실행
supabase functions serve

# 다른 터미널에서 테스트
curl -X POST http://localhost:54321/functions/v1/voice-processing \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "entryId": "test-entry-id",
    "audioUrl": "https://example.com/audio.webm",
    "userId": "test-user-id"
  }'
```

### 2. 프로덕션 테스트
브라우저에서 음성 녹음 → 업로드 → 처리 과정을 테스트

## 📊 모니터링

### 1. 함수 로그 확인
```bash
supabase functions logs voice-processing
```

### 2. Supabase 대시보드
Dashboard → Edge Functions → voice-processing → Logs

## 🛠️ 트러블슈팅

### 일반적인 문제들

#### 1. 함수 배포 실패
```bash
# 다시 배포 시도
supabase functions deploy voice-processing --debug
```

#### 2. OpenAI API 에러
- API 키가 올바른지 확인
- 사용량 한도 확인
- API 키에 충분한 권한이 있는지 확인

#### 3. 오디오 파일 접근 실패
- Firebase Storage 보안 규칙 확인
- CORS 설정 확인
- 파일 URL이 공개적으로 접근 가능한지 확인

#### 4. 데이터베이스 업데이트 실패
- Service Role Key 확인
- RLS 정책 확인
- 테이블 스키마 확인

### 로그 확인 방법
```bash
# 실시간 로그 모니터링
supabase functions logs voice-processing --follow

# 특정 시간대 로그
supabase functions logs voice-processing --since="2025-01-01 00:00:00"
```

## 📈 성능 최적화

### 1. 함수 콜드 스타트 최소화
- 함수를 정기적으로 호출하여 웜업 상태 유지
- 무거운 초기화 로직 최소화

### 2. OpenAI API 최적화
- 적절한 모델 선택 (gpt-3.5-turbo vs gpt-4)
- 토큰 사용량 모니터링
- 배치 처리 고려

### 3. 에러 처리 강화
- 재시도 로직 구현
- 적절한 에러 메시지 제공
- 타임아웃 설정

## 💰 비용 관리

### OpenAI API 비용
- Whisper API: $0.006 per minute
- GPT-3.5-turbo: ~$0.002 per request
- 월 예상 비용: 100명 사용자 기준 $10-20

### Supabase Edge Functions
- 무료 할당량: 2M 요청/월
- 초과 시: $2 per 1M 요청

## 🔄 업데이트 및 배포

### 함수 업데이트
```bash
# 코드 수정 후 재배포
supabase functions deploy voice-processing

# 환경 변수 업데이트
supabase secrets set OPENAI_API_KEY=new-key
```

### 롤백
```bash
# 이전 버전으로 롤백 (수동으로 이전 코드 복원 후 배포)
git checkout previous-commit
supabase functions deploy voice-processing
```