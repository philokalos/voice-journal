import React, { useState, useRef, useEffect } from 'react'
import { SentimentService } from '../domains/journaling/services/sentimentService'
import type { Entry } from '../shared/types/entry'
import type { OfflineEntry } from '../domains/journaling/services/offlineStorageService'

interface SwipeableEntryCardProps {
  entry: Entry | OfflineEntry
  onDelete: (entryId: string) => void
  onEdit?: (entryId: string) => void
  index: number
}

export const SwipeableEntryCard: React.FC<SwipeableEntryCardProps> = ({
  entry,
  onDelete,
  onEdit,
  index
}) => {
  const [isSwipeOpen, setIsSwipeOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragX, setDragX] = useState(0)
  const cardRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const currentXRef = useRef(0)

  // Handle both Entry and OfflineEntry types
  const entryId = 'id' in entry ? entry.id : entry.localId
  const isOffline = !('id' in entry) || ('syncStatus' in entry && entry.syncStatus === 'pending')

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    startXRef.current = touch.clientX
    currentXRef.current = touch.clientX
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    
    const touch = e.touches[0]
    currentXRef.current = touch.clientX
    const deltaX = currentXRef.current - startXRef.current
    
    // Only allow left swipe (negative deltaX)
    if (deltaX < 0) {
      setDragX(Math.max(deltaX, -120)) // Limit swipe distance
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    
    const deltaX = currentXRef.current - startXRef.current
    
    // Threshold for opening actions
    if (deltaX < -60) {
      setIsSwipeOpen(true)
      setDragX(-120)
    } else {
      setIsSwipeOpen(false)
      setDragX(0)
    }
    
    setIsDragging(false)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    startXRef.current = e.clientX
    currentXRef.current = e.clientX
    setIsDragging(true)
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      currentXRef.current = e.clientX
      const deltaX = currentXRef.current - startXRef.current
      
      if (deltaX < 0) {
        setDragX(Math.max(deltaX, -120))
      }
    }
    
    const handleMouseUp = () => {
      const deltaX = currentXRef.current - startXRef.current
      
      if (deltaX < -60) {
        setIsSwipeOpen(true)
        setDragX(-120)
      } else {
        setIsSwipeOpen(false)
        setDragX(0)
      }
      
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const closeSwipe = () => {
    setIsSwipeOpen(false)
    setDragX(0)
  }

  const handleDelete = () => {
    onDelete(entryId)
    closeSwipe()
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit(entryId)
    }
    closeSwipe()
  }

  // Close swipe when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        closeSwipe()
      }
    }

    if (isSwipeOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSwipeOpen])

  return (
    <div 
      ref={cardRef}
      className="relative overflow-hidden animate-slide-up"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Action Buttons (Hidden behind card) */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center z-10">
        <div className="flex items-center h-full">
          {onEdit && (
            <button
              onClick={handleEdit}
              className="h-full px-6 bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors flex items-center justify-center"
              style={{ width: '60px' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
            </button>
          )}
          <button
            onClick={handleDelete}
            className="h-full px-6 bg-red-500 hover:bg-red-600 text-white font-medium transition-colors flex items-center justify-center"
            style={{ width: '60px' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Card Content */}
      <div
        className="relative bg-white transition-transform duration-300 ease-out touch-manipulation"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div className="hover:bg-white hover:bg-opacity-20 transition-all duration-400 group" style={{padding: 'var(--spacing-xl) var(--spacing-2xl)'}}>
          <div className="flex justify-between items-start" style={{marginBottom: 'var(--spacing-lg)'}}>
            <div className="flex items-center" style={{gap: 'var(--spacing-lg)'}}>
              <div className="glass-card-strong relative overflow-hidden flex-shrink-0" style={{width: 'var(--spacing-2xl)', height: 'var(--spacing-2xl)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <div className={`absolute inset-0 bg-gradient-to-br ${isOffline ? 'from-yellow-400 to-orange-500' : 'from-indigo-400 to-purple-500'} opacity-70`}></div>
                <svg className="text-white relative z-10" style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  {isOffline ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  )}
                </svg>
              </div>
              <div>
                <div className="flex items-center" style={{gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)'}}>
                  <h3 style={{
                    fontSize: 'var(--text-base)', 
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-neutral-800)'
                  }}>
                    {new Date(entry.created_at).toLocaleDateString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short'
                    })}
                  </h3>
                  {isOffline && (
                    <span className="glass-card bg-yellow-100 bg-opacity-80 text-yellow-800" style={{
                      padding: 'var(--spacing-xs) var(--spacing-sm)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--font-weight-medium)',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      동기화 대기
                    </span>
                  )}
                </div>
                <p style={{
                  fontSize: 'var(--text-sm)', 
                  color: 'var(--color-neutral-500)',
                  fontWeight: 'var(--font-weight-normal)'
                }}>
                  {new Date(entry.created_at).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {/* Desktop delete button (hidden on mobile) */}
            <button
              onClick={handleDelete}
              className="glass-card transition-all duration-400 opacity-0 group-hover:opacity-100 transform hover:scale-110 touch-target hidden md:flex"
              style={{color: 'var(--color-neutral-400)'}}
              aria-label="Delete entry"
            >
              <svg className="icon-button" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>

            {/* Mobile swipe indicator */}
            <div className="md:hidden flex items-center opacity-50">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          </div>

          <div className="glass-card bg-gray-50 bg-opacity-40" style={{padding: 'var(--spacing-lg)', marginLeft: 'var(--spacing-4xl)'}}>
            {/* Sentiment Score Display */}
            {entry.sentiment_score !== undefined && entry.sentiment_score !== 0.5 && (
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white border-opacity-20">
                <div className="flex items-center" style={{gap: 'var(--spacing-md)'}}>
                  <div 
                    className="glass-card-strong" 
                    style={{
                      width: 'var(--spacing-lg)', 
                      height: 'var(--spacing-lg)',
                      backgroundColor: SentimentService.getSentimentColor(entry.sentiment_score),
                      opacity: 0.8
                    }}
                  ></div>
                  <span style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-600)'
                  }}>
                    감정: {SentimentService.getSentimentDescription(entry.sentiment_score)}
                  </span>
                </div>
                <div className="glass-card bg-white bg-opacity-30" style={{padding: 'var(--spacing-xs) var(--spacing-md)'}}>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-neutral-500)',
                    fontWeight: 'var(--font-weight-medium)'
                  }}>
                    {Math.round(entry.sentiment_score * 100)}%
                  </span>
                </div>
              </div>
            )}
            
            <p className="leading-relaxed whitespace-pre-wrap" style={{
              fontSize: 'var(--text-base)', 
              color: 'var(--color-neutral-700)',
              fontWeight: 'var(--font-weight-normal)',
              lineHeight: '1.7'
            }}>
              {entry.transcript}
            </p>
          </div>
          
          {/* AI Analysis Results Display */}
          {(entry.wins?.length || entry.regrets?.length || entry.tasks?.length || entry.keywords?.length) && (
            <div className="mt-4 pt-4 border-t border-white border-opacity-20" style={{marginLeft: 'var(--spacing-4xl)'}}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {entry.wins && entry.wins.length > 0 && (
                  <div className="glass-card bg-green-50 bg-opacity-30" style={{padding: 'var(--spacing-md)'}}>
                    <div className="flex items-center mb-2" style={{gap: 'var(--spacing-sm)'}}>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-neutral-700)'
                      }}>
                        성과
                      </span>
                    </div>
                    {entry.wins.map((win, i) => (
                      <div key={i} className="glass-card bg-white bg-opacity-40 mb-2" style={{padding: 'var(--spacing-sm)'}}>
                        <p style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-neutral-600)',
                          lineHeight: '1.4'
                        }}>
                          {win}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                
                {entry.regrets && entry.regrets.length > 0 && (
                  <div className="glass-card bg-orange-50 bg-opacity-30" style={{padding: 'var(--spacing-md)'}}>
                    <div className="flex items-center mb-2" style={{gap: 'var(--spacing-sm)'}}>
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-neutral-700)'
                      }}>
                        아쉬운 점
                      </span>
                    </div>
                    {entry.regrets.map((regret, i) => (
                      <div key={i} className="glass-card bg-white bg-opacity-40 mb-2" style={{padding: 'var(--spacing-sm)'}}>
                        <p style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-neutral-600)',
                          lineHeight: '1.4'
                        }}>
                          {regret}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                
                {entry.tasks && entry.tasks.length > 0 && (
                  <div className="glass-card bg-blue-50 bg-opacity-30" style={{padding: 'var(--spacing-md)'}}>
                    <div className="flex items-center mb-2" style={{gap: 'var(--spacing-sm)'}}>
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-neutral-700)'
                      }}>
                        할 일
                      </span>
                    </div>
                    {entry.tasks.map((task, i) => (
                      <div key={i} className="glass-card bg-white bg-opacity-40 mb-2" style={{padding: 'var(--spacing-sm)'}}>
                        <p style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-neutral-600)',
                          lineHeight: '1.4'
                        }}>
                          {task}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                
                {entry.keywords && entry.keywords.length > 0 && (
                  <div className="glass-card bg-purple-50 bg-opacity-30" style={{padding: 'var(--spacing-md)'}}>
                    <div className="flex items-center mb-2" style={{gap: 'var(--spacing-sm)'}}>
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-neutral-700)'
                      }}>
                        키워드
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {entry.keywords.map((keyword, i) => (
                        <span key={i} className="glass-card bg-white bg-opacity-60 inline-flex items-center" style={{
                          padding: 'var(--spacing-xs) var(--spacing-sm)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 'var(--font-weight-medium)',
                          color: 'var(--color-neutral-600)',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}