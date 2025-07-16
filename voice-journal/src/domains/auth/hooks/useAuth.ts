import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '../services/supabaseClient'
import { supabase } from '../../../lib/supabase'
import { useEffect } from 'react'

export const useAuth = () => {
  const queryClient = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { data: session } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      return session
    },
    staleTime: 5 * 60 * 1000,
  })

  const signInMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => 
      authService.signIn(email, password),
    onSuccess: (data) => {
      if (data.user) {
        queryClient.setQueryData(['auth', 'user'], data.user)
        queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
      }
    },
  })

  const signUpMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => 
      authService.signUp(email, password),
    onSuccess: (data) => {
      if (data.user) {
        queryClient.setQueryData(['auth', 'user'], data.user)
        queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
      }
    },
  })

  const signOutMutation = useMutation({
    mutationFn: authService.signOut,
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'user'], null)
      queryClient.setQueryData(['auth', 'session'], null)
      queryClient.clear()
    },
  })

  const signInWithGoogleMutation = useMutation({
    mutationFn: authService.signInWithGoogle,
  })

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN') {
          queryClient.setQueryData(['auth', 'user'], session?.user || null)
          queryClient.setQueryData(['auth', 'session'], session)
        } else if (event === 'SIGNED_OUT') {
          queryClient.setQueryData(['auth', 'user'], null)
          queryClient.setQueryData(['auth', 'session'], null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [queryClient])

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signIn: signInMutation.mutateAsync,
    signUp: signUpMutation.mutateAsync,
    signOut: signOutMutation.mutateAsync,
    signInWithGoogle: signInWithGoogleMutation.mutateAsync,
    isSigningIn: signInMutation.isPending,
    isSigningUp: signUpMutation.isPending,
    isSigningOut: signOutMutation.isPending,
  }
}