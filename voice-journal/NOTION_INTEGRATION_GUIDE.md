# Notion Integration Guide

## 📋 개요
Voice Journal의 Notion 연동 시스템을 통해 음성 일기 엔트리를 Notion 페이지로 자동 동기화할 수 있습니다.

## 🏗️ 아키텍처

### 1. 컴포넌트 구조
```
src/domains/integrations/
├── components/
│   └── NotionSettings.tsx           # Notion 설정 UI 컴포넌트
├── hooks/
│   └── useNotion.ts                 # Notion 통합 React Hook
├── services/
│   └── notionService.ts             # Notion API 클라이언트 서비스
└── utils/
    └── errorHandling.ts             # 에러 처리 및 재시도 로직

supabase/functions/
├── notion-oauth/                    # OAuth 인증 Edge Function
└── notion-sync/                     # 데이터 동기화 Edge Function

src/pages/
└── NotionCallback.tsx               # OAuth 콜백 페이지
```

## 🔐 OAuth2 인증 플로우

### 1. 인증 시작
```typescript
// 사용자가 "Connect Notion" 클릭
const { startOAuth } = useNotion()
await startOAuth()

// 결과: Notion 인증 페이지로 리다이렉트
```

### 2. 인증 완료
```typescript
// Notion에서 /notion/callback으로 리다이렉트
// NotionCallback 컴포넌트가 OAuth 코드 처리
const { completeOAuth } = useNotion()
await completeOAuth(code, state)
```

### 3. 토큰 저장
```sql
-- integrations 테이블에 저장되는 데이터
{
  user_id: uuid,
  service: 'notion',
  access_token: string,
  workspace_name: string,
  workspace_icon: string,
  workspace_id: string,
  bot_id: string,
  status: 'connected'
}
```

## 📊 데이터베이스 구성

### 1. 자동 데이터베이스 생성
```typescript
// Notion에서 Voice Journal 전용 데이터베이스 생성
const { createDatabase } = useNotion()
await createDatabase(parentPageId)

// 생성되는 속성들:
// - Title: 페이지 제목
// - Date: 엔트리 날짜  
// - Sentiment: 감정 점수 (숫자)
// - Wins: 성취한 것들 (다중 선택)
// - Regrets: 후회하는 것들 (다중 선택)
// - Tasks: 내일 할 일들 (다중 선택)
// - Keywords: 주요 키워드 (다중 선택)
```

### 2. 기존 데이터베이스 선택
```typescript
// 사용자가 기존 Notion 데이터베이스 선택
const { databases, updateIntegration } = useNotion()
await updateIntegration({ database_id: selectedDbId })
```

## 🔄 데이터 동기화

### 1. 개별 엔트리 동기화
```typescript
const { syncEntry } = useNotion()

// 새 엔트리 생성
await syncEntry(entryId, 'create')

// 기존 엔트리 업데이트  
await syncEntry(entryId, 'update')

// 엔트리 삭제 (아카이브)
await syncEntry(entryId, 'delete')
```

### 2. 일괄 동기화
```typescript
const { syncMultipleEntries } = useNotion()

const result = await syncMultipleEntries(
  ['entry1', 'entry2', 'entry3'],
  'create'
)

console.log(`성공: ${result.success}, 실패: ${result.failed}`)
```

### 3. Notion 페이지 구조
```markdown
# Journal Entry - 2024-01-15

## Transcript
[사용자의 음성 텍스트 변환 내용]

## Things I Did Well
• [성취한 것 1]
• [성취한 것 2]

## Regrets  
• [후회하는 것 1]
• [후회하는 것 2]

## Tasks for Tomorrow
- [ ] [내일 할 일 1]
- [ ] [내일 할 일 2]
```

## 🛠️ React Hook 사용법

### useNotion Hook
```typescript
const {
  // 상태
  integration,           // 연동 정보
  databases,            // 사용 가능한 데이터베이스 목록
  isConnected,          // 연결 상태
  hasDatabase,          // 데이터베이스 설정 여부
  canSync,              // 동기화 가능 여부
  
  // 로딩 상태
  isLoadingIntegration,
  isLoadingDatabases,
  isConnecting,
  
  // 액션
  startOAuth,           // OAuth 시작
  completeOAuth,        // OAuth 완료
  disconnect,           // 연동 해제
  syncEntry,            // 엔트리 동기화
  syncMultipleEntries,  // 일괄 동기화
  updateIntegration,    // 설정 업데이트
  testConnection,       // 연결 테스트
  createDatabase,       // 데이터베이스 생성
  
  // 결과 및 에러
  connectionTest,
  connectError,
  syncError,
  workspace            // 워크스페이스 정보
} = useNotion({
  onConnectSuccess: (workspace) => {
    console.log('연결 성공:', workspace.name)
  },
  onSyncSuccess: (action, notionPageUrl) => {
    console.log('동기화 성공:', notionPageUrl)
  },
  onSyncError: (error) => {
    console.error('동기화 실패:', error)
  }
})
```

