# Security Testing Guide

## 📋 개요
Voice Journal 애플리케이션의 보안 규칙 및 데이터 보호 정책을 테스트하는 가이드입니다.

## 🔧 테스트 환경 설정

### 1. Supabase 로컬 개발 환경
```bash
# Supabase CLI 설치
npm install -g supabase

# 로컬 환경 시작
supabase start

# 마이그레이션 적용
supabase db push
```

### 2. 테스트 사용자 생성
```bash
# 테스트 사용자 1
supabase auth signup --email test1@example.com --password testpass123

# 테스트 사용자 2  
supabase auth signup --email test2@example.com --password testpass123
```

## 🛡️ RLS (Row Level Security) 테스트

### 1. Entries 테이블 테스트

#### 1.1 정상 접근 테스트
```sql
-- 사용자 1로 로그인 후 자신의 데이터 조회
SELECT * FROM entries WHERE user_id = auth.uid();
-- ✅ 성공해야 함

-- 사용자 1이 자신의 데이터 삽입
INSERT INTO entries (user_id, date, transcript) 
VALUES (auth.uid(), '2025-01-17', 'Test entry');
-- ✅ 성공해야 함
```

#### 1.2 무단 접근 테스트
```sql
-- 사용자 1로 로그인 후 다른 사용자의 데이터 조회 시도
SELECT * FROM entries WHERE user_id != auth.uid();
-- ❌ 빈 결과 또는 권한 없음 에러

-- 사용자 1이 다른 사용자 ID로 데이터 삽입 시도
INSERT INTO entries (user_id, date, transcript) 
VALUES ('00000000-0000-0000-0000-000000000000', '2025-01-17', 'Unauthorized entry');
-- ❌ 권한 없음 에러
```

### 2. Storage 테스트

#### 2.1 정상 접근 테스트
```javascript
// 자신의 폴더에 파일 업로드
const { data, error } = await supabase.storage
  .from('voices')
  .upload(`${user.id}/test-audio.webm`, audioBlob);
// ✅ 성공해야 함

// 자신의 파일 다운로드
const { data, error } = await supabase.storage
  .from('voices')
  .download(`${user.id}/test-audio.webm`);
// ✅ 성공해야 함
```

#### 2.2 무단 접근 테스트
```javascript
// 다른 사용자의 폴더에 파일 업로드 시도
const { data, error } = await supabase.storage
  .from('voices')
  .upload(`${otherUserId}/unauthorized.webm`, audioBlob);
// ❌ 권한 없음 에러

// 다른 사용자의 파일 다운로드 시도
const { data, error } = await supabase.storage
  .from('voices')
  .download(`${otherUserId}/private-audio.webm`);
// ❌ 권한 없음 에러
```

## 🔍 API 보안 테스트

### 1. Edge Functions 인증 테스트

#### 1.1 인증된 요청
```bash
# 유효한 JWT 토큰으로 요청
curl -X POST https://your-project.supabase.co/functions/v1/voice-processing \
  -H "Authorization: Bearer ${VALID_JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "entryId": "test-entry-id",
    "audioUrl": "https://example.com/audio.webm",
    "userId": "user-id"
  }'
# ✅ 성공해야 함
```

#### 1.2 무인증 요청
```bash
# Authorization 헤더 없이 요청
curl -X POST https://your-project.supabase.co/functions/v1/voice-processing \
  -H "Content-Type: application/json" \
  -d '{
    "entryId": "test-entry-id",
    "audioUrl": "https://example.com/audio.webm",
    "userId": "user-id"
  }'
# ❌ 401 Unauthorized
```

#### 1.3 잘못된 사용자 ID 요청
```bash
# 다른 사용자 ID로 요청
curl -X POST https://your-project.supabase.co/functions/v1/voice-processing \
  -H "Authorization: Bearer ${VALID_JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "entryId": "test-entry-id", 
    "audioUrl": "https://example.com/audio.webm",
    "userId": "different-user-id"
  }'
# ❌ 403 Forbidden
```

### 2. 데이터 삭제 함수 테스트

#### 2.1 정상 삭제 요청
```javascript
const { data, error } = await supabase.functions.invoke('data-deletion', {
  body: {
    userId: user.id,
    requestType: 'delete_all',
    userConfirmation: true
  }
});
// ✅ 성공해야 함
```

#### 2.2 확인 없는 삭제 요청
```javascript
const { data, error } = await supabase.functions.invoke('data-deletion', {
  body: {
    userId: user.id,
    requestType: 'delete_all',
    userConfirmation: false
  }
});
// ❌ 400 Bad Request
```

## 🧪 자동화된 보안 테스트

### 1. Jest 테스트 스위트 생성

