import { RetryUtil } from '../retryUtil'

describe('RetryUtil', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success')

      const result = await RetryUtil.withRetry(mockOperation)

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attemptCount).toBe(1)
      expect(result.totalDelay).toBe(0)
      expect(mockOperation).toHaveBeenCalledTimes(1)
    })

    it('should retry on retryable errors', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce({ status: 500, message: 'Server error' })
        .mockResolvedValue('success')

      const result = await RetryUtil.withRetry(mockOperation, {
        initialDelay: 10, // Faster for testing
        maxRetries: 3,
      })

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attemptCount).toBe(3)
      expect(mockOperation).toHaveBeenCalledTimes(3)
    })

    it('should not retry on non-retryable errors', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValue({ status: 401, message: 'Unauthorized' })

      const result = await RetryUtil.withRetry(mockOperation, {
        initialDelay: 10,
        maxRetries: 3,
      })

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Unauthorized')
      expect(result.attemptCount).toBe(1)
      expect(mockOperation).toHaveBeenCalledTimes(1)
    })

    it('should fail after max retries', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValue(new Error('Persistent error'))

      const result = await RetryUtil.withRetry(mockOperation, {
        initialDelay: 10,
        maxRetries: 2,
      })

      expect(result.success).toBe(false)
      expect(result.error?.message).toBe('Persistent error')
      expect(result.attemptCount).toBe(3) // 1 initial + 2 retries
      expect(mockOperation).toHaveBeenCalledTimes(3)
    })

    it('should use exponential backoff', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Retry me'))
        .mockRejectedValueOnce(new Error('Retry me again'))
        .mockResolvedValue('success')

      const startTime = Date.now()

      const result = await RetryUtil.withRetry(mockOperation, {
        initialDelay: 50,
        maxRetries: 3,
        backoffFactor: 2,
      })

      const endTime = Date.now()
      const totalTime = endTime - startTime

      expect(result.success).toBe(true)
      expect(totalTime).toBeGreaterThanOrEqual(50) // At least initial delay
      expect(result.totalDelay).toBeGreaterThan(0)
    })

    it('should respect max delay', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValue(new Error('Always fail'))

      const result = await RetryUtil.withRetry(mockOperation, {
        initialDelay: 100,
        maxDelay: 150,
        backoffFactor: 5,
        maxRetries: 3,
      })

      expect(result.success).toBe(false)
      // With backoff factor 5, delays would be: 100, 500, 2500
      // But max delay caps them at 150, so total should be around 450 (3 * 150)
      expect(result.totalDelay).toBeLessThan(600)
    })

    it('should use custom retry condition', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValue({ code: 'CUSTOM_ERROR', message: 'Custom error' })

      const customRetryCondition = (error: any) => error.code === 'CUSTOM_ERROR'

      const result = await RetryUtil.withRetry(mockOperation, {
        initialDelay: 10,
        maxRetries: 2,
        retryCondition: customRetryCondition,
      })

      expect(result.success).toBe(false)
      expect(mockOperation).toHaveBeenCalledTimes(3) // 1 initial + 2 retries
    })
  })

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      expect(RetryUtil.isRetryableError({ code: 'NETWORK_ERROR' })).toBe(true)
      expect(RetryUtil.isRetryableError({ name: 'NetworkError' })).toBe(true)
      expect(RetryUtil.isRetryableError({ code: 'ETIMEDOUT' })).toBe(true)
      expect(RetryUtil.isRetryableError({ message: 'timeout occurred' })).toBe(true)
    })

    it('should identify rate limiting as retryable', () => {
      expect(RetryUtil.isRetryableError({ status: 429 })).toBe(true)
      expect(RetryUtil.isRetryableError({ code: 'RATE_LIMITED' })).toBe(true)
    })

    it('should identify server errors as retryable', () => {
      expect(RetryUtil.isRetryableError({ status: 500 })).toBe(true)
      expect(RetryUtil.isRetryableError({ status: 503 })).toBe(true)
      expect(RetryUtil.isRetryableError({ status: 599 })).toBe(true)
    })

    it('should identify Google API errors as retryable', () => {
      expect(RetryUtil.isRetryableError({ message: 'quotaExceeded' })).toBe(true)
      expect(RetryUtil.isRetryableError({ message: 'rateLimitExceeded' })).toBe(true)
      expect(RetryUtil.isRetryableError({ message: 'backendError' })).toBe(true)
      expect(RetryUtil.isRetryableError({ message: 'internalError' })).toBe(true)
    })

    it('should identify Notion API errors as retryable', () => {
      expect(RetryUtil.isRetryableError({ code: 'rate_limited' })).toBe(true)
      expect(RetryUtil.isRetryableError({ code: 'internal_server_error' })).toBe(true)
      expect(RetryUtil.isRetryableError({ code: 'service_unavailable' })).toBe(true)
    })

    it('should identify Firebase Functions errors as retryable', () => {
      expect(RetryUtil.isRetryableError({ code: 'functions/internal' })).toBe(true)
      expect(RetryUtil.isRetryableError({ code: 'functions/deadline-exceeded' })).toBe(true)
      expect(RetryUtil.isRetryableError({ code: 'functions/resource-exhausted' })).toBe(true)
    })

    it('should identify temporary OAuth errors as retryable', () => {
      expect(RetryUtil.isRetryableError({ message: 'token_refresh_failed due to network' })).toBe(true)
    })

    it('should not retry permanent OAuth errors', () => {
      expect(RetryUtil.isRetryableError({ message: 'token_refresh_failed invalid_grant' })).toBe(false)
    })
  })

  describe('isPermanentError', () => {
    it('should identify authentication errors as permanent', () => {
      expect(RetryUtil.isPermanentError({ status: 401 })).toBe(true)
      expect(RetryUtil.isPermanentError({ code: 'UNAUTHENTICATED' })).toBe(true)
    })

    it('should identify authorization errors as permanent', () => {
      expect(RetryUtil.isPermanentError({ status: 403 })).toBe(true)
      expect(RetryUtil.isPermanentError({ code: 'PERMISSION_DENIED' })).toBe(true)
    })

    it('should identify not found errors as permanent', () => {
      expect(RetryUtil.isPermanentError({ status: 404 })).toBe(true)
      expect(RetryUtil.isPermanentError({ code: 'NOT_FOUND' })).toBe(true)
    })

    it('should identify bad request errors as permanent', () => {
      expect(RetryUtil.isPermanentError({ status: 400 })).toBe(true)
      expect(RetryUtil.isPermanentError({ code: 'INVALID_ARGUMENT' })).toBe(true)
    })

    it('should identify OAuth permanent errors', () => {
      expect(RetryUtil.isPermanentError({ message: 'invalid_grant' })).toBe(true)
      expect(RetryUtil.isPermanentError({ message: 'invalid_client' })).toBe(true)
      expect(RetryUtil.isPermanentError({ message: 'unauthorized_client' })).toBe(true)
    })
  })

  describe('getRetryDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      const delay0 = RetryUtil.getRetryDelay(0, { initialDelay: 100, backoffFactor: 2 })
      const delay1 = RetryUtil.getRetryDelay(1, { initialDelay: 100, backoffFactor: 2 })
      const delay2 = RetryUtil.getRetryDelay(2, { initialDelay: 100, backoffFactor: 2 })

      expect(delay0).toBe(100)
      expect(delay1).toBe(200)
      expect(delay2).toBe(400)
    })

    it('should respect max delay', () => {
      const delay = RetryUtil.getRetryDelay(10, {
        initialDelay: 100,
        backoffFactor: 2,
        maxDelay: 500,
      })

      expect(delay).toBe(500)
    })
  })

  describe('createRetryableFunction', () => {
    it('should create a retryable version of a function', async () => {
      const originalFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Retry me'))
        .mockResolvedValue('success')

      const retryableFn = RetryUtil.createRetryableFunction(originalFn, {
        initialDelay: 10,
        maxRetries: 2,
      })

      const result = await retryableFn('arg1', 'arg2')

      expect(result).toBe('success')
      expect(originalFn).toHaveBeenCalledTimes(2)
      expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2')
    })

    it('should throw error if all retries fail', async () => {
      const originalFn = jest.fn().mockRejectedValue(new Error('Always fail'))

      const retryableFn = RetryUtil.createRetryableFunction(originalFn, {
        initialDelay: 10,
        maxRetries: 1,
      })

      await expect(retryableFn()).rejects.toThrow('Always fail')
    })
  })

  describe('batchWithRetry', () => {
    it('should process items in batches with retry', async () => {
      const items = ['item1', 'item2', 'item3', 'item4', 'item5']
      const operation = jest.fn()
        .mockResolvedValueOnce('result1')
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('result3')
        .mockResolvedValueOnce('result4')
        .mockResolvedValueOnce('result5')

      const results = await RetryUtil.batchWithRetry(items, operation, {
        concurrency: 2,
        initialDelay: 10,
        maxRetries: 1,
      })

      expect(results).toHaveLength(5)
      expect(results[0].success).toBe(true)
      expect(results[0].data).toBe('result1')
      expect(results[1].success).toBe(false)
      expect(results[2].success).toBe(true)
    })

    it('should respect concurrency limit', async () => {
      const items = ['item1', 'item2', 'item3', 'item4']
      const operation = jest.fn().mockResolvedValue('result')

      await RetryUtil.batchWithRetry(items, operation, {
        concurrency: 2,
        initialDelay: 10,
        maxRetries: 0,
      })

      expect(operation).toHaveBeenCalledTimes(4)
    })
  })
})