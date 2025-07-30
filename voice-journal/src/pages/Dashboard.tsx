import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../domains/auth/hooks/useAuth'
import { shouldShowOnboarding } from '../utils/onboarding'
import { VoiceRecorder } from '../domains/journaling/components/VoiceRecorder'
import { SyncStatusIndicator } from '../domains/journaling/components/SyncStatusIndicator'
import { MobileBottomNav } from '../components/MobileBottomNav'
import { SwipeableEntryCard } from '../components/SwipeableEntryCard'
import { EntryService } from '../domains/journaling/services/entryService'
import { SyncService } from '../domains/journaling/services/syncService'
import type { Entry } from '../shared/types/entry'
import type { OfflineEntry } from '../domains/journaling/services/offlineStorageService'

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [entries, setEntries] = useState<(Entry | OfflineEntry)[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Initialize sync service
  useEffect(() => {
    SyncService.initialize()
    
    return () => {
      SyncService.destroy()
    }
  }, [])

  // Check for onboarding completion
  useEffect(() => {
    if (user && shouldShowOnboarding()) {
      navigate('/onboarding')
    }
  }, [user, navigate])

  // Load entries on mount
  useEffect(() => {
    const loadEntries = async () => {
      if (!user) return
      
      try {
        setIsLoading(true)
        const userEntries = await EntryService.getEntries()
        setEntries(userEntries)
        
        // Trigger immediate sync on load if online
        if (navigator.onLine) {
          console.log('🔄 Triggering initial sync on dashboard load')
          SyncService.sync().catch(error => {
            console.warn('Initial sync failed:', error)
          })
        }
      } catch (error) {
        console.error('Failed to load entries:', error)
        setVoiceError('Failed to load entries. Please refresh the page.')
      } finally {
        setIsLoading(false)
      }
    }

    loadEntries()
  }, [user])

  const handleSave = async () => {
    console.log('🔄 handleSave called', { hasText: !!text.trim(), hasUser: !!user, text: text.substring(0, 50) })
    
    if (!text.trim()) {
      console.warn('❌ No text to save')
      setVoiceError('텍스트를 입력해주세요.')
      return
    }
    
    if (!user) {
      console.warn('❌ No user authenticated')
      setVoiceError('로그인이 필요합니다.')
      return
    }
    
    try {
      console.log('📝 Starting entry creation...')
      setIsSaving(true)
      setVoiceError(null)

      const entryData = {
        transcript: text,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        keywords: [],
        wins: [],
        regrets: [],
        tasks: []
      }
      
      console.log('📦 Entry data prepared:', entryData)

      const newEntry = await EntryService.createEntry(entryData)
      console.log('✅ Entry created successfully:', newEntry)

      // Add to local state
      setEntries(prev => {
        console.log('📊 Adding to entries list, current count:', prev.length)
        return [newEntry, ...prev]
      })
      
      setText('')
      setIsVoiceMode(false)
      
      // Log entry ID (could be localId for offline entries)
      const entryId = 'id' in newEntry ? newEntry.id : newEntry.localId
      console.log('🎉 Entry saved successfully:', entryId)
      
      // Trigger immediate sync if online
      if (navigator.onLine) {
        console.log('🔄 Triggering immediate sync after entry creation')
        SyncService.sync().catch(error => {
          console.warn('Post-save sync failed:', error)
        })
      }
      
      // Show success message
      alert('일기가 성공적으로 저장되었습니다!')
    } catch (error) {
      console.error('❌ Failed to save entry:', error)
      setVoiceError(`저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      console.log('🏁 handleSave completed')
      setIsSaving(false)
    }
  }

  const handleVoiceTranscript = (transcript: string, confidence?: number) => {
    setText(transcript)
    setVoiceError(null)
    console.log(`Voice transcript received (confidence: ${confidence}): ${transcript}`)
  }

  const handleVoiceError = (error: string) => {
    setVoiceError(error)
    console.error('Voice recording error:', error)
  }

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await EntryService.deleteEntry(entryId)
      setEntries(prev => prev.filter(entry => {
        // Handle both Entry and OfflineEntry types
        const id = 'id' in entry ? entry.id : entry.localId
        return id !== entryId
      }))
      console.log('Entry deleted successfully:', entryId)
    } catch (error) {
      console.error('Failed to delete entry:', error)
      setVoiceError('Failed to delete entry. Please try again.')
    }
  }

  return (
    <div className="min-h-screen relative">
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
      
      {/* Modern Navigation Header */}
      <nav className="glass-nav sticky top-0 z-40">
        <div className="max-w-4xl mx-auto" style={{padding: '0 var(--spacing-lg)'}}>
          <div className="flex justify-between items-center h-full">
            <div className="flex items-center" style={{gap: 'var(--spacing-lg)'}}>
              <div className="glass-card-strong relative overflow-hidden" style={{
                width: 'var(--spacing-2xl)',
                height: 'var(--spacing-2xl)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-90"></div>
                <svg className="text-white relative z-10" style={{width: '24px', height: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>
            
            <div className="flex items-center" style={{gap: 'var(--spacing-md)'}}>
              <span className="hidden sm:block" style={{
                fontSize: 'var(--text-sm)', 
                color: 'var(--color-neutral-600)',
                fontWeight: 'var(--font-weight-medium)',
                marginRight: 'var(--spacing-sm)'
              }}>
                {user?.email?.split('@')[0]}님
              </span>
              <button
                onClick={() => navigate('/settings')}
                className="glass-card transition-all duration-400 hover:scale-105 touch-target"
                style={{color: 'var(--color-neutral-600)'}}
                aria-label="Settings"
              >
                <svg className="icon-button" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                onClick={handleSignOut}
                className="glass-card transition-all duration-400 hover:scale-105 touch-target"
                style={{color: 'var(--color-neutral-600)'}}
                aria-label="Sign out"
              >
                <svg className="icon-button" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 pb-24" style={{padding: 'var(--spacing-2xl) var(--spacing-lg) calc(var(--spacing-2xl) + 80px + env(safe-area-inset-bottom, 0px)) var(--spacing-lg)'}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4xl)'}}>
          {/* Modern Write Entry */}
          <div className="glass-card animate-slide-up" style={{padding: 'var(--spacing-4xl)'}}>
            <div className="flex items-center justify-between" style={{marginBottom: 'var(--spacing-4xl)'}}>
              <div className="flex items-center" style={{gap: 'var(--spacing-lg)'}}>
                <div className="glass-card-strong relative overflow-hidden" style={{width: 'var(--spacing-3xl)', height: 'var(--spacing-3xl)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-90"></div>
                  <svg className="text-white relative z-10" style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                  </svg>
                </div>
              </div>
              
              {/* Modern Input Mode Toggle */}
              <div className="glass-card flex items-center" style={{padding: 'var(--spacing-xs)'}}>
                <button
                  onClick={() => setIsVoiceMode(false)}
                  className={`flex items-center transition-all duration-400 ${
                    !isVoiceMode 
                      ? 'glass-button text-white transform scale-105' 
                      : 'hover:bg-white hover:bg-opacity-10'
                  }`}
                  style={{
                    padding: `var(--spacing-md) var(--spacing-lg)`,
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-sm)',
                    gap: 'var(--spacing-md)',
                    height: 'var(--spacing-2xl)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: !isVoiceMode ? 'white' : 'var(--color-neutral-600)'
                  }}
                >
                  <svg className="icon-standard" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                  </svg>
                  <span>타이핑</span>
                </button>
                <button
                  onClick={() => setIsVoiceMode(true)}
                  className={`flex items-center transition-all duration-400 ${
                    isVoiceMode 
                      ? 'glass-button text-white transform scale-105' 
                      : 'hover:bg-white hover:bg-opacity-10'
                  }`}
                  style={{
                    padding: `var(--spacing-md) var(--spacing-lg)`,
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-sm)',
                    gap: 'var(--spacing-md)',
                    height: 'var(--spacing-2xl)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: isVoiceMode ? 'white' : 'var(--color-neutral-600)'
                  }}
                >
                  <svg className="icon-standard" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                  <span>음성</span>
                </button>
              </div>
            </div>

            {/* Input Area */}
            {isVoiceMode ? (
              <div className="space-y-4">
                {/* Voice Error Display */}
                {voiceError && (
                  <div className="glass-card bg-red-50 bg-opacity-80 border-red-200 animate-slide-up" style={{padding: 'var(--spacing-md)'}}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center" style={{gap: 'var(--spacing-sm)'}}>
                        <svg className="icon-standard text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <p className="text-red-700 font-medium" style={{fontSize: 'var(--text-sm)'}}>{voiceError}</p>
                      </div>
                      <button 
                        onClick={() => setVoiceError(null)}
                        className="text-red-500 hover:text-red-700 transition-colors hover:scale-110 transform"
                        style={{padding: 'var(--spacing-xs)'}}
                      >
                        <svg className="icon-standard" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Voice Recorder */}
                <div className="glass-card bg-gradient-to-br from-purple-50 to-blue-50 bg-opacity-50 p-8 relative overflow-hidden">
                  {/* Decorative elements */}
                  <div className="absolute top-4 right-4 w-16 h-16 bg-white bg-opacity-10 rounded-full animate-float"></div>
                  <div className="absolute bottom-4 left-4 w-12 h-12 bg-white bg-opacity-10 rounded-full animate-float" style={{animationDelay: '2s'}}></div>
                  
                  <VoiceRecorder
                    onTranscriptReady={handleVoiceTranscript}
                    onError={handleVoiceError}
                    language="ko"
                    className="flex flex-col items-center relative z-10"
                  />
                </div>
                
                {/* Modern Transcript Display */}
                {text && (
                  <div className="animate-slide-up" style={{display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)'}}>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="전사된 내용을 여기서 수정할 수 있습니다..."
                      className="w-full glass-input textarea outline-none"
                      style={{padding: 'var(--spacing-lg)', fontSize: 'var(--text-base)'}}
                    />
                  </div>
                )}
              </div>
            ) : (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="오늘은 어떤 하루였나요? 당신의 이야기를 들려주세요..."
                className="w-full glass-input textarea outline-none"
                style={{padding: 'var(--spacing-lg)', fontSize: 'var(--text-base)'}}
              />
            )}
            
            <div className="flex justify-end" style={{marginTop: 'var(--spacing-2xl)'}}>
              <button
                onClick={handleSave}
                disabled={!text.trim() || isSaving}
                className="glass-button outline-none"
                style={{padding: 'var(--spacing-lg) var(--spacing-2xl)'}}
              >
                {isSaving ? (
                  <>
                    <svg className="icon-standard animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>저장 중</span>
                  </>
                ) : (
                  <>
                    <svg className="icon-standard" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                    </svg>
                    <span>저장</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Modern Entries Section */}
          <div className="glass-card overflow-hidden animate-slide-up" style={{animationDelay: '0.2s'}}>
            <div className="border-b border-white border-opacity-15" style={{padding: 'var(--spacing-xl) var(--spacing-2xl)'}}>
              <div className="flex items-center justify-between">
                <div className="flex items-center" style={{gap: 'var(--spacing-lg)'}}>
                  <div className="glass-card-strong relative overflow-hidden" style={{width: 'var(--spacing-3xl)', height: 'var(--spacing-3xl)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-90"></div>
                    <svg className="text-white relative z-10" style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <h2 className="font-bold text-gradient" style={{fontSize: 'var(--text-xl)'}}>나의 일기</h2>
                </div>
                <div className="flex items-center" style={{gap: 'var(--spacing-lg)'}}>
                  {/* Generate Summary Button */}
                  {entries.length > 0 && (
                    <button
                      onClick={() => {
                        // TODO: Implement summary generation
                        alert('요약 생성 기능은 준비 중입니다!')
                      }}
                      className="glass-button flex items-center"
                      style={{padding: 'var(--spacing-md) var(--spacing-lg)', gap: 'var(--spacing-sm)'}}
                    >
                      <svg className="icon-standard" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3-6h2.25m0 0l1.5-1.5m-1.5 1.5l1.5 1.5M5.625 3H18a2.25 2.25 0 012.25 2.25v4.5H15.75a2.25 2.25 0 00-2.25 2.25v4.5H5.625A2.625 2.625 0 013 13.125V5.625A2.625 2.625 0 015.625 3z" />
                      </svg>
                      <span>요약 생성</span>
                    </button>
                  )}
                  
                  {/* Sync Status Indicator */}
                  {user && (
                    <div className="glass-card bg-opacity-60" style={{padding: 'var(--spacing-sm) var(--spacing-md)'}}>
                      <SyncStatusIndicator userId={user.uid} />
                    </div>
                  )}
                  {entries.length > 0 && (
                    <div className="glass-card bg-opacity-60" style={{padding: 'var(--spacing-md) var(--spacing-lg)'}}>
                      <span style={{
                        fontSize: 'var(--text-sm)', 
                        color: 'var(--color-neutral-600)',
                        fontWeight: 'var(--font-weight-medium)'
                      }}>
                        {entries.length}개
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="divide-y divide-white divide-opacity-20">
              {isLoading ? (
                <div className="text-center" style={{padding: 'var(--spacing-2xl) var(--spacing-xl)'}}>
                  <div className="glass-card mx-auto animate-pulse-glow" style={{width: 'var(--spacing-3xl)', height: 'var(--spacing-3xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--spacing-lg)'}}>
                    <div className="border-2 border-purple-500 border-t-transparent rounded-full animate-spin" style={{width: 'var(--spacing-lg)', height: 'var(--spacing-lg)'}}></div>
                  </div>
                  <p className="text-gray-700 font-medium" style={{fontSize: 'var(--text-base)'}}>일기를 불러오는 중...</p>
                  <p className="text-gray-500" style={{fontSize: 'var(--text-sm)', marginTop: 'var(--spacing-sm)'}}>잠시만 기다려주세요</p>
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center" style={{padding: 'var(--spacing-3xl) var(--spacing-xl)'}}>
                  <div className="glass-card mx-auto relative overflow-hidden" style={{width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--spacing-lg)'}}>
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-blue-400 opacity-20"></div>
                    <svg className="text-gray-600 relative z-10" style={{width: '32px', height: '32px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-gradient" style={{fontSize: 'var(--text-2xl)', marginBottom: 'var(--spacing-md)'}}>아직 작성된 일기가 없습니다</h3>
                  <p className="text-gray-600" style={{fontSize: 'var(--text-base)', marginBottom: 'var(--spacing-lg)'}}>위에서 첫 번째 일기를 작성해보세요!</p>
                  <div className="glass-card bg-gradient-to-r from-purple-50 to-blue-50 bg-opacity-50 max-w-md mx-auto" style={{padding: 'var(--spacing-md)'}}>
                    <p className="text-gray-700" style={{fontSize: 'var(--text-sm)'}}>팁: 음성이나 텍스트로 자유롭게 작성할 수 있어요!</p>
                  </div>
                </div>
              ) : (
                entries.map((entry, index) => {
                  // Handle both Entry and OfflineEntry types
                  const entryId = 'id' in entry ? entry.id : entry.localId
                  
                  return (
                    <SwipeableEntryCard
                      key={entryId}
                      entry={entry}
                      onDelete={handleDeleteEntry}
                      index={index}
                    />
                  )
                })
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}