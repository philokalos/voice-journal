import { renderHook, act } from '@testing-library/react'
import { useAuth } from '../useAuth'

// Mock Firebase Auth
const mockSignInWithPopup = jest.fn()
const mockOAuthProvider = jest.fn()

jest.mock('firebase/auth', () => ({
  ...jest.requireActual('firebase/auth'),
  signInWithPopup: mockSignInWithPopup,
  OAuthProvider: mockOAuthProvider,
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback(null)
    return jest.fn() // unsubscribe function
  })
}))

jest.mock('../../../lib/firebase', () => ({
  getFirebaseAuth: jest.fn(() => ({}))
}))

describe('useAuth - Apple Sign-In', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup OAuth provider mock
    const mockProvider = {
      addScope: jest.fn()
    }
    mockOAuthProvider.mockReturnValue(mockProvider)
  })

  it('should call signInWithApple with correct provider configuration', async () => {
    const mockUser = {
      uid: 'test-uid',
      email: 'test@icloud.com',
      displayName: 'Test User',
      photoURL: null
    }

    mockSignInWithPopup.mockResolvedValue({
      user: mockUser
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.signInWithApple()
    })

    // Verify OAuthProvider was created with 'apple.com'
    expect(mockOAuthProvider).toHaveBeenCalledWith('apple.com')
    
    // Verify scopes were added
    const mockProvider = mockOAuthProvider.mock.results[0].value
    expect(mockProvider.addScope).toHaveBeenCalledWith('email')
    expect(mockProvider.addScope).toHaveBeenCalledWith('name')
    
    // Verify signInWithPopup was called
    expect(mockSignInWithPopup).toHaveBeenCalledWith({}, mockProvider)
  })

  it('should handle Apple sign-in errors gracefully', async () => {
    const mockError = new Error('Apple sign-in failed')
    mockSignInWithPopup.mockRejectedValue(mockError)

    const { result } = renderHook(() => useAuth())

    await expect(async () => {
      await act(async () => {
        await result.current.signInWithApple()
      })
    }).rejects.toThrow('Apple sign-in failed')
  })

  it('should set loading state during Apple sign-in', async () => {
    const mockUser = {
      uid: 'test-uid',
      email: 'test@icloud.com',
      displayName: 'Test User',
      photoURL: null
    }

    // Create a promise that we can control
    let resolveSignIn: (value: any) => void
    const signInPromise = new Promise(resolve => {
      resolveSignIn = resolve
    })
    
    mockSignInWithPopup.mockReturnValue(signInPromise)

    const { result } = renderHook(() => useAuth())

    // Start sign-in process
    const signInPromiseResult = act(async () => {
      return result.current.signInWithApple()
    })

    // Should be loading
    expect(result.current.isSigningIn).toBe(true)

    // Resolve the sign-in
    act(() => {
      resolveSignIn({ user: mockUser })
    })

    await signInPromiseResult

    // Should no longer be loading
    expect(result.current.isSigningIn).toBe(false)
  })
})