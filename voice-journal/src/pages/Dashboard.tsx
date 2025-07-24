import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../domains/auth/hooks/useAuth'
import { VoiceRecorder } from '../domains/journaling/components/VoiceRecorder'
import { EntryService } from '../domains/journaling/services/entryService'
import type { Entry } from '../shared/types/entry'

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Load entries on mount
  useEffect(() => {
    const loadEntries = async () => {
      if (!user) return
      
      try {
        setIsLoading(true)
        const userEntries = await EntryService.getEntries()
        setEntries(userEntries)
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
    if (!text.trim() || !user) return
    
    try {
      setIsSaving(true)
      setVoiceError(null)

      const newEntry = await EntryService.createEntry({
        transcript: text,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        // TODO: Add AI analysis for wins, regrets, tasks, keywords
        keywords: [],
        wins: [],
        regrets: [],
        tasks: []
      })

      // Add to local state
      setEntries(prev => [newEntry, ...prev])
      setText('')
      setIsVoiceMode(false)
      
      console.log('Entry saved successfully:', newEntry.id)
    } catch (error) {
      console.error('Failed to save entry:', error)
      setVoiceError('Failed to save entry. Please try again.')
    } finally {
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
      setEntries(prev => prev.filter(entry => entry.id !== entryId))
      console.log('Entry deleted successfully:', entryId)
    } catch (error) {
      console.error('Failed to delete entry:', error)
      setVoiceError('Failed to delete entry. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation Header */}
      <nav className="bg-white backdrop-blur-sm bg-opacity-80 shadow-lg border-b border-white border-opacity-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">V</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Voice Journal
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="hidden sm:block">
                <span className="text-sm font-medium text-gray-600">
                  안녕하세요, {user?.email?.split('@')[0]}님
                </span>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-indigo-600 transition-all duration-200 hover:bg-indigo-50 rounded-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">설정</span>
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 rounded-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Write Entry */}
          <div className="bg-white backdrop-blur-sm bg-opacity-90 shadow-xl rounded-2xl p-8 border border-white border-opacity-20">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">일기 작성</h2>
                <p className="text-gray-600">오늘의 이야기를 들려주세요</p>
              </div>
              
              {/* Input Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setIsVoiceMode(false)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    !isVoiceMode 
                      ? 'bg-white text-indigo-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>텍스트</span>
                </button>
                <button
                  onClick={() => setIsVoiceMode(true)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isVoiceMode 
                      ? 'bg-white text-indigo-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <span>음성</span>
                </button>
              </div>
            </div>

            {/* Input Area */}
            {isVoiceMode ? (
              <div className="space-y-6">
                {/* Voice Error Display */}
                {voiceError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <p className="text-sm text-red-700 font-medium">{voiceError}</p>
                    </div>
                  </div>
                )}
                
                {/* Voice Recorder */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-8">
                  <VoiceRecorder
                    onTranscriptReady={handleVoiceTranscript}
                    onError={handleVoiceError}
                    language="ko"
                    className="flex flex-col items-center"
                  />
                </div>
                
                {/* Transcript Display/Edit */}
                {text && (
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">
                      전사 텍스트 (수정 가능):
                    </label>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="음성 전사 텍스트가 여기에 나타납니다..."
                      className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl bg-white focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 transition-all duration-200 resize-none"
                    />
                  </div>
                )}
              </div>
            ) : (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="오늘은 어떤 하루였나요? 당신의 이야기를 들려주세요..."
                className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl bg-white focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 transition-all duration-200 resize-none"
              />
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                disabled={!text.trim() || isSaving}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 transition-all duration-200"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>저장 중...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>일기 저장</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Previous Entries */}
          <div className="bg-white backdrop-blur-sm bg-opacity-90 shadow-xl rounded-2xl border border-white border-opacity-20 overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">나의 일기장</h2>
                    <p className="text-sm text-gray-600">{entries.length}개의 기록</p>
                  </div>
                </div>
                {entries.length > 0 && (
                  <div className="text-sm text-gray-500">
                    최신순 정렬
                  </div>
                )}
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {isLoading ? (
                <div className="px-8 py-12 text-center">
                  <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">일기를 불러오는 중...</p>
                </div>
              ) : entries.length === 0 ? (
                <div className="px-8 py-16 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">아직 작성된 일기가 없습니다</h3>
                  <p className="text-gray-600">위에서 첫 번째 일기를 작성해보세요!</p>
                </div>
              ) : (
                entries.map((entry) => (
                  <div key={entry.id} className="px-8 py-6 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex flex-col">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {new Date(entry.created_at).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              weekday: 'short'
                            })}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {new Date(entry.created_at).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                          <span>음성 일기</span>
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="flex items-center space-x-1 px-3 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 transition-all duration-150 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="text-sm">삭제</span>
                      </button>
                    </div>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-4">{entry.transcript}</p>
                    
                    {/* Display extracted data if available */}
                    {(entry.wins?.length || entry.regrets?.length || entry.tasks?.length || entry.keywords?.length) && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {entry.wins && entry.wins.length > 0 && (
                            <div>
                              <span className="font-medium text-green-700">✅ Wins:</span>
                              <ul className="list-disc list-inside text-green-600 ml-2">
                                {entry.wins.map((win, i) => <li key={i}>{win}</li>)}
                              </ul>
                            </div>
                          )}
                          {entry.regrets && entry.regrets.length > 0 && (
                            <div>
                              <span className="font-medium text-orange-700">🔄 Regrets:</span>
                              <ul className="list-disc list-inside text-orange-600 ml-2">
                                {entry.regrets.map((regret, i) => <li key={i}>{regret}</li>)}
                              </ul>
                            </div>
                          )}
                          {entry.tasks && entry.tasks.length > 0 && (
                            <div>
                              <span className="font-medium text-blue-700">📝 Tasks:</span>
                              <ul className="list-disc list-inside text-blue-600 ml-2">
                                {entry.tasks.map((task, i) => <li key={i}>{task}</li>)}
                              </ul>
                            </div>
                          )}
                          {entry.keywords && entry.keywords.length > 0 && (
                            <div>
                              <span className="font-medium text-purple-700">🏷️ Keywords:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {entry.keywords.map((keyword, i) => (
                                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
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
                ))
              )}
            </div>
          </div>

          {/* Feature Status */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-8 shadow-lg">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-emerald-900">시스템 상태</h3>
                <p className="text-sm text-emerald-700">모든 기능이 정상 작동 중입니다</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-emerald-800">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span><strong>인증:</strong> Firebase Auth + Google OAuth</span>
                </div>
                <div className="flex items-center space-x-2 text-emerald-800">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span><strong>음성 녹음:</strong> 원터치 녹음 인터페이스</span>
                </div>
                <div className="flex items-center space-x-2 text-emerald-800">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span><strong>음성 인식:</strong> 실시간 텍스트 변환</span>
                </div>
                <div className="flex items-center space-x-2 text-emerald-800">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span><strong>데이터 저장:</strong> Firestore 데이터베이스</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-emerald-800">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span><strong>감사 로그:</strong> Cloud Functions 변경 추적</span>
                </div>
                <div className="flex items-center space-x-2 text-orange-700">
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <span><strong>AI 분석:</strong> OpenAI 연동 예정</span>
                </div>
                <div className="flex items-center space-x-2 text-orange-700">
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <span><strong>연동 기능:</strong> Google Sheets, Notion 예정</span>
                </div>
                <div className="flex items-center space-x-2 text-emerald-800">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span><strong>PWA 지원:</strong> 오프라인 사용 가능</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}