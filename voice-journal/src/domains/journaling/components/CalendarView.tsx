import React, { useState, useMemo } from 'react'
import { useEntries } from '../hooks/useEntries'
import type { Entry } from '../../../shared/types/entry'

interface CalendarViewProps {
  onDateSelect: (date: string) => void
  onEntrySelect: (entry: Entry) => void
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onDateSelect,
  onEntrySelect
}) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Get entries for the current month
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  
  const { data: entriesResult, isLoading } = useEntries({
    start_date: startOfMonth.toISOString().split('T')[0],
    end_date: endOfMonth.toISOString().split('T')[0]
  }, 1, 100)

  // Group entries by date
  const entriesByDate = useMemo(() => {
    if (!entriesResult?.entries) return {}
    
    return entriesResult.entries.reduce((acc, entry) => {
      const date = entry.date
      if (!acc[date]) acc[date] = []
      acc[date].push(entry)
      return acc
    }, {} as Record<string, Entry[]>)
  }, [entriesResult])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const startCalendar = new Date(firstDay)
    startCalendar.setDate(startCalendar.getDate() - firstDay.getDay())
    
    const days = []
    const current = new Date(startCalendar)
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      days.push({
        date: new Date(current),
        dateString: current.toISOString().split('T')[0],
        isCurrentMonth: current.getMonth() === month,
        isToday: current.toDateString() === new Date().toDateString(),
        entries: entriesByDate[current.toISOString().split('T')[0]] || []
      })
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }, [currentDate, entriesByDate])

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDateClick = (dateString: string, entries: Entry[]) => {
    setSelectedDate(dateString)
    onDateSelect(dateString)
    
    // If there's only one entry, select it immediately
    if (entries.length === 1) {
      onEntrySelect(entries[0])
    }
  }

  const getSentimentColor = (entries: Entry[]) => {
    if (entries.length === 0) return 'bg-gray-100'
    
    const avgSentiment = entries.reduce((sum, entry) => sum + entry.sentiment_score, 0) / entries.length
    
    if (avgSentiment >= 0.6) return 'bg-green-100 border-green-300'
    if (avgSentiment >= 0.2) return 'bg-yellow-100 border-yellow-300'
    return 'bg-red-100 border-red-300'
  }

  const getSentimentDot = (entries: Entry[]) => {
    if (entries.length === 0) return null
    
    const avgSentiment = entries.reduce((sum, entry) => sum + entry.sentiment_score, 0) / entries.length
    
    if (avgSentiment >= 0.6) return 'bg-green-500'
    if (avgSentiment >= 0.2) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading calendar...</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-md"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h2 className="text-xl font-semibold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-md"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-gray-700"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`
              relative p-2 h-20 border border-gray-200 cursor-pointer transition-colors
              ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
              ${day.isToday ? 'ring-2 ring-blue-500' : ''}
              ${selectedDate === day.dateString ? 'bg-blue-50' : ''}
              ${day.entries.length > 0 ? getSentimentColor(day.entries) : ''}
              hover:bg-gray-100
            `}
            onClick={() => handleDateClick(day.dateString, day.entries)}
          >
            {/* Date Number */}
            <div className={`text-sm font-medium ${
              day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
            } ${day.isToday ? 'text-blue-600' : ''}`}>
              {day.date.getDate()}
            </div>

            {/* Entry Indicators */}
            {day.entries.length > 0 && (
              <div className="absolute bottom-1 left-1 right-1">
                <div className="flex items-center justify-between">
                  <div className={`w-2 h-2 rounded-full ${getSentimentDot(day.entries)}`}></div>
                  <div className="text-xs text-gray-600 font-medium">
                    {day.entries.length}
                  </div>
                </div>
              </div>
            )}

            {/* Entry Count for Multiple Entries */}
            {day.entries.length > 1 && (
              <div className="absolute top-1 right-1">
                <div className="w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                  {day.entries.length}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-6 text-xs text-gray-600">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Positive</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span>Neutral</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>Negative</span>
        </div>
      </div>

      {/* Selected Date Info */}
      {selectedDate && entriesByDate[selectedDate] && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <div className="font-medium text-gray-900 mb-2">
            {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <div className="space-y-1">
            {entriesByDate[selectedDate].map((entry) => (
              <button
                key={entry.id}
                onClick={() => onEntrySelect(entry)}
                className="w-full text-left p-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{entry.transcript.substring(0, 50)}...</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(entry.created_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}