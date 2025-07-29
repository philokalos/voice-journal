/**
 * Retry utility with exponential backoff for integration services
 */

export interface RetryOptions {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffFactor: number
  retryCondition?: (error: any) => boolean
}

export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: Error
  attemptCount: number
  totalDelay: number
}

export class RetryUtil {
  private static readonly DEFAULT_OPTIONS: RetryOptions = {
    maxRetries: 5,
    initialDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffFactor: 2,
    retryCondition: (error) => RetryUtil.isRetryableError(error)
  }

  /**
   * Execute a function with retry logic and exponential backoff
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    const config = { ...this.DEFAULT_OPTIONS, ...options }
    let lastError: Error
    let totalDelay = 0
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const data = await operation()
        return {
          success: true,
          data,
          attemptCount: attempt + 1,
          totalDelay
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // Don't retry on the last attempt or if error is not retryable
        if (attempt === config.maxRetries || !config.retryCondition!(lastError)) {
          break
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.initialDelay * Math.pow(config.backoffFactor, attempt),
          config.maxDelay
        )
        
        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * delay * 0.1
        
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${Math.round(jitteredDelay)}ms:`, lastError.message)
        
        await this.sleep(jitteredDelay)
        totalDelay += jitteredDelay
      }
    }

    return {
      success: false,
      error: lastError!,
      attemptCount: config.maxRetries + 1,
      totalDelay
    }
  }

  /**
   * Determine if an error is retryable
   */
  static isRetryableError(error: any): boolean {
    if (!error) return false

    // Network errors
    if (error.code === 'NETWORK_ERROR' || error.name === 'NetworkError') {
      return true
    }

    // Timeout errors
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return true
    }

    // Rate limiting
    if (error.status === 429 || error.code === 'RATE_LIMITED') {
      return true
    }

    // Server errors (5xx)
    if (error.status >= 500 && error.status < 600) {
      return true
    }

    // Google API specific errors
    if (error.message?.includes('quotaExceeded') || 
        error.message?.includes('rateLimitExceeded') ||
        error.message?.includes('backendError') ||
        error.message?.includes('internalError')) {
      return true
    }

    // Notion API specific errors
    if (error.code === 'rate_limited' || 
        error.code === 'internal_server_error' ||
        error.code === 'service_unavailable') {
      return true
    }

    // Firebase Functions errors
    if (error.code === 'functions/internal' ||
        error.code === 'functions/deadline-exceeded' ||
        error.code === 'functions/resource-exhausted') {
      return true
    }

    // OAuth token refresh errors (retryable if it's a temporary issue)
    if (error.message?.includes('token_refresh_failed') && 
        !error.message?.includes('invalid_grant')) {
      return true
    }

    return false
  }

  /**
   * Check if an error is a permanent failure (should not retry)
   */
  static isPermanentError(error: any): boolean {
    if (!error) return false

    // Authentication errors
    if (error.status === 401 || error.code === 'UNAUTHENTICATED') {
      return true
    }

    // Authorization errors
    if (error.status === 403 || error.code === 'PERMISSION_DENIED') {
      return true
    }

    // Resource not found
    if (error.status === 404 || error.code === 'NOT_FOUND') {
      return true
    }

    // Bad request
    if (error.status === 400 || error.code === 'INVALID_ARGUMENT') {
      return true
    }

    // OAuth specific permanent errors
    if (error.message?.includes('invalid_grant') ||
        error.message?.includes('invalid_client') ||
        error.message?.includes('unauthorized_client')) {
      return true
    }

    return false
  }

  /**
   * Get retry delay based on attempt number
   */
  static getRetryDelay(attempt: number, options: Partial<RetryOptions> = {}): number {
    const config = { ...this.DEFAULT_OPTIONS, ...options }
    return Math.min(
      config.initialDelay * Math.pow(config.backoffFactor, attempt),
      config.maxDelay
    )
  }

  /**
   * Sleep for a given number of milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Create a retry-enabled version of an async function
   */
  static createRetryableFunction<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: Partial<RetryOptions> = {}
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const result = await this.withRetry(() => fn(...args), options)
      
      if (result.success) {
        return result.data!
      } else {
        throw result.error!
      }
    }
  }

  /**
   * Batch retry operations with concurrency control
   */
  static async batchWithRetry<T, R>(
    items: T[],
    operation: (item: T) => Promise<R>,
    options: Partial<RetryOptions> & { concurrency?: number } = {}
  ): Promise<Array<RetryResult<R>>> {
    const { concurrency = 3, ...retryOptions } = options
    const results: Array<RetryResult<R>> = []
    
    // Process items in batches to control concurrency
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency)
      
      const batchResults = await Promise.all(
        batch.map(item => 
          this.withRetry(() => operation(item), retryOptions)
        )
      )
      
      results.push(...batchResults)
    }
    
    return results
  }
}