```typescript
// tests/security.test.ts
import { createClient } from '@supabase/supabase-js'

describe('Security Tests', () => {
  let supabase: any
  let testUser1: any
  let testUser2: any

  beforeAll(async () => {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
    
    // 테스트 사용자 생성
    testUser1 = await supabase.auth.signUp({
      email: 'test1@example.com',
      password: 'testpass123'
    })
    
    testUser2 = await supabase.auth.signUp({
      email: 'test2@example.com', 
      password: 'testpass123'
    })
  })

  test('사용자는 자신의 엔트리만 조회할 수 있어야 함', async () => {
    // 사용자 1로 로그인
    await supabase.auth.signInWithPassword({
      email: 'test1@example.com',
      password: 'testpass123'
    })

    // 모든 엔트리 조회 시도
    const { data, error } = await supabase
      .from('entries')
      .select('*')

    // 자신의 엔트리만 반환되어야 함
    expect(data?.every(entry => entry.user_id === testUser1.data.user.id)).toBe(true)
  })

  test('다른 사용자의 음성 파일에 접근할 수 없어야 함', async () => {
    // 사용자 1로 로그인
    await supabase.auth.signInWithPassword({
      email: 'test1@example.com',
      password: 'testpass123'
    })

    // 사용자 2의 파일 다운로드 시도
    const { data, error } = await supabase.storage
      .from('voices')
      .download(`${testUser2.data.user.id}/some-file.webm`)

    expect(error).toBeTruthy()
    expect(error?.message).toContain('access')
  })
})
```

### 2. 테스트 실행
```bash
npm test security.test.ts
```

## 🔐 침투 테스트 시나리오

### 1. SQL 인젝션 테스트
```javascript
// 악의적인 입력으로 SQL 인젝션 시도
const maliciousInput = "'; DROP TABLE entries; --"

const { data, error } = await supabase
  .from('entries')
  .select('*')
  .eq('transcript', maliciousInput)

// ❌ 파라미터화된 쿼리로 인해 인젝션이 차단되어야 함
```

### 2. 크로스 사이트 스크립팅 (XSS) 테스트
```javascript
// 악의적인 스크립트 입력
const xssPayload = "<script>alert('XSS')</script>"

// 입력 검증이 있어야 함
const result = await createEntry({
  transcript: xssPayload,
  wins: [xssPayload],
  tasks: [xssPayload]
})

// 출력 시 이스케이프되어야 함
```

### 3. 권한 상승 테스트
```javascript
// 일반 사용자가 관리자 기능 접근 시도
const { data, error } = await supabase
  .from('audit_logs')
  .select('*')

// ❌ RLS 정책에 의해 차단되어야 함
expect(error?.message).toContain('insufficient_privilege')
```

## 📊 보안 모니터링

### 1. 로그 분석
```sql
-- 의심스러운 활동 모니터링
SELECT 
  user_id,
  operation,
  COUNT(*) as frequency,
  MAX(created_at) as last_activity
FROM audit_logs 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id, operation
HAVING COUNT(*) > 100; -- 비정상적으로 높은 활동
```

### 2. 실패한 인증 시도 모니터링
```javascript
// Supabase Auth 이벤트 리스너
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('Successful login:', session?.user?.email)
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out')
  }
})
```

## ✅ 보안 체크리스트

### 데이터베이스 보안
- [ ] RLS가 모든 테이블에서 활성화됨
- [ ] 사용자는 자신의 데이터에만 접근 가능
- [ ] 관리자 권한이 적절히 제한됨
- [ ] 감사 로그가 기록됨

### 스토리지 보안
- [ ] 파일 업로드가 사용자별 폴더로 제한됨
- [ ] 파일 다운로드가 소유자에게만 허용됨
- [ ] 파일 크기 및 형식 제한이 있음
- [ ] 악성 파일 업로드가 차단됨

### API 보안
- [ ] 모든 엔드포인트가 인증 필요
- [ ] JWT 토큰 검증이 올바름
- [ ] 요청 속도 제한이 있음
- [ ] 입력 검증이 수행됨

### 클라이언트 보안
- [ ] XSS 공격이 방지됨
- [ ] CSRF 보호가 있음
- [ ] 민감한 데이터가 브라우저에 저장되지 않음
- [ ] HTTPS가 강제됨

## 🚨 보안 사고 대응

### 1. 데이터 유출 감지
```sql
-- 대량 데이터 접근 감지
SELECT 
  user_id,
  COUNT(*) as access_count,
  array_agg(DISTINCT table_name) as accessed_tables
FROM audit_logs 
WHERE created_at > NOW() - INTERVAL '5 minutes'
  AND operation = 'SELECT'
GROUP BY user_id
HAVING COUNT(*) > 1000;
```

### 2. 즉시 대응 절차
1. **즉시 차단**: 의심스러운 사용자 계정 일시 정지
2. **로그 보존**: 관련 로그 데이터 백업
3. **영향 평가**: 노출된 데이터 범위 확인
4. **통지**: 영향받은 사용자에게 72시간 내 통지
5. **조치**: 보안 패치 및 모니터링 강화

### 3. 사후 분석
- 공격 벡터 분석
- 보안 정책 업데이트
- 직원 교육 강화
- 제3자 보안 감사 실시