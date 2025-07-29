import { EntryService } from '../entryService'
import { getFirebaseAuth, getFirebaseFirestore } from '../../../../lib/firebase'
import { addDoc, getDocs, getDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore'

// Mock Firebase
jest.mock('../../../../lib/firebase')
jest.mock('firebase/firestore')

// Mock other services
jest.mock('../sentimentService', () => ({
  SentimentService: {
    analyzeSentiment: jest.fn().mockResolvedValue({}),
  },
}))

jest.mock('../../../integrations/services/googleSheetsService', () => ({
  GoogleSheetsService: {
    autoSync: jest.fn().mockResolvedValue({ success: true }),
  },
}))

jest.mock('../../../integrations/utils/syncStatusManager', () => ({
  SyncStatusManager: {
    initializeSyncStatus: jest.fn().mockResolvedValue({}),
  },
}))

const mockGetFirebaseAuth = getFirebaseAuth as jest.MockedFunction<typeof getFirebaseAuth>
const mockGetFirebaseFirestore = getFirebaseFirestore as jest.MockedFunction<typeof getFirebaseFirestore>
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>
const mockDeleteDoc = deleteDoc as jest.MockedFunction<typeof deleteDoc>
const mockQuery = query as jest.MockedFunction<typeof query>
const mockWhere = where as jest.MockedFunction<typeof where>
const mockOrderBy = orderBy as jest.MockedFunction<typeof orderBy>

const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
}

const mockAuth = {
  currentUser: mockUser,
}

const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
}

const mockEntry = {
  id: 'test-entry-id',
  user_id: 'test-user-id',
  transcript: 'This is a test entry',
  date: '2024-01-15',
  sentiment_score: 5,
  keywords: ['test', 'entry'],
  wins: ['Completed tests'],
  regrets: ['Should have started earlier'],
  tasks: ['Write more tests'],
  created_at: '2024-01-15T10:00:00.000Z',
  updated_at: '2024-01-15T10:00:00.000Z',
}

