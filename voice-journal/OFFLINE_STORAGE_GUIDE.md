# Offline Storage & Encrypted Cache Guide

## 📋 개요
Voice Journal의 오프라인 우선 저장소 시스템은 사용자 음성 파일을 안전하게 암호화하여 IndexedDB에 저장하고, 온라인 상태가 복원되면 자동으로 Firebase Storage에 동기화합니다.

## 🏗️ 아키텍처

### 1. 구성 요소
```
src/lib/
├── crypto.ts                    # Web Crypto API 암호화 유틸리티
├── offlineDB.ts                 # Dexie 기반 IndexedDB 스토리지
└── offlineSync.ts               # 자동 동기화 서비스

src/domains/journaling/
├── hooks/
│   └── useOfflineSync.ts        # 오프라인 동기화 React Hook
├── components/
│   └── OfflineStatus.tsx        # 오프라인 상태 UI 컴포넌트
└── services/
    ├── voiceProcessingService.ts # 음성 처리 (오프라인 지원)
    └── entryService.ts          # 엔트리 서비스 (오프라인 지원)
```

### 2. 데이터 플로우
```
1. 사용자 음성 녹음
2. 오프라인 여부 확인
3. 오프라인 시: 암호화 → IndexedDB 저장
4. 온라인 시: 클라우드 처리 또는 오프라인 저장 (실패 시)
5. 연결 복원 시: 자동 동기화 시작
6. 암호화 해제 → 클라우드 업로드 → 로컬 데이터 정리
```

## 🔐 암호화 시스템 (CryptoService)

### 1. AES-GCM 암호화
```typescript
// 사용자별 암호화 키 생성
const key = await CryptoService.getOrCreateKey(userId)

// 음성 파일 암호화
const { encryptedData, iv } = await CryptoService.encryptBlob(audioBlob, userId)

// 음성 파일 복호화
const decryptedBlob = await CryptoService.decryptToBlob(encryptedData, iv, userId)
```

### 2. 키 관리
- **키 생성**: 사용자당 256비트 AES 키 생성
- **키 저장**: localStorage에 안전하게 저장
- **키 캐싱**: 메모리에 캐싱하여 성능 최적화
- **키 삭제**: 로그아웃 시 안전하게 삭제

### 3. 보안 특징
- **AES-GCM**: 인증된 암호화로 데이터 무결성 보장
- **랜덤 IV**: 각 암호화마다 새로운 초기화 벡터 사용
- **클라이언트 측 암호화**: 서버에 평문 데이터 노출 없음

## 🗄️ IndexedDB 스토리지 (OfflineStorageService)

### 1. 데이터 스키마
```typescript
interface OfflineAudioRecord {
  id?: number
  entryId: string
  userId: string
  encryptedData: ArrayBuffer        // 암호화된 음성 데이터
  iv: Uint8Array                    // 초기화 벡터
  keyId: string                     // 암호화 키 ID
  mimeType: string                  // 원본 MIME 타입
  size: number                      // 원본 파일 크기
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed'
  uploadAttempts: number            // 업로드 시도 횟수
  lastUploadAttempt?: Date          // 마지막 업로드 시도 시간
  uploadError?: string              // 업로드 에러 메시지
}

interface OfflineEntryRecord {
  id?: number
  entryId: string
  userId: string
  date: string
  transcript: string
  wins: string[]
  regrets: string[]
  tasks: string[]
  keywords: string[]
  sentimentScore: number
  hasAudio: boolean
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed'
}
```

### 2. 주요 메서드
```typescript
// 암호화된 음성 파일 저장
await OfflineStorageService.storeAudioOffline(audioBlob, entryId, userId)

// 엔트리 데이터 저장
await OfflineStorageService.storeEntryOffline(entryData)

// 오프라인 음성 파일 검색
const audioBlob = await OfflineStorageService.getOfflineAudio(entryId, userId)

// 동기화 대기 중인 항목 조회
const pending = await OfflineStorageService.getPendingSyncItems(userId)

// 동기화 상태 업데이트
await OfflineStorageService.updateAudioSyncStatus(entryId, userId, 'synced')
```

## 🔄 자동 동기화 시스템 (OfflineSyncService)

### 1. 연결 상태 감지
```typescript
// 온라인/오프라인 이벤트 리스너
window.addEventListener('online', () => {
  this.startAutoSync()
})

window.addEventListener('offline', () => {
  this.isOnline = false
})
```

### 2. 동기화 프로세스
```typescript
// 자동 동기화 시작
static async syncPendingItems(userId: string): Promise<SyncResult> {
  1. 대기 중인 항목 조회
  2. 음성 파일 우선 동기화
  3. 엔트리 데이터 동기화
  4. 성공한 항목 로컬 삭제
  5. 실패한 항목 재시도 스케줄링
}
```

