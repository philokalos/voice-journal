# Realtime Sync & Dashboard Guide

## 📋 개요
Voice Journal의 실시간 동기화 및 오프라인 지원 시스템 가이드입니다.

## 🔄 실시간 동기화 아키텍처

### 1. Supabase Realtime
```typescript
// 실시간 연결 설정
const subscription = RealtimeClient.subscribeToUserEntries(
  userId,
  (event) => {
    // 실시간 이벤트 처리
    console.log('Event:', event.eventType, event.new);
  }
);
```

### 2. 지원되는 이벤트
- **INSERT**: 새로운 엔트리 추가
- **UPDATE**: 기존 엔트리 수정
- **DELETE**: 엔트리 삭제

### 3. 데이터 플로우
```
사용자 입력 → 로컬 캐시 업데이트 → Supabase → 실시간 이벤트 → 다른 클라이언트 업데이트
```

## 🎣 React Hooks 사용법

### useRealtimeEntries
```typescript
const {
  entries,           // 실시간 엔트리 데이터
  isLoading,         // 로딩 상태
  connectionStatus,  // 연결 상태
  isConnected,       // 연결 여부
  lastUpdate,        // 마지막 업데이트 시간
  entriesCount,      // 엔트리 개수
  refreshEntries,    // 수동 새로고침
  reconnect          // 재연결
} = useRealtimeEntries({
  onEntryAdded: (entry) => {
    console.log('New entry:', entry.date);
  },
  onEntryUpdated: (entry) => {
    console.log('Updated entry:', entry.date);
  },
  onEntryDeleted: (entryId) => {
    console.log('Deleted entry:', entryId);
  }
});
```

### useOfflineSync
```typescript
const {
  isOnline,          // 온라인 상태
  isSyncing,         // 동기화 진행 중
  hasPendingActions, // 대기 중인 동작
  pendingCount,      // 대기 동작 수
  forceSync,         // 강제 동기화
  getSyncStatus      // 동기화 상태 조회
} = useOfflineSync({
  onSync: (actions) => {
    console.log(`Synced ${actions.length} actions`);
  },
  onError: (error) => {
    console.error('Sync failed:', error);
  }
});
```

## 📱 오프라인 지원

### 1. 자동 감지
```typescript
// 네트워크 상태 자동 감지
window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);
```

### 2. 오프라인 액션 큐
```typescript
// 오프라인 시 액션을 로컬 저장소에 저장
interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  userId: string;
}
```

### 3. 자동 동기화
- 온라인 복귀 시 자동 동기화
- 지수 백오프로 재시도
- 실패한 액션 보존

## 🎛️ Dashboard 연동

### 1. 실시간 상태 표시
```tsx
{/* 연결 상태 인디케이터 */}
<div className={`w-2 h-2 rounded-full ${
  isConnected ? 'bg-green-500' : 
  connectionStatus === 'connecting' ? 'bg-yellow-500' : 
  'bg-red-500'
}`}></div>

{/* 동기화 상태 */}
{isSyncing && (
  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
)}
```

### 2. 대기 중인 액션 표시
```tsx
{hasPendingActions && (
  <span className="text-xs text-gray-600">
    {pendingCount} pending
  </span>
)}
```

### 3. 수동 동기화 버튼
```tsx
<button
  onClick={() => forceSync()}
  disabled={!isOnline || isSyncing}
>
  Sync Now
</button>
```

## 🚀 성능 최적화

### 1. 리스너 관리
```typescript
const optimization = useRealtimeOptimization({
  maxListeners: 10,     // 최대 리스너 수
  debounceMs: 100,      // 디바운스 시간
  enableCleanup: true   // 자동 정리 활성화
});

// 최적화된 리스너 생성
const { handler, cleanup } = optimization.createOptimizedListener(
  'entries-listener',
  handleRealtimeEvent,
  { debounce: true }
);
```

### 2. 메모리 사용량 모니터링
```typescript
const usage = optimization.getMemoryUsage();
console.log('Active listeners:', usage.activeListeners);
console.log('Pending timers:', usage.pendingTimers);
```

