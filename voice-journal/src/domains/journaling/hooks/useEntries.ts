import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { EntryService } from '../services/entryService'
import type { 
  CreateEntryRequest, 
  UpdateEntryRequest, 
  EntryFilters 
} from '../../../shared/types/entry'

export const useEntries = (
  filters: EntryFilters = {},
  page: number = 1,
  pageSize: number = 20
) => {
  return useQuery({
    queryKey: ['entries', filters, page, pageSize],
    queryFn: () => EntryService.getEntries(filters, page, pageSize),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useEntry = (id: string) => {
  return useQuery({
    queryKey: ['entry', id],
    queryFn: () => EntryService.getEntry(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export const useEntriesByDate = (date: string) => {
  return useQuery({
    queryKey: ['entries', 'by-date', date],
    queryFn: () => EntryService.getEntriesByDate(date),
    enabled: !!date,
    staleTime: 5 * 60 * 1000,
  })
}

export const useCreateEntry = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateEntryRequest) => EntryService.createEntry(data),
    onSuccess: (newEntry) => {
      // Invalidate and refetch entries
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      
      // Update the specific entry in cache
      queryClient.setQueryData(['entry', newEntry.id], newEntry)
      
      // Update entries by date cache
      queryClient.invalidateQueries({ 
        queryKey: ['entries', 'by-date', newEntry.date] 
      })
    },
  })
}

export const useUpdateEntry = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (entry: UpdateEntryRequest & { id: string }) => {
      const { id, ...data } = entry
      return EntryService.updateEntry(id, data)
    },
    onSuccess: (updatedEntry) => {
      // Update the specific entry in cache
      queryClient.setQueryData(['entry', updatedEntry.id], updatedEntry)
      
      // Invalidate entries queries to refetch
      queryClient.invalidateQueries({ queryKey: ['entries'] })
      
      // Update entries by date cache
      queryClient.invalidateQueries({ 
        queryKey: ['entries', 'by-date', updatedEntry.date] 
      })
    },
  })
}

export const useDeleteEntry = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => EntryService.deleteEntry(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['entry', deletedId] })
      
      // Invalidate entries queries to refetch
      queryClient.invalidateQueries({ queryKey: ['entries'] })
    },
  })
}

export const useUploadAudio = () => {
  return useMutation({
    mutationFn: ({ file, entryId }: { file: File; entryId?: string }) => 
      EntryService.uploadAudio(file, entryId),
  })
}

export const useDeleteAudio = () => {
  return useMutation({
    mutationFn: (filePath: string) => EntryService.deleteAudio(filePath),
  })
}