### 3. 재시도 로직
- **지수 백오프**: 1초 → 2초 → 4초 → 8초 → 최대 1분
- **최대 재시도**: 5회 제한
- **에러 분류**: 재시도 가능/불가능 에러 구분

### 4. 진행 상황 알림
```typescript
interface SyncProgress {
  current: number
  total: number
  currentItem: string
  status: 'syncing' | 'completed' | 'failed'
}
```

## 🎣 React Hook 사용법

### useOfflineSync Hook
```typescript
const {
  // 상태
  isOnline,              // 온라인 상태
  isSyncing,             // 동기화 진행 중
  pendingItems,          // 대기 중인 항목 수
  lastSyncAttempt,       // 마지막 동기화 시도 시간
  syncProgress,          // 동기화 진행 상황
  
  // 액션
  forceSync,             // 수동 동기화 시작
  storeAudioOffline,     // 음성 파일 오프라인 저장
  storeEntryOffline,     // 엔트리 데이터 오프라인 저장
  getOfflineAudio,       // 오프라인 음성 파일 검색
  clearOfflineData       // 오프라인 데이터 정리
} = useOfflineSync({
  onSync: (result) => {
    console.log(`${result.syncedItems} items synced successfully`)
  },
  onError: (error) => {
    console.error('Sync failed:', error)
  }
})
```

### 컴포넌트 활용 예시
```typescript
// 오프라인 상태 표시
function MyComponent() {
  const { isOnline, pendingItems, forceSync } = useOfflineSync()

  return (
    <div>
      <span className={isOnline ? 'text-green-500' : 'text-red-500'}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
      {pendingItems > 0 && (
        <button onClick={forceSync}>
          Sync {pendingItems} items
        </button>
      )}
    </div>
  )
}
```

## 🎨 UI 컴포넌트

### 1. OfflineStatus
```typescript
// 간단한 상태 표시
<OfflineStatus />

// 상세 정보 포함
<OfflineStatus showDetails={true} />
```

### 2. OfflineIndicator
```typescript
// 고정 위치 상태 표시기 (오프라인 시에만 표시)
<OfflineIndicator />
```

### 3. SyncControls
```typescript
// 동기화 관리 패널
<SyncControls />
```

## 🔧 서비스 통합

### 1. 음성 처리 서비스
```typescript
// 오프라인 지원 음성 처리
const result = await VoiceProcessingService.processVoiceEntryOffline(
  audioBlob, 
  entryId, 
  userId
)

// 오프라인 시 플레이스홀더 응답
{
  success: true,
  transcription: '[Offline - Will be processed when online]',
  analysis: {
    wins: [],
    regrets: [],
    tasks: [],
    keywords: ['offline'],
    sentiment_score: 0.5
  }
}
```

### 2. 엔트리 서비스
```typescript
// 오프라인 우선 엔트리 생성
const entry = await EntryService.createEntry(entryData)

// 온라인 실패 시 자동으로 오프라인 저장으로 전환
```

## 📊 성능 최적화

### 1. 배치 처리
```typescript
// 여러 항목을 배치로 동기화
const batchSize = 3
for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize)
  await Promise.all(batch.map(item => syncItem(item)))
  
  // 배치 간 지연 (API 요청 제한 방지)
  await new Promise(resolve => setTimeout(resolve, 1000))
}
```

### 2. 메모리 관리
```typescript
// 성공한 항목 자동 정리
await OfflineStorageService.cleanupSyncedItems(userId)

// 캐시 정리
CryptoService.clearCache()
```

### 3. 저장 공간 모니터링
```typescript
const stats = await OfflineStorageService.getStorageStats(userId)
console.log({
  audioCount: stats.audioCount,
  totalSize: stats.totalSize,
  pendingSync: stats.pendingSync
})
```

## 🛡️ 보안 고려사항

### 1. 클라이언트 측 암호화
- 원본 음성 데이터는 암호화된 상태로만 저장
- 암호화 키는 localStorage에 안전하게 저장
- 메모리 내 키 캐싱으로 성능 최적화

### 2. 데이터 격리
- 사용자별 암호화 키 분리
- 사용자 ID 기반 데이터 접근 제어
- 로그아웃 시 모든 사용자 데이터 삭제

### 3. 안전한 전송
- HTTPS를 통한 안전한 데이터 전송
- 액세스 토큰 기반 인증
- 업로드 전 데이터 검증

## 🚀 배포 및 운영

### 1. 브라우저 지원
```typescript
// 기능 지원 확인
if (!CryptoService.isSupported()) {
  console.warn('Web Crypto API not supported')
  // 폴백 처리
}

if (!('indexedDB' in window)) {
  console.warn('IndexedDB not supported')
  // 폴백 처리
}
```

