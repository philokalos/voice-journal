/**
 * Retry utility with exponential backoff for API calls
 */

export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  onRetry?: (error: Error, attempt: number) => void
}

export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: Error
  attempts: number
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param options Retry configuration options
 * @returns Promise with retry result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry
  } = options

  let attempt = 0
  let lastError: Error

  while (attempt <= maxRetries) {
    try {
      const result = await fn()
      return {
        success: true,
        data: result,
        attempts: attempt + 1
      }
    } catch (error) {
      lastError = error as Error
      attempt++

      // If we've exhausted all retries, return failure
      if (attempt > maxRetries) {
        break
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      )

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000

      // Call retry callback if provided
      if (onRetry) {
        try {
          onRetry(lastError, attempt)
        } catch (callbackError) {
          console.warn('Retry callback error:', callbackError)
        }
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, jitteredDelay))
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: attempt
  }
}

/**
 * Check if an error is retryable
 * @param error Error to check
 * @returns Boolean indicating if the error should be retried
 */
export function isRetryableError(error: Error): boolean {
  const errorName = error.name.toLowerCase()
  const errorMessage = error.message.toLowerCase()

  // Network errors
  if (errorName === 'networkerror' || errorMessage.includes('network')) {
    return true
  }

  // Timeout errors
  if (errorName === 'timeouterror' || errorMessage.includes('timeout')) {
    return true
  }

  // Firebase function errors that can be retried
  if (errorMessage.includes('internal') || errorMessage.includes('unavailable')) {
    return true
  }

  // Rate limiting (though less common in our use case)
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return true
  }

  // Temporary service errors
  if (errorMessage.includes('temporarily unavailable') || errorMessage.includes('service unavailable')) {
    return true
  }

  return false
}

/**
 * Simplified retry function for common use cases
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @returns Promise with the result
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  const result = await retryWithBackoff(fn, { maxRetries })
  
  if (result.success && result.data !== undefined) {
    return result.data
  }
  
  throw result.error || new Error('Retry failed with unknown error')
}