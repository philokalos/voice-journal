import { useState, useEffect } from 'react'
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
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

  const auth = getFirebaseAuth()

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

  // Listen for auth state changes
  useEffect(() => {
    setIsLoading(true)
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(convertUser(firebaseUser))
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

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
    setIsSigningIn(true)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        prompt: 'select_account'
      })
      
      const result = await signInWithPopup(auth, provider)
      const authUser = convertUser(result.user)
      if (!authUser) {
        throw new Error('Failed to get user data after Google sign in')
      }
      return authUser
    } catch (error) {
      console.error('Google sign in error:', error)
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