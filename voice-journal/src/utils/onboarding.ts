/**
 * Onboarding utility functions for managing user onboarding state
 */

export const ONBOARDING_STORAGE_KEY = 'voice-journal-onboarding-completed'

/**
 * Check if user has completed onboarding
 */
export const hasCompletedOnboarding = (): boolean => {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true'
  } catch (error) {
    console.warn('Failed to check onboarding status:', error)
    return false
  }
}

/**
 * Mark onboarding as completed
 */
export const markOnboardingCompleted = (): void => {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
  } catch (error) {
    console.error('Failed to mark onboarding as completed:', error)
  }
}

/**
 * Reset onboarding status (for testing purposes)
 */
export const resetOnboardingStatus = (): void => {
  try {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY)
  } catch (error) {
    console.error('Failed to reset onboarding status:', error)
  }
}

/**
 * Check if user should see onboarding
 * This can be extended with additional logic like user preferences
 */
export const shouldShowOnboarding = (): boolean => {
  return !hasCompletedOnboarding()
}