describe('EntryService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetFirebaseAuth.mockReturnValue(mockAuth as any)
    mockGetFirebaseFirestore.mockReturnValue(mockFirestore as any)
  })

  describe('createEntry', () => {
    it('should create a new entry successfully', async () => {
      const mockDocRef = { id: 'test-entry-id' }
      mockAddDoc.mockResolvedValue(mockDocRef as any)

      const createRequest = {
        transcript: 'This is a test entry',
        date: '2024-01-15',
        sentiment_score: 5,
        keywords: ['test', 'entry'],
        wins: ['Completed tests'],
        regrets: ['Should have started earlier'],
        tasks: ['Write more tests'],
      }

      const result = await EntryService.createEntry(createRequest)

      expect(result).toMatchObject({
        id: 'test-entry-id',
        user_id: 'test-user-id',
        transcript: 'This is a test entry',
        date: '2024-01-15',
        sentiment_score: 5,
        keywords: ['test', 'entry'],
        wins: ['Completed tests'],
        regrets: ['Should have started earlier'],
        tasks: ['Write more tests'],
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          user_id: 'test-user-id',
          transcript: 'This is a test entry',
          date: '2024-01-15',
        })
      )
    })

    it('should throw error when user is not authenticated', async () => {
      mockGetFirebaseAuth.mockReturnValue({ currentUser: null } as any)

      const createRequest = {
        transcript: 'This is a test entry',
        date: '2024-01-15',
      }

      await expect(EntryService.createEntry(createRequest)).rejects.toThrow(
        'User not authenticated'
      )
    })

    it('should handle creation errors', async () => {
      mockAddDoc.mockRejectedValue(new Error('Firestore error'))

      const createRequest = {
        transcript: 'This is a test entry',
        date: '2024-01-15',
      }

      await expect(EntryService.createEntry(createRequest)).rejects.toThrow(
        'Firestore error'
      )
    })
  })

  describe('getEntries', () => {
    it('should fetch entries for authenticated user', async () => {
      const mockQuerySnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            id: 'entry-1',
            data: () => ({
              user_id: 'test-user-id',
              transcript: 'Entry 1',
              date: '2024-01-15',
            }),
          })
          callback({
            id: 'entry-2',
            data: () => ({
              user_id: 'test-user-id',
              transcript: 'Entry 2',
              date: '2024-01-14',
            }),
          })
        }),
      }

      mockGetDocs.mockResolvedValue(mockQuerySnapshot as any)
      mockQuery.mockReturnValue({} as any)
      mockWhere.mockReturnValue({} as any)
      mockOrderBy.mockReturnValue({} as any)

      const result = await EntryService.getEntries()

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        id: 'entry-1',
        transcript: 'Entry 1',
      })
      expect(result[1]).toMatchObject({
        id: 'entry-2',
        transcript: 'Entry 2',
      })
    })

    it('should throw error when user is not authenticated', async () => {
      mockGetFirebaseAuth.mockReturnValue({ currentUser: null } as any)

      await expect(EntryService.getEntries()).rejects.toThrow(
        'User not authenticated'
      )
    })
  })

  describe('getEntry', () => {
    it('should fetch a single entry by ID', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: 'test-entry-id',
        data: () => ({
          user_id: 'test-user-id',
          transcript: 'This is a test entry',
          date: '2024-01-15',
        }),
      }

      mockGetDoc.mockResolvedValue(mockDocSnap as any)

      const result = await EntryService.getEntry('test-entry-id')

      expect(result).toMatchObject({
        id: 'test-entry-id',
        user_id: 'test-user-id',
        transcript: 'This is a test entry',
      })
    })

    it('should throw error when entry does not exist', async () => {
      const mockDocSnap = {
        exists: () => false,
      }

      mockGetDoc.mockResolvedValue(mockDocSnap as any)

      await expect(EntryService.getEntry('non-existent-id')).rejects.toThrow(
        'Entry not found'
      )
    })

    it('should throw error when user tries to access unauthorized entry', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: 'test-entry-id',
        data: () => ({
          user_id: 'other-user-id', // Different user
          transcript: 'This is another user entry',
        }),
      }

      mockGetDoc.mockResolvedValue(mockDocSnap as any)

      await expect(EntryService.getEntry('test-entry-id')).rejects.toThrow(
        'Unauthorized access to entry'
      )
    })
  })

  describe('updateEntry', () => {
    it('should update an existing entry', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          user_id: 'test-user-id',
          transcript: 'Original transcript',
          date: '2024-01-15',
        }),
      }

      mockGetDoc.mockResolvedValue(mockDocSnap as any)
      mockUpdateDoc.mockResolvedValue()

      const updateRequest = {
        id: 'test-entry-id',
        transcript: 'Updated transcript',
        keywords: ['updated', 'keywords'],
      }

      const result = await EntryService.updateEntry(updateRequest)

      expect(result).toMatchObject({
        id: 'test-entry-id',
        transcript: 'Updated transcript',
        keywords: ['updated', 'keywords'],
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          transcript: 'Updated transcript',
          keywords: ['updated', 'keywords'],
        })
      )
    })

    it('should throw error when trying to update non-existent entry', async () => {
      const mockDocSnap = {
        exists: () => false,
      }

      mockGetDoc.mockResolvedValue(mockDocSnap as any)

      const updateRequest = {
        id: 'non-existent-id',
        transcript: 'Updated transcript',
      }

      await expect(EntryService.updateEntry(updateRequest)).rejects.toThrow(
        'Entry not found'
      )
    })
  })

  describe('deleteEntry', () => {
    it('should delete an existing entry', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          user_id: 'test-user-id',
        }),
      }

      mockGetDoc.mockResolvedValue(mockDocSnap as any)
      mockDeleteDoc.mockResolvedValue()

      await EntryService.deleteEntry('test-entry-id')

      expect(mockDeleteDoc).toHaveBeenCalledWith(expect.anything())
    })

    it('should throw error when trying to delete unauthorized entry', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          user_id: 'other-user-id', // Different user
        }),
      }

      mockGetDoc.mockResolvedValue(mockDocSnap as any)

      await expect(EntryService.deleteEntry('test-entry-id')).rejects.toThrow(
        'Unauthorized access to entry'
      )
    })
  })

  describe('searchEntries', () => {
    it('should search entries by transcript content', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          transcript: 'This is about testing',
          keywords: ['test'],
          wins: [],
          regrets: [],
          tasks: [],
        },
        {
          id: 'entry-2',
          transcript: 'This is about work',
          keywords: ['work'],
          wins: [],
          regrets: [],
          tasks: [],
        },
      ]

      // Mock getEntries to return test data
      jest.spyOn(EntryService, 'getEntries').mockResolvedValue(mockEntries as any)

      const result = await EntryService.searchEntries('testing')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('entry-1')
    })

    it('should search entries by keywords', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          transcript: 'Some content',
          keywords: ['important', 'work'],
          wins: [],
          regrets: [],
          tasks: [],
        },
        {
          id: 'entry-2',
          transcript: 'Other content',
          keywords: ['casual'],
          wins: [],
          regrets: [],
          tasks: [],
        },
      ]

      jest.spyOn(EntryService, 'getEntries').mockResolvedValue(mockEntries as any)

      const result = await EntryService.searchEntries('important')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('entry-1')
    })
  })
})