## 🔧 에러 처리 및 재시도

### 1. 자동 재시도 로직
```typescript
// 지수 백오프를 사용한 재시도
const result = await NotionSyncHelper.syncEntryWithRetry(
  entryId, 
  'create',
  databaseId,
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  }
)
```

### 2. 재시도 가능한 에러 판별
```typescript
// 네트워크 에러, 서버 에러, 요청 제한 에러는 재시도
function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase()
  
  // 재시도 가능: 네트워크, 서버, 요청 제한
  if (message.includes('network') || 
      message.includes('500') || 
      message.includes('rate limit')) {
    return true
  }
  
  // 재시도 불가: 인증, 권한, 잘못된 요청
  if (message.includes('401') || 
      message.includes('403') || 
      message.includes('400')) {
    return false
  }
  
  return true
}
```

### 3. 사용자 친화적 에러 메시지
```typescript
function getUserFriendlyMessage(error: Error): string {
  const message = error.message.toLowerCase()
  
  if (message.includes('rate limit')) {
    return 'Notion API 요청 제한에 도달했습니다. 잠시 후 다시 시도해주세요.'
  }
  
  if (message.includes('unauthorized')) {
    return 'Notion 인증이 만료되었습니다. 다시 연결해주세요.'
  }
  
  if (message.includes('forbidden')) {
    return '권한이 거부되었습니다. Notion 데이터베이스 권한을 확인해주세요.'
  }
  
  return error.message
}
```

## 🎛️ UI 컴포넌트

### NotionSettings 컴포넌트
```tsx
// Settings 페이지에서 사용
<NotionSettings />

// 주요 기능:
// - OAuth 연결/해제
// - 데이터베이스 선택/생성
// - 연결 상태 테스트
// - 동기화 상태 표시
```

### EntryReview에 동기화 버튼
```tsx
// 개별 엔트리에서 Notion 동기화
{isNotionConnected && (
  <button onClick={handleSyncToNotion}>
    📄 Notion
  </button>
)}
```

## 🔒 보안 및 권한

### 1. 환경 변수 설정
```bash
# Supabase Edge Functions에서 사용
NOTION_CLIENT_ID=your_notion_oauth_client_id
NOTION_CLIENT_SECRET=your_notion_oauth_client_secret
NOTION_REDIRECT_URI=https://your-domain.com/notion/callback
```

### 2. Notion OAuth 앱 설정
```
Redirect URLs:
- https://your-domain.vercel.app/notion/callback
- http://localhost:3000/notion/callback (개발용)

User Capabilities:
- Read content
- Insert content  
- Update content and comments

Bot Capabilities:
- Read content
- Insert content
- Update content and comments
```

### 3. 데이터 접근 제어
- RLS 정책으로 사용자별 데이터 격리
- 암호화된 액세스 토큰 저장
- 최소 권한 원칙 적용

## 📈 성능 최적화

### 1. 배치 처리
```typescript
// 대량 동기화 시 배치 단위로 처리
const batchSize = 2
for (let i = 0; i < entryIds.length; i += batchSize) {
  const batch = entryIds.slice(i, i + batchSize)
  await Promise.all(batch.map(id => syncEntry(id)))
  
  // 배치 간 지연시간 추가 (요청 제한 방지)
  await new Promise(resolve => setTimeout(resolve, 2000))
}
```

### 2. 캐싱 및 상태 관리
```typescript
// React Query를 통한 데이터 캐싱
const { data: integration } = useQuery({
  queryKey: ['notion-integration'],
  queryFn: NotionService.getIntegration,
  staleTime: 30000 // 30초 캐시
})
```

### 3. 연결 상태 모니터링
```typescript
// 주기적 연결 상태 확인
const healthCheck = await NotionHealthChecker.checkHealth()
if (!healthCheck.isHealthy) {
  // 재연결 또는 사용자 알림
}
```

## 🚀 배포 및 운영

### 1. 환경별 설정
```typescript
// 개발 환경
const redirectUri = 'http://localhost:3000/notion/callback'

// 프로덕션 환경  
const redirectUri = 'https://voice-journal.vercel.app/notion/callback'
```

### 2. 모니터링 및 로깅
```typescript
// Edge Function에서 로깅
console.log(`Notion sync: ${action} entry ${entryId}`)
console.warn(`Notion sync retry ${attempt}:`, error.message)
console.error('Notion OAuth error:', error)
```

### 3. 에러 추적
```typescript
// 동기화 실패 시 로컬 큐에 저장
const failedSyncs = JSON.parse(
  localStorage.getItem('notion-failed-syncs') || '[]'
)

failedSyncs.push({
  entryId,
  action,
  error: error.message,
  timestamp: Date.now()
})

localStorage.setItem('notion-failed-syncs', JSON.stringify(failedSyncs))
```

