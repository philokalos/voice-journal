import * as admin from 'firebase-admin'

// Initialize Firebase Admin for testing
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'test-project',
  })
}

// Mock Google Cloud Language
jest.mock('@google-cloud/language', () => ({
  LanguageServiceClient: jest.fn().mockImplementation(() => ({
    analyzeSentiment: jest.fn().mockResolvedValue([{
      documentSentiment: {
        score: 0.5,
        magnitude: 0.8
      },
      sentences: []
    }]),
    classifyText: jest.fn().mockResolvedValue([{
      categories: [
        { name: '/Arts & Entertainment', confidence: 0.8 }
      ]
    }])
  }))
}))

// Mock Google APIs
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
        getAccessToken: jest.fn().mockResolvedValue({ token: 'mock-token' })
      }))
    },
    sheets: jest.fn().mockImplementation(() => ({
      spreadsheets: {
        create: jest.fn().mockResolvedValue({
          data: {
            spreadsheetId: 'mock-spreadsheet-id',
            properties: {
              title: 'Voice Journal Entries'
            }
          }
        }),
        values: {
          append: jest.fn().mockResolvedValue({
            data: {
              updates: {
                updatedRows: 1
              }
            }
          })
        }
      }
    }))
  }
}))

// Mock Firebase Functions test utilities
beforeEach(() => {
  jest.clearAllMocks()
})