### 2. 저장 공간 관리
```typescript
// 저장 공간 사용량 확인
if ('storage' in navigator && 'estimate' in navigator.storage) {
  const estimate = await navigator.storage.estimate()
  console.log(`Storage used: ${estimate.usage} / ${estimate.quota}`)
}
```

### 3. 에러 처리
```typescript
// 전역 에러 핸들러
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('offline')) {
    console.log('Offline operation detected')
    event.preventDefault()
  }
})
```

## 🧪 테스트 전략

### 1. 암호화 테스트
```typescript
// 암호화/복호화 무결성 테스트
const originalBlob = new Blob(['test audio data'], { type: 'audio/webm' })
const encrypted = await CryptoService.encryptBlob(originalBlob, userId)
const decrypted = await CryptoService.decryptToBlob(encrypted.encryptedData, encrypted.iv, userId)

// 원본과 복호화된 데이터 비교
assert(originalBlob.size === decrypted.size)
assert(originalBlob.type === decrypted.type)
```

### 2. 오프라인 시나리오 테스트
```typescript
// 네트워크 상태 시뮬레이션
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: false
})

// 오프라인 저장 테스트
await OfflineStorageService.storeAudioOffline(audioBlob, entryId, userId)
const retrieved = await OfflineStorageService.getOfflineAudio(entryId, userId)
assert(retrieved !== null)
```

### 3. 동기화 테스트
```typescript
// 동기화 프로세스 테스트
const syncResult = await OfflineSyncService.syncPendingItems(userId)
assert(syncResult.success === true)
assert(syncResult.syncedItems > 0)
```

## 📱 PWA 통합

### 1. 서비스 워커
```javascript
// 오프라인 지원을 위한 서비스 워커
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response('{"offline": true}', {
          headers: { 'Content-Type': 'application/json' }
        })
      })
    )
  }
})
```

### 2. 배경 동기화
```javascript
// 배경 동기화 등록
self.addEventListener('sync', (event) => {
  if (event.tag === 'voice-journal-sync') {
    event.waitUntil(performBackgroundSync())
  }
})
```

## 🔍 모니터링 및 디버깅

### 1. 로깅
```typescript
// 상세 로깅
console.log('Offline sync started:', { userId, pendingItems })
console.log('Encryption completed:', { entryId, encryptedSize })
console.log('Sync completed:', { syncedItems, failedItems })
```

### 2. 성능 측정
```typescript
// 동기화 성능 측정
const startTime = performance.now()
await OfflineSyncService.syncPendingItems(userId)
const duration = performance.now() - startTime
console.log(`Sync completed in ${duration}ms`)
```

### 3. 저장소 상태 확인
```typescript
// 개발자 도구용 헬퍼
window.VoiceJournalDebug = {
  async getOfflineStats(userId) {
    return await OfflineStorageService.getStorageStats(userId)
  },
  async clearOfflineData(userId) {
    return await OfflineStorageService.clearUserData(userId)
  }
}
```

## 🎯 사용 시나리오

### 1. 기본 오프라인 녹음
```typescript
// 사용자가 오프라인 상태에서 음성 녹음
const audioBlob = await recorder.stop()
await VoiceProcessingService.processVoiceEntryOffline(audioBlob, entryId, userId)
// → 암호화되어 IndexedDB에 저장, 온라인 복원 시 자동 동기화
```

### 2. 네트워크 오류 복구
```typescript
// 온라인 상태에서 업로드 실패 시 자동 오프라인 저장
try {
  await uploadToCloud(audioBlob)
} catch (error) {
  await OfflineStorageService.storeAudioOffline(audioBlob, entryId, userId)
  // → 나중에 자동 재시도
}
```

### 3. 수동 동기화
```typescript
// 사용자가 수동으로 동기화 트리거
const { forceSync } = useOfflineSync()
const result = await forceSync()
// → 모든 대기 중인 항목 동기화 시도
```

## 📋 체크리스트

### 배포 전 확인사항
- [ ] Web Crypto API 지원 확인
- [ ] IndexedDB 사용 가능 확인
- [ ] 암호화/복호화 테스트 완료
- [ ] 오프라인 저장 테스트 완료
- [ ] 자동 동기화 테스트 완료
- [ ] UI 컴포넌트 테스트 완료

### 운영 시 모니터링
- [ ] 동기화 성공률 추적
- [ ] 오프라인 저장 사용량 모니터링
- [ ] 암호화 성능 측정
- [ ] 사용자 피드백 수집

이 가이드를 통해 Voice Journal의 오프라인 우선 저장소 시스템을 완전히 이해하고 운영할 수 있습니다.