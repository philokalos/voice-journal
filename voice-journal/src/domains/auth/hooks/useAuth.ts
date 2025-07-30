import { useState, useEffect } from 'react'
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged
} from 'firebase/auth'
import { getFirebaseAuth } from '../../../lib/firebase'

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  let auth: ReturnType<typeof getFirebaseAuth> | null = null;
  try {
    auth = getFirebaseAuth()
  } catch (firebaseError) {
    console.error('Firebase Auth not available:', firebaseError)
    setError('Firebase 서비스에 연결할 수 없습니다.')
  }

  // Convert Firebase User to AuthUser
  const convertUser = (firebaseUser: User | null): AuthUser | null => {
    if (!firebaseUser) return null
    
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL
    }
  }

  // Listen for auth state changes and handle redirect results
  useEffect(() => {
    if (!auth) {
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    
    // Check for redirect result first
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('✅ Google redirect sign in successful:', result.user.email)
          setUser(convertUser(result.user))
        }
      })
      .catch((error) => {
        console.error('❌ Redirect result error:', error)
      })
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(convertUser(firebaseUser))
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [auth])

  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<AuthUser> => {
    setIsSigningIn(true)
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      const authUser = convertUser(result.user)
      if (!authUser) {
        throw new Error('Failed to get user data after sign in')
      }
      return authUser
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    } finally {
      setIsSigningIn(false)
    }
  }

  // Sign up with email and password
  const signUp = async (email: string, password: string): Promise<AuthUser> => {
    setIsSigningUp(true)
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      const authUser = convertUser(result.user)
      if (!authUser) {
        throw new Error('Failed to get user data after sign up')
      }
      return authUser
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    } finally {
      setIsSigningUp(false)
    }
  }

  // Sign in with Google
  const signInWithGoogle = async (): Promise<AuthUser> => {
    if (!auth) {
      throw new Error('Firebase Auth not available')
    }
    
    setIsSigningIn(true)
    try {
      console.log('🔐 Initializing Google Auth Provider...')
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        prompt: 'select_account'
      })
      
      // Add additional scopes for better compatibility
      provider.addScope('email')
      provider.addScope('profile')
      
      console.log('🔧 Provider configured with scopes:', provider.getScopes())
      
      console.log('🚀 Attempting Google popup sign in...')
      console.log('🌍 Current origin:', window.location.origin)
      console.log('🔐 Firebase auth domain:', auth.config.authDomain)
      
      try {
        // Try popup first
        const result = await signInWithPopup(auth, provider)
        console.log('📋 Google sign in result:', {
          user: result.user?.email,
          uid: result.user?.uid,
          displayName: result.user?.displayName
        })
        
        const authUser = convertUser(result.user)
        if (!authUser) {
          throw new Error('Failed to get user data after Google sign in')
        }
        console.log('✅ Google popup sign in successful for:', authUser.email)
        return authUser
      } catch (popupError: unknown) {
        const popupErr = popupError as { code?: string }
        console.log('⚠️ Popup failed, trying redirect method...', popupErr?.code)
        
        // If popup is blocked or fails, fall back to redirect
        if (popupErr?.code === 'auth/popup-blocked' || 
            popupErr?.code === 'auth/popup-closed-by-user' ||
            popupErr?.code === 'auth/cancelled-popup-request') {
          
          console.log('🔄 Using redirect method instead...')
          await signInWithRedirect(auth, provider)
          
          // signInWithRedirect doesn't return immediately
          // The result will be handled in the useEffect hook
          // Return a promise that will resolve after redirect
          return new Promise((resolve, reject) => {
            // This will be resolved by the redirect handler
            setTimeout(() => {
              reject(new Error('Redirect sign in initiated - please wait'))
            }, 1000)
          })
        } else {
          throw popupError
        }
      }
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string; name?: string }
      console.error('❌ Google sign in error details:', {
        code: err?.code,
        message: err?.message,
        name: err?.name
      })
      throw error
    } finally {
      setIsSigningIn(false)
    }
  }

  // Sign in with Apple
  const signInWithApple = async (): Promise<AuthUser> => {
    setIsSigningIn(true)
    try {
      const provider = new OAuthProvider('apple.com')
      provider.addScope('email')
      provider.addScope('name')
      
      const result = await signInWithPopup(auth, provider)
      const authUser = convertUser(result.user)
      if (!authUser) {
        throw new Error('Failed to get user data after Apple sign in')
      }
      return authUser
    } catch (error) {
      console.error('Apple sign in error:', error)
      throw error
    } finally {
      setIsSigningIn(false)
    }
  }

  // Sign out
  const signOut = async (): Promise<void> => {
    setIsSigningOut(true)
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    } finally {
      setIsSigningOut(false)
    }
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithApple,
    isSigningIn,
    isSigningUp,
    isSigningOut,
  }
}