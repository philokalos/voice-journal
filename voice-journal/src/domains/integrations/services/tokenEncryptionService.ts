/**
 * Token Encryption Service for OAuth tokens
 * Uses Web Crypto API for encryption/decryption
 */

import { config } from '../../../lib/config'

export interface EncryptedToken {
  encryptedData: string
  iv: string
  salt: string
}

export interface OAuthTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
  created_at: number
}

export class TokenEncryptionService {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12
  private static readonly SALT_LENGTH = 16

  /**
   * Generate a cryptographic key from a password and salt
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    
    // Import the password as a raw key
    const baseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    )

    // Derive the encryption key using PBKDF2
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Get the encryption password from environment or generate one
   */
  private static getEncryptionPassword(): string {
    // In production, this should be stored securely in Firebase Functions config
    return config.firebase.projectId + '_token_encryption_key'
  }

  /**
   * Encrypt OAuth tokens
   */
  static async encryptTokens(tokens: OAuthTokens): Promise<EncryptedToken> {
    try {
      const password = this.getEncryptionPassword()
      const encoder = new TextEncoder()
      
      // Generate random salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH))
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
      
      // Derive encryption key
      const key = await this.deriveKey(password, salt)
      
      // Encrypt the token data
      const tokenData = JSON.stringify(tokens)
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        encoder.encode(tokenData)
      )

      return {
        encryptedData: Array.from(new Uint8Array(encryptedBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
        iv: Array.from(iv)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
        salt: Array.from(salt)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      }
    } catch (error) {
      console.error('Token encryption failed:', error)
      throw new Error('Failed to encrypt tokens')
    }
  }

  /**
   * Decrypt OAuth tokens
   */
  static async decryptTokens(encryptedToken: EncryptedToken): Promise<OAuthTokens> {
    try {
      const password = this.getEncryptionPassword()
      const decoder = new TextDecoder()
      
      // Convert hex strings back to Uint8Array
      const encryptedData = new Uint8Array(
        (encryptedToken.encryptedData.match(/.{1,2}/g) || [])
          .map(byte => parseInt(byte, 16))
      )
      const iv = new Uint8Array(
        (encryptedToken.iv.match(/.{1,2}/g) || [])
          .map(byte => parseInt(byte, 16))
      )
      const salt = new Uint8Array(
        (encryptedToken.salt.match(/.{1,2}/g) || [])
          .map(byte => parseInt(byte, 16))
      )
      
      // Derive the same encryption key
      const key = await this.deriveKey(password, salt)
      
      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        encryptedData
      )

      const tokenData = decoder.decode(decryptedBuffer)
      return JSON.parse(tokenData) as OAuthTokens

    } catch (error) {
      console.error('Token decryption failed:', error)
      throw new Error('Failed to decrypt tokens')
    }
  }

  /**
   * Check if tokens are expired (with 5 minute buffer)
   */
  static isTokenExpired(tokens: OAuthTokens): boolean {
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = tokens.created_at + tokens.expires_in
    const buffer = 5 * 60 // 5 minutes buffer
    
    return now >= (expiresAt - buffer)
  }

  /**
   * Validate token structure
   */
  static validateTokens(tokens: any): tokens is OAuthTokens {
    return (
      typeof tokens === 'object' &&
      typeof tokens.access_token === 'string' &&
      typeof tokens.refresh_token === 'string' &&
      typeof tokens.expires_in === 'number' &&
      typeof tokens.token_type === 'string' &&
      typeof tokens.scope === 'string' &&
      typeof tokens.created_at === 'number'
    )
  }

  /**
   * Create tokens object with current timestamp
   */
  static createTokensObject(tokenResponse: any): OAuthTokens {
    return {
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      expires_in: tokenResponse.expires_in,
      token_type: tokenResponse.token_type || 'Bearer',
      scope: tokenResponse.scope,
      created_at: Math.floor(Date.now() / 1000)
    }
  }
}