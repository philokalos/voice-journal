import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnalysisService, type AnalysisResult } from '../services/analysisService'

export const useAnalyzeEntry = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ entryId, transcript }: { entryId: string; transcript: string }) => 
      AnalysisService.analyzeEntry(entryId, transcript),
    onSuccess: (analysis: AnalysisResult, { entryId }) => {
      // Update the entry cache with analysis results
      queryClient.setQueryData(['entry', entryId], (oldData: any) => {
        if (!oldData) return oldData
        
        return {
          ...oldData,
          wins: analysis.wins,
          regrets: analysis.regrets,
          tasks: analysis.tasks,
          keywords: analysis.keywords,
          sentiment_score: analysis.sentiment_score
        }
      })
      
      // Invalidate entries queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['entries'] })
    },
  })
}

export const useRetryAnalysis = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ entryId, transcript, maxRetries = 3 }: { 
      entryId: string; 
      transcript: string; 
      maxRetries?: number 
    }) => AnalysisService.retryAnalysis(entryId, transcript, maxRetries),
    onSuccess: (analysis: AnalysisResult, { entryId }) => {
      // Update the entry cache with analysis results
      queryClient.setQueryData(['entry', entryId], (oldData: any) => {
        if (!oldData) return oldData
        
        return {
          ...oldData,
          wins: analysis.wins,
          regrets: analysis.regrets,
          tasks: analysis.tasks,
          keywords: analysis.keywords,
          sentiment_score: analysis.sentiment_score
        }
      })
      
      // Invalidate entries queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['entries'] })
    },
  })
}

export const useMockAnalysis = () => {
  return useMutation({
    mutationFn: ({ transcript }: { transcript: string }) => 
      AnalysisService.mockAnalysis(transcript),
    onSuccess: (analysis: AnalysisResult) => {
      // This is just for testing, so no cache updates needed
      console.log('Mock analysis completed:', analysis)
    },
  })
}