### 3. 배치 처리
```typescript
// 여러 작업을 배치로 처리
optimization.batchOperations([
  () => updateEntry1(),
  () => updateEntry2(),
  () => updateEntry3()
]);
```

## 🔧 설정 및 커스터마이징

### 1. Realtime 클라이언트 설정
```typescript
// 커스텀 필터로 구독
const subscription = RealtimeClient.subscribeToTable(
  'entries',
  handleEvent,
  { column: 'user_id', value: userId }
);
```

### 2. 오프라인 스토리지 설정
```typescript
// 로컬 스토리지 키
const PENDING_ACTIONS_KEY = 'voice-journal-pending-actions';
const LAST_SYNC_KEY = 'voice-journal-last-sync';
```

### 3. React Query 네트워크 모드
```typescript
queryClient.setDefaultOptions({
  queries: {
    networkMode: isOnline ? 'online' : 'offlineFirst',
    retry: isOnline ? 3 : false,
  },
  mutations: {
    networkMode: isOnline ? 'online' : 'offlineFirst',
    retry: isOnline ? 1 : false,
  },
});
```

## 🐛 트러블슈팅

### 1. 연결 문제
```typescript
// 연결 상태 확인
const status = RealtimeClient.getConnectionStatus();
console.log('Connection status:', status);

// 강제 재연결
if (status === 'disconnected') {
  reconnect();
}
```

### 2. 메모리 누수 방지
```typescript
// 컴포넌트 언마운트 시 정리
useEffect(() => {
  return () => {
    subscription?.unsubscribe();
    optimization.cleanupAllListeners();
  };
}, []);
```

### 3. 동기화 실패 처리
```typescript
// 수동 재시도
try {
  await forceSync();
} catch (error) {
  console.error('Sync failed:', error);
  // 사용자에게 알림 표시
}
```

## 📊 모니터링 및 로깅

### 1. 연결 상태 로깅
```typescript
// 연결 이벤트 로깅
supabase.realtime.channels.forEach(channel => {
  channel.subscribe((status) => {
    console.log(`Channel ${channel.topic} status:`, status);
  });
});
```

### 2. 성능 측정
```typescript
// 작업 수행 시간 측정
const duration = optimization.measurePerformance('update-entries', () => {
  updateMultipleEntries();
});

if (duration > 100) {
  console.warn('Slow operation detected:', duration);
}
```

### 3. 오프라인 액션 추적
```typescript
// 대기 중인 액션 로깅
console.log('Pending actions:', getSyncStatus());
```

## 🔒 보안 고려사항

### 1. RLS 정책 준수
- 모든 실시간 구독은 RLS 정책을 자동으로 준수
- 사용자는 자신의 데이터만 수신

### 2. 인증 토큰 관리
```typescript
// 토큰 만료 시 재연결
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    // 실시간 연결 갱신
    reconnect();
  }
});
```

### 3. 데이터 검증
```typescript
// 수신된 데이터 검증
const handleRealtimeEvent = (event) => {
  if (!isValidEntry(event.new)) {
    console.warn('Invalid data received:', event);
    return;
  }
  // 처리 계속...
};
```

## 🚀 배포 시 고려사항

### 1. 환경 변수
```bash
# Supabase 설정
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# 실시간 기능 활성화
SUPABASE_REALTIME_ENABLED=true
```

### 2. 네트워크 정책
- WebSocket 연결 허용 (포트 443)
- CORS 설정 확인
- SSL/TLS 인증서 유효성

### 3. 스케일링
- 동시 연결 수 모니터링
- 채널 수 제한 설정
- 리소스 사용량 추적

## 📈 성능 벤치마크

### 목표 지표
- 실시간 업데이트 지연: < 300ms
- 오프라인 → 온라인 동기화: < 5s
- 메모리 사용량: < 50MB
- 연결 재시도: < 3회

### 측정 방법
```typescript
// 지연 시간 측정
const startTime = Date.now();
// ... 실시간 이벤트 수신
const latency = Date.now() - startTime;
console.log('Realtime latency:', latency, 'ms');
```