import React, { useState } from 'react'
import { ConflictEntry, SyncService } from '../services/syncService'
import type { Entry } from '../../../shared/types/entry'
import { OfflineEntry } from '../services/offlineStorageService'

interface ConflictResolutionProps {
  conflicts: ConflictEntry[]
  onResolve: (resolvedCount: number) => void
  onClose: () => void
}

export const ConflictResolution: React.FC<ConflictResolutionProps> = ({
  conflicts,
  onResolve,
  onClose
}) => {
  const [resolving, setResolving] = useState<string[]>([])
  const [resolved, setResolved] = useState<string[]>([])

  const handleResolveConflict = async (
    conflict: ConflictEntry,
    resolution: 'useLocal' | 'useServer' | 'merge'
  ) => {
    const conflictId = `${conflict.localEntry.localId}-${conflict.serverEntry.id}`
    
    setResolving(prev => [...prev, conflictId])
    
    try {
      await SyncService.resolveConflict(conflict, resolution)
      setResolved(prev => [...prev, conflictId])
      setResolving(prev => prev.filter(id => id !== conflictId))
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
      setResolving(prev => prev.filter(id => id !== conflictId))
      alert('충돌 해결에 실패했습니다. 다시 시도해주세요.')
    }
  }

  const handleResolveAll = async (resolution: 'useLocal' | 'useServer' | 'merge') => {
    const unresolvedConflicts = conflicts.filter(conflict => {
      const conflictId = `${conflict.localEntry.localId}-${conflict.serverEntry.id}`
      return !resolved.includes(conflictId)
    })

    setResolving(unresolvedConflicts.map(conflict => 
      `${conflict.localEntry.localId}-${conflict.serverEntry.id}`
    ))

    let resolvedCount = 0
    for (const conflict of unresolvedConflicts) {
      try {
        await SyncService.resolveConflict(conflict, resolution)
        const conflictId = `${conflict.localEntry.localId}-${conflict.serverEntry.id}`
        setResolved(prev => [...prev, conflictId])
        resolvedCount++
      } catch (error) {
        console.error('Failed to resolve conflict:', error)
      }
    }

    setResolving([])
    
    if (resolvedCount === unresolvedConflicts.length) {
      onResolve(resolvedCount)
    } else {
      alert(`${resolvedCount}/${unresolvedConflicts.length} 충돌이 해결되었습니다.`)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                동기화 충돌 해결
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {conflicts.length}개의 충돌된 항목이 발견되었습니다. 각 충돌에 대해 해결 방법을 선택해주세요.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="닫기"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {conflicts.length > 1 && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">모든 충돌 일괄 처리:</h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleResolveAll('useLocal')}
                disabled={resolving.length > 0}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                모두 로컬 버전 사용
              </button>
              <button
                onClick={() => handleResolveAll('useServer')}
                disabled={resolving.length > 0}
                className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                모두 서버 버전 사용
              </button>
              <button
                onClick={() => handleResolveAll('merge')}
                disabled={resolving.length > 0}
                className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                모두 병합
              </button>
            </div>
          </div>
        )}

        <div className="p-6 space-y-6">
          {conflicts.map((conflict, index) => {
            const conflictId = `${conflict.localEntry.localId}-${conflict.serverEntry.id}`
            const isResolving = resolving.includes(conflictId)
            const isResolved = resolved.includes(conflictId)

            return (
              <div
                key={conflictId}
                className={`border rounded-lg p-4 ${
                  isResolved ? 'bg-green-50 border-green-200' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      충돌 #{index + 1}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span>날짜: {formatDate(conflict.localEntry.date)}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        conflict.conflictType === 'duplicate' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {conflict.conflictType === 'duplicate' ? '중복' : '수정됨'}
                      </span>
                    </div>
                  </div>
                  {isResolved && (
                    <div className="text-green-600 text-sm font-medium">
                      ✓ 해결됨
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {/* Local Version */}
                  <div className="border rounded p-3 bg-blue-50 border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414L10 14.414l-3.707-3.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      로컬 버전
                    </h4>
                    <div className="text-sm text-gray-700 space-y-2">
                      <p><strong>내용:</strong> {truncateText(conflict.localEntry.transcript)}</p>
                      <p><strong>생성:</strong> {formatDate(conflict.localEntry.created_at)}</p>
                      <p><strong>수정:</strong> {formatDate(conflict.localEntry.updated_at)}</p>
                      {conflict.localEntry.sentiment_score && (
                        <p><strong>감정 점수:</strong> {conflict.localEntry.sentiment_score.toFixed(2)}</p>
                      )}
                    </div>
                  </div>

                  {/* Server Version */}
                  <div className="border rounded p-3 bg-green-50 border-green-200">
                    <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2 9.5A3.5 3.5 0 005.5 13H9v2.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 15.586V13h3.5a3.5 3.5 0 100-7H11V3.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 3.414V6H5.5A3.5 3.5 0 002 9.5z" clipRule="evenodd" />
                      </svg>
                      서버 버전
                    </h4>
                    <div className="text-sm text-gray-700 space-y-2">
                      <p><strong>내용:</strong> {truncateText(conflict.serverEntry.transcript)}</p>
                      <p><strong>생성:</strong> {formatDate(conflict.serverEntry.created_at)}</p>
                      <p><strong>수정:</strong> {formatDate(conflict.serverEntry.updated_at)}</p>
                      {conflict.serverEntry.sentiment_score && (
                        <p><strong>감정 점수:</strong> {conflict.serverEntry.sentiment_score.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </div>

                {!isResolved && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleResolveConflict(conflict, 'useLocal')}
                      disabled={isResolving}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isResolving && (
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      로컬 버전 사용
                    </button>
                    <button
                      onClick={() => handleResolveConflict(conflict, 'useServer')}
                      disabled={isResolving}
                      className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isResolving && (
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      서버 버전 사용
                    </button>
                    <button
                      onClick={() => handleResolveConflict(conflict, 'merge')}
                      disabled={isResolving}
                      className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isResolving && (
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      병합하기
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              해결됨: {resolved.length} / {conflicts.length}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                나중에 처리
              </button>
              {resolved.length === conflicts.length && (
                <button
                  onClick={() => onResolve(resolved.length)}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  완료
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}