import { retryWithBackoff, isRetryableError, retry } from '../retry'

describe('retry utility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success')
      
      const result = await retryWithBackoff(mockFn)
      
      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(1)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and eventually succeed', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValue('success')
      
      const result = await retryWithBackoff(mockFn, { 
        maxRetries: 3,
        initialDelay: 10, // Small delay for testing
        maxDelay: 100
      })
      
      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(3)
      expect(mockFn).toHaveBeenCalledTimes(3)
    })

    it('should fail after max retries', async () => {
      const mockError = new Error('Persistent error')
      const mockFn = jest.fn().mockRejectedValue(mockError)
      
      const result = await retryWithBackoff(mockFn, { 
        maxRetries: 2,
        initialDelay: 10
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toBe(mockError)
      expect(result.attempts).toBe(3) // maxRetries + 1
      expect(mockFn).toHaveBeenCalledTimes(3)
    })

    it('should call onRetry callback', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValue('success')
      
      const onRetry = jest.fn()
      
      await retryWithBackoff(mockFn, { 
        maxRetries: 2,
        initialDelay: 10,
        onRetry
      })
      
      expect(onRetry).toHaveBeenCalledTimes(1)
      expect(onRetry).toHaveBeenCalledWith(new Error('First error'), 1)
    })

    it('should handle onRetry callback errors gracefully', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValue('success')
      
      const onRetry = jest.fn().mockImplementation(() => {
        throw new Error('Callback error')
      })
      
      const result = await retryWithBackoff(mockFn, { 
        maxRetries: 2,
        initialDelay: 10,
        onRetry
      })
      
      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
    })
  })

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      expect(isRetryableError(new Error('NetworkError'))).toBe(true)
      expect(isRetryableError(new Error('network timeout'))).toBe(true)
    })

    it('should identify timeout errors as retryable', () => {
      expect(isRetryableError(new Error('TimeoutError'))).toBe(true)
      expect(isRetryableError(new Error('request timeout'))).toBe(true)
    })

    it('should identify Firebase function errors as retryable', () => {
      expect(isRetryableError(new Error('internal server error'))).toBe(true)
      expect(isRetryableError(new Error('service unavailable'))).toBe(true)
    })

    it('should identify rate limiting as retryable', () => {
      expect(isRetryableError(new Error('rate limit exceeded'))).toBe(true)
      expect(isRetryableError(new Error('too many requests'))).toBe(true)
    })

    it('should not identify non-retryable errors', () => {
      expect(isRetryableError(new Error('unauthorized'))).toBe(false)
      expect(isRetryableError(new Error('not found'))).toBe(false)
      expect(isRetryableError(new Error('invalid argument'))).toBe(false)
    })
  })

  describe('retry (simplified)', () => {
    it('should return data on success', async () => {
      const mockFn = jest.fn().mockResolvedValue('success')
      
      const result = await retry(mockFn, 2)
      
      expect(result).toBe('success')
    })

    it('should throw error on failure', async () => {
      const mockError = new Error('Persistent error')
      const mockFn = jest.fn().mockRejectedValue(mockError)
      
      await expect(retry(mockFn, 2)).rejects.toThrow('Persistent error')
    })
  })
})