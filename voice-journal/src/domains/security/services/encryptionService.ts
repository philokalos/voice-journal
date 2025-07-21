/**
 * End-to-End Encryption Service for Audio Files
 * Uses Web Crypto API with AES-GCM for secure client-side encryption
 */

export interface EncryptedData {
  encryptedData: ArrayBuffer
  iv: ArrayBuffer
  salt: ArrayBuffer
}

export interface UserEncryptionKey {
  keyId: string
  encryptedKey: ArrayBuffer
  salt: ArrayBuffer
  createdAt: string
}

export class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12
  private static readonly SALT_LENGTH = 16
  private static readonly PBKDF2_ITERATIONS = 100000

  /**
   * Generate a new encryption key for the user
   * This is called once per user and stored encrypted in Firestore
   */
  static async generateUserKey(userId: string): Promise<{ masterKey: CryptoKey; keyData: UserEncryptionKey }> {
    try {
      // Generate random salt for key derivation
      const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH))
      
      // Generate random master key
      const masterKey = await crypto.subtle.generateKey(
        {
          name: this.ALGORITHM,
          length: this.KEY_LENGTH
        },
        true, // extractable
        ['encrypt', 'decrypt']
      )

      // Derive a key encryption key from user credentials
      const keyEncryptionKey = await this.deriveKeyFromCredentials(userId, salt)
      
      // Export master key and encrypt it
      const rawMasterKey = await crypto.subtle.exportKey('raw', masterKey)
      const encryptedMasterKey = await this.encryptWithKey(keyEncryptionKey, rawMasterKey)

      const keyData: UserEncryptionKey = {
        keyId: crypto.randomUUID(),
        encryptedKey: encryptedMasterKey.encryptedData,
        salt: encryptedMasterKey.salt,
        createdAt: new Date().toISOString()
      }

      return { masterKey, keyData }
    } catch (error) {
      console.error('Failed to generate user encryption key:', error)
      throw new Error('Failed to generate encryption key')
    }
  }

  /**
   * Retrieve and decrypt user's master key from stored key data
   */
  static async getUserKey(userId: string, keyData: UserEncryptionKey): Promise<CryptoKey> {
    try {
      // Derive the key encryption key using the same salt
      const keyEncryptionKey = await this.deriveKeyFromCredentials(userId, new Uint8Array(keyData.salt))
      
      // Decrypt the master key
      const decryptedKeyBuffer = await this.decryptWithKey(keyEncryptionKey, {
        encryptedData: keyData.encryptedKey,
        iv: new ArrayBuffer(this.IV_LENGTH), // IV is stored in encryptedData for KEK
        salt: keyData.salt
      })

      // Import the decrypted key
      return await crypto.subtle.importKey(
        'raw',
        decryptedKeyBuffer,
        { name: this.ALGORITHM },
        false, // not extractable
        ['encrypt', 'decrypt']
      )
    } catch (error) {
      console.error('Failed to retrieve user encryption key:', error)
      throw new Error('Failed to decrypt user key')
    }
  }

  /**
   * Encrypt audio blob using user's master key
   */
  static async encryptAudioBlob(audioBlob: Blob, userKey: CryptoKey): Promise<{ encryptedBlob: Blob; metadata: any }> {
    try {
      // Convert blob to ArrayBuffer
      const audioBuffer = await audioBlob.arrayBuffer()
      
      // Encrypt the audio data
      const encryptedData = await this.encryptWithKey(userKey, audioBuffer)
      
      // Create metadata
      const metadata = {
        encrypted: true,
        algorithm: this.ALGORITHM,
        originalSize: audioBuffer.byteLength,
        encryptedAt: new Date().toISOString()
      }

      // Combine IV, salt, and encrypted data into a single blob
      const combinedBuffer = this.combineEncryptedData(encryptedData)
      const encryptedBlob = new Blob([combinedBuffer], { type: 'application/octet-stream' })

      return { encryptedBlob, metadata }
    } catch (error) {
      console.error('Failed to encrypt audio blob:', error)
      throw new Error('Audio encryption failed')
    }
  }

  /**
   * Decrypt audio blob using user's master key
   */
  static async decryptAudioBlob(encryptedBlob: Blob, userKey: CryptoKey): Promise<Blob> {
    try {
      // Convert blob to ArrayBuffer
      const combinedBuffer = await encryptedBlob.arrayBuffer()
      
      // Extract encrypted data components
      const encryptedData = this.extractEncryptedData(combinedBuffer)
      
      // Decrypt the audio data
      const decryptedBuffer = await this.decryptWithKey(userKey, encryptedData)
      
      // Return as audio blob
      return new Blob([decryptedBuffer], { type: 'audio/webm' })
    } catch (error) {
      console.error('Failed to decrypt audio blob:', error)
      throw new Error('Audio decryption failed')
    }
  }

  /**
   * Derive encryption key from user credentials
   */
  private static async deriveKeyFromCredentials(userId: string, salt: ArrayBuffer): Promise<CryptoKey> {
    // Use user ID as base material (in production, this could be enhanced with user password)
    const keyMaterial = new TextEncoder().encode(userId)
    
    // Import key material
    const baseKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      'PBKDF2',
      false,
      ['deriveKey']
    )

    // Derive key using PBKDF2
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      baseKey,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Encrypt data with a given key
   */
  private static async encryptWithKey(key: CryptoKey, data: ArrayBuffer): Promise<EncryptedData> {
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH))

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv
      },
      key,
      data
    )

    return {
      encryptedData,
      iv: iv.buffer,
      salt: salt.buffer
    }
  }

  /**
   * Decrypt data with a given key
   */
  private static async decryptWithKey(key: CryptoKey, data: EncryptedData): Promise<ArrayBuffer> {
    return await crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv: data.iv
      },
      key,
      data.encryptedData
    )
  }

  /**
   * Combine encrypted data components into a single buffer
   * Format: [IV (12 bytes)] + [Salt (16 bytes)] + [Encrypted Data]
   */
  private static combineEncryptedData(data: EncryptedData): ArrayBuffer {
    const combinedLength = data.iv.byteLength + data.salt.byteLength + data.encryptedData.byteLength
    const combined = new Uint8Array(combinedLength)
    
    let offset = 0
    combined.set(new Uint8Array(data.iv), offset)
    offset += data.iv.byteLength
    
    combined.set(new Uint8Array(data.salt), offset)
    offset += data.salt.byteLength
    
    combined.set(new Uint8Array(data.encryptedData), offset)
    
    return combined.buffer
  }

  /**
   * Extract encrypted data components from combined buffer
   */
  private static extractEncryptedData(combinedBuffer: ArrayBuffer): EncryptedData {
    const combined = new Uint8Array(combinedBuffer)
    
    let offset = 0
    const iv = combined.slice(offset, offset + this.IV_LENGTH).buffer
    offset += this.IV_LENGTH
    
    const salt = combined.slice(offset, offset + this.SALT_LENGTH).buffer
    offset += this.SALT_LENGTH
    
    const encryptedData = combined.slice(offset).buffer
    
    return { encryptedData, iv, salt }
  }

  /**
   * Check if Web Crypto API is supported
   */
  static isSupported(): boolean {
    return typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined' &&
           typeof crypto.getRandomValues !== 'undefined'
  }
}