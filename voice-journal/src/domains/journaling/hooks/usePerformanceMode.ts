import { useState, useEffect } from 'react'

export type PerformanceMode = 'auto' | 'standard' | 'virtualized'

export const usePerformanceMode = () => {
  const [mode, setMode] = useState<PerformanceMode>('auto')
  const [entryCount, setEntryCount] = useState(0)

  useEffect(() => {
    // Get stored preference
    const stored = localStorage.getItem('voice-journal-performance-mode')
    if (stored && ['auto', 'standard', 'virtualized'].includes(stored)) {
      setMode(stored as PerformanceMode)
    }
  }, [])

  const updateEntryCount = (count: number) => {
    setEntryCount(count)
  }

  const getRecommendedMode = (): PerformanceMode => {
    if (mode !== 'auto') return mode
    
    // Auto-detect based on entry count and device capabilities
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2
    
    if (entryCount > 100 || isMobile || isLowEnd) {
      return 'virtualized'
    }
    
    return 'standard'
  }

  const setPerformanceMode = (newMode: PerformanceMode) => {
    setMode(newMode)
    localStorage.setItem('voice-journal-performance-mode', newMode)
  }

  return {
    mode,
    entryCount,
    recommendedMode: getRecommendedMode(),
    setPerformanceMode,
    updateEntryCount
  }
}

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    searchTime: 0,
    renderTime: 0,
    memoryUsage: 0
  })

  const measureLoadTime = (startTime: number) => {
    const endTime = performance.now()
    const loadTime = endTime - startTime
    setMetrics(prev => ({ ...prev, loadTime }))
    return loadTime
  }

  const measureSearchTime = (startTime: number) => {
    const endTime = performance.now()
    const searchTime = endTime - startTime
    setMetrics(prev => ({ ...prev, searchTime }))
    return searchTime
  }

  const measureRenderTime = (startTime: number) => {
    const endTime = performance.now()
    const renderTime = endTime - startTime
    setMetrics(prev => ({ ...prev, renderTime }))
    return renderTime
  }

  const measureMemoryUsage = () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const memoryUsage = memory.usedJSHeapSize / 1024 / 1024 // MB
      setMetrics(prev => ({ ...prev, memoryUsage }))
      return memoryUsage
    }
    return 0
  }

  return {
    metrics,
    measureLoadTime,
    measureSearchTime,
    measureRenderTime,
    measureMemoryUsage
  }
}