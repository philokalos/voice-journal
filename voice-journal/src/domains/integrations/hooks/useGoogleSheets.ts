import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SheetsService } from '../services/sheetsService'

export const useGoogleSheetsIntegration = () => {
  return useQuery({
    queryKey: ['google-sheets-integration'],
    queryFn: () => SheetsService.getIntegrationStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}

export const useConnectGoogleSheets = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const authUrl = await SheetsService.getAuthorizationUrl()
      // Open in new window for OAuth flow
      window.open(authUrl, 'google-sheets-auth', 'width=600,height=600')
      
      return new Promise<void>((resolve, reject) => {
        // Listen for message from OAuth window
        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return
          
          if (event.data.type === 'GOOGLE_SHEETS_AUTH_SUCCESS') {
            window.removeEventListener('message', handleMessage)
            resolve()
          } else if (event.data.type === 'GOOGLE_SHEETS_AUTH_ERROR') {
            window.removeEventListener('message', handleMessage)
            reject(new Error(event.data.error))
          }
        }
        
        window.addEventListener('message', handleMessage)
        
        // Timeout after 5 minutes
        setTimeout(() => {
          window.removeEventListener('message', handleMessage)
          reject(new Error('Authentication timeout'))
        }, 5 * 60 * 1000)
      })
    },
    onSuccess: () => {
      // Invalidate integration status to refetch
      queryClient.invalidateQueries({ queryKey: ['google-sheets-integration'] })
    },
  })
}

export const useDisconnectGoogleSheets = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => SheetsService.disconnect(),
    onSuccess: () => {
      // Invalidate integration status to refetch
      queryClient.invalidateQueries({ queryKey: ['google-sheets-integration'] })
    },
  })
}

export const useSyncEntry = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (entryId: string) => SheetsService.syncEntry(entryId),
    onSuccess: () => {
      // Invalidate sync logs to refetch
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] })
      // Update integration status
      queryClient.invalidateQueries({ queryKey: ['google-sheets-integration'] })
    },
  })
}

export const useSyncAllEntries = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => SheetsService.syncAllEntries(),
    onSuccess: () => {
      // Invalidate sync logs to refetch
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] })
      // Update integration status
      queryClient.invalidateQueries({ queryKey: ['google-sheets-integration'] })
    },
  })
}

export const useRetryFailedSyncs = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => SheetsService.retryFailedSyncs(),
    onSuccess: () => {
      // Invalidate sync logs to refetch
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] })
      // Update integration status
      queryClient.invalidateQueries({ queryKey: ['google-sheets-integration'] })
    },
  })
}

export const useSyncLogs = (limit: number = 50) => {
  return useQuery({
    queryKey: ['sync-logs', limit],
    queryFn: () => SheetsService.getSyncLogs(limit),
    staleTime: 30 * 1000, // 30 seconds
  })
}

export const useHandleOAuthCallback = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ code, state }: { code: string; state: string }) => 
      SheetsService.handleOAuthCallback(code, state),
    onSuccess: () => {
      // Invalidate integration status to refetch
      queryClient.invalidateQueries({ queryKey: ['google-sheets-integration'] })
      
      // Notify parent window of success
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_SHEETS_AUTH_SUCCESS'
        }, window.location.origin)
        window.close()
      }
    },
    onError: (error: Error) => {
      // Notify parent window of error
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_SHEETS_AUTH_ERROR',
          error: error.message
        }, window.location.origin)
        window.close()
      }
    },
  })
}