## 🐛 트러블슈팅

### 1. 일반적인 문제

**OAuth 실패**
```typescript
// 해결: 리다이렉트 URI 확인
if (state !== user.id) {
  throw new Error('Invalid state parameter')
}
```

**토큰 만료**
```typescript
// 해결: 재인증 요청
if (error.message.includes('unauthorized')) {
  // 사용자에게 재연결 안내
  showReconnectDialog()
}
```

**요청 제한**
```typescript
// 해결: 지수 백오프 재시도
if (message.includes('rate limit')) {
  const delay = NotionErrorHelper.getRetryDelay(error)
  await new Promise(resolve => setTimeout(resolve, delay))
}
```

### 2. 디버깅 도구
```typescript
// 연결 테스트
const { testConnection } = useNotion()
const result = await testConnection()
console.log('Connection test:', result)

// 동기화 상태 확인
const syncStatus = NotionHealthChecker.checkHealth()
console.log('Health status:', syncStatus)
```

## 📚 API 참조

### NotionService 메서드
```typescript
class NotionService {
  // OAuth 관련
  static startOAuth(): Promise<NotionAuthResponse>
  static completeOAuth(code: string, state: string): Promise<NotionAuthResponse>
  static disconnect(): Promise<{ success: boolean; error?: string }>
  
  // 연동 관리
  static getIntegration(): Promise<NotionIntegration | null>
  static updateIntegration(updates: Partial<NotionIntegration>): Promise<boolean>
  static testConnection(): Promise<{ success: boolean; error?: string }>
  
  // 데이터베이스 관리
  static getDatabases(): Promise<Array<{ id: string; title: string; url: string }> | null>
  static createJournalDatabase(parentPageId: string): Promise<{ success: boolean; databaseId?: string; error?: string }>
  
  // 동기화
  static syncEntry(entryId: string, action: 'create' | 'update' | 'delete', databaseId?: string): Promise<NotionSyncResponse>
  static syncMultipleEntries(entryIds: string[], action: 'create' | 'update', databaseId?: string): Promise<{ success: number; failed: number; errors: string[] }>
}
```

### 에러 처리 유틸리티
```typescript
class NotionSyncHelper {
  static syncEntryWithRetry(entryId: string, action: 'create' | 'update' | 'delete', databaseId?: string, options?: RetryOptions)
  static syncMultipleEntriesWithRetry(entryIds: string[], action: 'create' | 'update', databaseId?: string, options?: RetryOptions)
  static testConnectionWithRetry(options?: RetryOptions)
}

class NotionErrorHelper {
  static getUserFriendlyMessage(error: Error): string
  static shouldShowRetryButton(error: Error): boolean
  static getRetryDelay(error: Error): number
}

class NotionHealthChecker {
  static checkHealth(): Promise<{ isHealthy: boolean; lastChecked: number; error?: string }>
  static resetCache(): void
}
```

## 🎯 사용 예시

### 기본 연동 설정
```typescript
function NotionIntegrationDemo() {
  const { 
    isConnected, 
    startOAuth, 
    databases, 
    updateIntegration 
  } = useNotion()

  const handleConnect = async () => {
    await startOAuth()
  }

  const selectDatabase = async (databaseId: string) => {
    await updateIntegration({ database_id: databaseId })
  }

  return (
    <div>
      {!isConnected ? (
        <button onClick={handleConnect}>
          Connect Notion
        </button>
      ) : (
        <select onChange={(e) => selectDatabase(e.target.value)}>
          {databases?.map(db => (
            <option key={db.id} value={db.id}>
              {db.title}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
```

### 엔트리 동기화
```typescript
function EntrySync({ entryId }: { entryId: string }) {
  const { syncEntry, canSync, isSyncing } = useNotion({
    onSyncSuccess: () => toast.success('Synced to Notion!'),
    onSyncError: (error) => toast.error(error)
  })

  const handleSync = () => {
    if (canSync) {
      syncEntry(entryId, 'create')
    }
  }

  return (
    <button 
      onClick={handleSync}
      disabled={!canSync || isSyncing}
    >
      {isSyncing ? 'Syncing...' : 'Sync to Notion'}
    </button>
  )
}
```

## 📋 체크리스트

### 배포 전 확인사항
- [ ] Notion OAuth 앱 등록 완료
- [ ] 환경 변수 설정 완료
- [ ] 리다이렉트 URI 설정 확인
- [ ] Edge Functions 배포 완료
- [ ] 데이터베이스 테이블 마이그레이션 완료
- [ ] 통합 테스트 완료

### 운영 시 모니터링
- [ ] OAuth 성공률 추적
- [ ] 동기화 성공률 추적  
- [ ] API 응답 시간 모니터링
- [ ] 에러 로그 분석
- [ ] 사용자 피드백 수집

이 가이드를 통해 Voice Journal의 Notion 통합 기능을 완전히 이해하고 운영할 수 있습니다.