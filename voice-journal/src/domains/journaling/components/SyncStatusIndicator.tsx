import React, { useState, useEffect, useCallback } from 'react'
import { SyncService, SyncStatus, SyncProgress, SyncResult, ConflictEntry } from '../services/syncService'
import { ConflictResolution } from './ConflictResolution'

interface SyncStatusIndicatorProps {
  userId: string
  className?: string
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  userId,
  className = ''
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [syncStats, setSyncStats] = useState<{
    offline: { total: number; pending: number; synced: number; failed: number }
    lastSync?: string
  } | null>(null)
  const [conflicts, setConflicts] = useState<ConflictEntry[]>([])
  const [showConflictResolution, setShowConflictResolution] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)

  // Update sync stats
  const updateStats = useCallback(async () => {
    try {
      const stats = await SyncService.getSyncStats(userId)
      setSyncStats(stats)
    } catch (error) {
      console.error('Failed to get sync stats:', error)
    }
  }, [userId])

  useEffect(() => {
    // Set initial status
    setSyncStatus(SyncService.getSyncStatus())
    updateStats()

    // Add sync listener
    const handleSyncStatusChange = (status: SyncStatus, progress?: SyncProgress) => {
      setSyncStatus(status)
      setSyncProgress(progress || null)
      
      // Update stats when sync completes
      if (status === 'idle' || status === 'error') {
        updateStats()
      }
    }

    SyncService.addSyncListener(handleSyncStatusChange)

    // Cleanup on unmount
    return () => {
      SyncService.removeSyncListener(handleSyncStatusChange)
    }
  }, [userId, updateStats])

  const handleManualSync = async () => {
    try {
      const result = await SyncService.sync()
      setLastSyncResult(result)
      
      if (result.conflicts.length > 0) {
        setConflicts(result.conflicts)
        setShowConflictResolution(true)
      }
      
      await updateStats()
    } catch (error) {
      console.error('Manual sync failed:', error)
      alert('동기화에 실패했습니다. 네트워크 연결을 확인해주세요.')
    }
  }

  const handleRetryFailed = async () => {
    try {
      await SyncService.retryFailedEntries(userId)
      await updateStats()
    } catch (error) {
      console.error('Retry failed entries failed:', error)
      alert('실패한 항목 재시도에 실패했습니다.')
    }
  }

  const handleConflictResolution = (resolvedCount: number) => {
    setShowConflictResolution(false)
    setConflicts([])
    updateStats()
    
    if (resolvedCount > 0) {
      alert(`${resolvedCount}개의 충돌이 해결되었습니다.`)
    }
  }

  const formatLastSync = (lastSync?: string) => {
    if (!lastSync) return '동기화 기록 없음'
    
    const now = new Date()
    const syncTime = new Date(lastSync)
    const diffMs = now.getTime() - syncTime.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}시간 전`
    return syncTime.toLocaleDateString('ko-KR')
  }

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'syncing': return 'text-blue-600'
      case 'offline': return 'text-gray-500'
      case 'error': return 'text-red-600'
      case 'idle':
      default:
        return syncStats?.offline.pending ? 'text-yellow-600' : 'text-green-600'
    }
  }

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )
      case 'offline':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'idle':
      default:
        return syncStats?.offline.pending ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
    }
  }

  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        if (syncProgress) {
          return `동기화 중 (${syncProgress.completed}/${syncProgress.total})`
        }
        return '동기화 중...'
      case 'offline':
        return '오프라인'
      case 'error':
        return '동기화 오류'
      case 'idle':
      default:
        if (syncStats?.offline.pending) {
          return `${syncStats.offline.pending}개 대기 중`
        }
        return '동기화 완료'
    }
  }

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`flex items-center gap-2 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>

        {/* Progress bar for syncing */}
        {syncStatus === 'syncing' && syncProgress && (
          <div className="flex-1 max-w-32">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(syncProgress.completed / syncProgress.total) * 100}%`
                }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-1">
          {syncStatus === 'offline' && (
            <span className="text-xs text-gray-500">네트워크 연결 대기 중</span>
          )}
          
          {syncStatus === 'idle' && syncStats?.offline.pending ? (
            <button
              onClick={handleManualSync}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
              title="수동 동기화"
            >
              동기화
            </button>
          ) : null}
          
          {syncStats?.offline.failed ? (
            <button
              onClick={handleRetryFailed}
              className="text-xs text-red-600 hover:text-red-800 underline"
              title={`${syncStats.offline.failed}개 실패 항목 재시도`}
            >
              재시도
            </button>
          ) : null}
        </div>
      </div>

      {/* Detailed status tooltip/dropdown */}
      {syncStats && (
        <div className="text-xs text-gray-500 mt-1">
          <div className="flex items-center gap-4">
            <span>전체: {syncStats.offline.total}</span>
            <span>동기화됨: {syncStats.offline.synced}</span>
            {syncStats.offline.pending > 0 && (
              <span className="text-yellow-600">대기: {syncStats.offline.pending}</span>
            )}
            {syncStats.offline.failed > 0 && (
              <span className="text-red-600">실패: {syncStats.offline.failed}</span>
            )}
          </div>
          <div className="mt-1">
            마지막 동기화: {formatLastSync(syncStats.lastSync)}
          </div>
        </div>
      )}

      {/* Sync progress details */}
      {syncStatus === 'syncing' && syncProgress?.current && (
        <div className="text-xs text-gray-500 mt-1">
          현재 처리 중: {syncProgress.current}
        </div>
      )}

      {/* Last sync result */}
      {lastSyncResult && syncStatus === 'idle' && (
        <div className="text-xs mt-1">
          {lastSyncResult.success ? (
            <span className="text-green-600">
              동기화 완료: {lastSyncResult.synced}개 성공
              {lastSyncResult.failed > 0 && `, ${lastSyncResult.failed}개 실패`}
            </span>
          ) : (
            <span className="text-red-600">
              동기화 실패: {lastSyncResult.errors.join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Conflict Resolution Modal */}
      {showConflictResolution && conflicts.length > 0 && (
        <ConflictResolution
          conflicts={conflicts}
          onResolve={handleConflictResolution}
          onClose={() => setShowConflictResolution(false)}
        />
      )}
    </>
  )
}