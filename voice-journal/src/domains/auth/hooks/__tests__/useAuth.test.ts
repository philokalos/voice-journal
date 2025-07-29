import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from '../useAuth'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup, onAuthStateChanged } from 'firebase/auth'

// Mock Firebase auth functions
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  onAuthStateChanged: jest.fn(),
}))

const mockSignInWithEmailAndPassword = signInWithEmailAndPassword as jest.MockedFunction<typeof signInWithEmailAndPassword>
const mockCreateUserWithEmailAndPassword = createUserWithEmailAndPassword as jest.MockedFunction<typeof createUserWithEmailAndPassword>
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>
const mockSignInWithPopup = signInWithPopup as jest.MockedFunction<typeof signInWithPopup>
const mockOnAuthStateChanged = onAuthStateChanged as jest.MockedFunction<typeof onAuthStateChanged>

const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.jpg',
}

const mockFirebaseUser = {
  ...mockUser,
  emailVerified: true,
  isAnonymous: false,
  providerData: [],
  refreshToken: 'refresh-token',
  tenantId: null,
  delete: jest.fn(),
  getIdToken: jest.fn(),
  getIdTokenResult: jest.fn(),
  reload: jest.fn(),
  toJSON: jest.fn(),
  metadata: {},
}

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default mock implementation for onAuthStateChanged
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null) // No user by default
      return jest.fn() // Unsubscribe function
    })
  })

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAuth())
    
    expect(result.current.isLoading).toBe(true)
    expect(result.current.user).toBe(null)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should set user when authenticated', async () => {
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockFirebaseUser as any)
      return jest.fn()
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toEqual({
      uid: mockUser.uid,
      email: mockUser.email,
      displayName: mockUser.displayName,
      photoURL: mockUser.photoURL,
    })
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should sign in with email and password', async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: mockFirebaseUser,
      operationType: 'signIn',
    } as any)

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      const user = await result.current.signIn('test@example.com', 'password')
      expect(user).toEqual({
        uid: mockUser.uid,
        email: mockUser.email,
        displayName: mockUser.displayName,
        photoURL: mockUser.photoURL,
      })
    })

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'test@example.com',
      'password'
    )
  })

  it('should handle sign in errors', async () => {
    const error = new Error('Invalid credentials')
    mockSignInWithEmailAndPassword.mockRejectedValue(error)

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await expect(
        result.current.signIn('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials')
    })

    expect(result.current.isSigningIn).toBe(false)
  })

  it('should sign up with email and password', async () => {
    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user: mockFirebaseUser,
      operationType: 'signIn',
    } as any)

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      const user = await result.current.signUp('test@example.com', 'password')
      expect(user).toEqual({
        uid: mockUser.uid,
        email: mockUser.email,
        displayName: mockUser.displayName,
        photoURL: mockUser.photoURL,
      })
    })

    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'test@example.com',
      'password'
    )
  })

  it('should sign in with Google', async () => {
    mockSignInWithPopup.mockResolvedValue({
      user: mockFirebaseUser,
      operationType: 'signIn',
    } as any)

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      const user = await result.current.signInWithGoogle()
      expect(user).toEqual({
        uid: mockUser.uid,
        email: mockUser.email,
        displayName: mockUser.displayName,
        photoURL: mockUser.photoURL,
      })
    })

    expect(mockSignInWithPopup).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything()
    )
  })

  it('should sign out', async () => {
    mockSignOut.mockResolvedValue()

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.signOut()
    })

    expect(mockSignOut).toHaveBeenCalledWith(expect.anything())
  })

  it('should handle sign out errors', async () => {
    const error = new Error('Sign out failed')
    mockSignOut.mockRejectedValue(error)

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await expect(result.current.signOut()).rejects.toThrow('Sign out failed')
    })

    expect(result.current.isSigningOut).toBe(false)
  })

  it('should track loading states', async () => {
    mockSignInWithEmailAndPassword.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    const { result } = renderHook(() => useAuth())

    act(() => {
      result.current.signIn('test@example.com', 'password')
    })

    expect(result.current.isSigningIn).toBe(true)

    await waitFor(() => {
      expect(result.current.isSigningIn).toBe(false)
    })
  })
})