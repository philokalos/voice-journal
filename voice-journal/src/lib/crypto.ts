/**
 * Web Crypto API utilities for audio encryption/decryption
 */

export interface EncryptionResult {
  encryptedData: ArrayBuffer
  iv: Uint8Array
  keyId: string
}

export interface DecryptionResult {
  data: ArrayBuffer
}

export class CryptoService {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12
  private static readonly TAG_LENGTH = 16
  
  // Cache for encryption keys
  private static keyCache = new Map<string, CryptoKey>()

  /**
   * Generate a unique key ID for the current user
   */
  static generateKeyId(userId: string): string {
    return `audio-key-${userId}`
  }

  /**
   * Generate or retrieve an encryption key for the user
   */
  static async getOrCreateKey(userId: string): Promise<CryptoKey> {
    const keyId = this.generateKeyId(userId)
    
    // Check cache first
    if (this.keyCache.has(keyId)) {
      return this.keyCache.get(keyId)!
    }

    try {
      // Try to load existing key from localStorage
      const storedKey = localStorage.getItem(keyId)
      if (storedKey) {
        const keyData = JSON.parse(storedKey)
        const key = await crypto.subtle.importKey(
          'raw',
          new Uint8Array(keyData),
          { name: this.ALGORITHM },
          false,
          ['encrypt', 'decrypt']
        )
        this.keyCache.set(keyId, key)
        return key
      }
    } catch (error) {
      console.warn('Failed to load existing key, generating new one:', error)
    }

    // Generate new key
    const key = await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      true,
      ['encrypt', 'decrypt']
    )

    // Export and store the key
    const exportedKey = await crypto.subtle.exportKey('raw', key)
    localStorage.setItem(keyId, JSON.stringify(Array.from(new Uint8Array(exportedKey))))
    
    this.keyCache.set(keyId, key)
    return key
  }

  /**
   * Encrypt audio data using AES-GCM
   */
  static async encrypt(data: ArrayBuffer, userId: string): Promise<EncryptionResult> {
    const key = await this.getOrCreateKey(userId)
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
    
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
        tagLength: this.TAG_LENGTH * 8
      },
      key,
      data
    )

    return {
      encryptedData,
      iv,
      keyId: this.generateKeyId(userId)
    }
  }

  /**
   * Decrypt audio data using AES-GCM
   */
  static async decrypt(
    encryptedData: ArrayBuffer,
    iv: Uint8Array,
    userId: string
  ): Promise<DecryptionResult> {
    const key = await this.getOrCreateKey(userId)
    
    const data = await crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
        tagLength: this.TAG_LENGTH * 8
      },
      key,
      encryptedData
    )

    return { data }
  }

  /**
   * Encrypt a Blob (audio file)
   */
  static async encryptBlob(blob: Blob, userId: string): Promise<EncryptionResult> {
    const arrayBuffer = await blob.arrayBuffer()
    return this.encrypt(arrayBuffer, userId)
  }

  /**
   * Decrypt to Blob (audio file)
   */
  static async decryptToBlob(
    encryptedData: ArrayBuffer,
    iv: Uint8Array,
    userId: string,
    mimeType: string = 'audio/webm'
  ): Promise<Blob> {
    const { data } = await this.decrypt(encryptedData, iv, userId)
    return new Blob([data], { type: mimeType })
  }

  /**
   * Clear cached keys (for logout)
   */
  static clearCache(): void {
    this.keyCache.clear()
  }

  /**
   * Delete user's encryption key
   */
  static deleteUserKey(userId: string): void {
    const keyId = this.generateKeyId(userId)
    localStorage.removeItem(keyId)
    this.keyCache.delete(keyId)
  }

  /**
   * Verify if crypto is supported
   */
  static isSupported(): boolean {
    return 'crypto' in window && 'subtle' in window.crypto
  }
}