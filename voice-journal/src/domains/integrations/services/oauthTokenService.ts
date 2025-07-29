import { getFirebaseFirestore } from '../../../lib/firebase'
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { TokenEncryptionService, EncryptedToken, OAuthTokens } from './tokenEncryptionService'

export interface GoogleSheetsIntegration {
  id: string
  user_id: string
  encrypted_tokens: EncryptedToken
  spreadsheet_id?: string
  spreadsheet_name?: string
  last_sync_at?: string
  created_at: string
  updated_at: string
  status: 'active' | 'revoked' | 'error'
}

export class OAuthTokenService {
  private static readonly COLLECTION = 'google_sheets_integrations'

  /**
   * Store encrypted OAuth tokens for a user
   */
  static async storeTokens(
    userId: string, 
    tokens: OAuthTokens, 
    spreadsheetId?: string,
    spreadsheetName?: string
  ): Promise<void> {
    try {
      const firestore = getFirebaseFirestore()
      const encryptedTokens = await TokenEncryptionService.encryptTokens(tokens)
      
      const integrationData: Omit<GoogleSheetsIntegration, 'id'> = {
        user_id: userId,
        encrypted_tokens: encryptedTokens,
        spreadsheet_id: spreadsheetId,
        spreadsheet_name: spreadsheetName,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const docRef = doc(firestore, this.COLLECTION, userId)
      await setDoc(docRef, integrationData)

      console.log(`OAuth tokens stored successfully for user: ${userId}`)
    } catch (error) {
      console.error('Failed to store OAuth tokens:', error)
      throw new Error('Failed to store OAuth tokens')
    }
  }

  /**
   * Retrieve and decrypt OAuth tokens for a user
   */
  static async getTokens(userId: string): Promise<OAuthTokens | null> {
    try {
      const firestore = getFirebaseFirestore()
      const docRef = doc(firestore, this.COLLECTION, userId)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      const integration = docSnap.data() as GoogleSheetsIntegration
      
      if (integration.status !== 'active') {
        console.warn(`Integration status is ${integration.status} for user: ${userId}`)
        return null
      }

      const tokens = await TokenEncryptionService.decryptTokens(integration.encrypted_tokens)
      
      // Validate token structure
      if (!TokenEncryptionService.validateTokens(tokens)) {
        console.error('Invalid token structure for user:', userId)
        return null
      }

      return tokens
    } catch (error) {
      console.error('Failed to retrieve OAuth tokens:', error)
      return null
    }
  }

  /**
   * Update tokens after refresh
   */
  static async updateTokens(userId: string, newTokens: OAuthTokens): Promise<void> {
    try {
      const firestore = getFirebaseFirestore()
      const encryptedTokens = await TokenEncryptionService.encryptTokens(newTokens)
      
      const docRef = doc(firestore, this.COLLECTION, userId)
      await updateDoc(docRef, {
        encrypted_tokens: encryptedTokens,
        updated_at: new Date().toISOString(),
        status: 'active'
      })

      console.log(`OAuth tokens updated successfully for user: ${userId}`)
    } catch (error) {
      console.error('Failed to update OAuth tokens:', error)
      throw new Error('Failed to update OAuth tokens')
    }
  }

  /**
   * Get integration details
   */
  static async getIntegration(userId: string): Promise<GoogleSheetsIntegration | null> {
    try {
      const firestore = getFirebaseFirestore()
      const docRef = doc(firestore, this.COLLECTION, userId)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      return {
        id: docSnap.id,
        ...docSnap.data()
      } as GoogleSheetsIntegration
    } catch (error) {
      console.error('Failed to get integration:', error)
      return null
    }
  }

  /**
   * Update integration metadata (spreadsheet info, sync status)
   */
  static async updateIntegration(
    userId: string, 
    updates: Partial<Pick<GoogleSheetsIntegration, 'spreadsheet_id' | 'spreadsheet_name' | 'last_sync_at' | 'status'>>
  ): Promise<void> {
    try {
      const firestore = getFirebaseFirestore()
      const docRef = doc(firestore, this.COLLECTION, userId)
      
      await updateDoc(docRef, {
        ...updates,
        updated_at: new Date().toISOString()
      })

      console.log(`Integration updated successfully for user: ${userId}`)
    } catch (error) {
      console.error('Failed to update integration:', error)
      throw new Error('Failed to update integration')
    }
  }

  /**
   * Mark integration as revoked
   */
  static async revokeIntegration(userId: string): Promise<void> {
    try {
      const firestore = getFirebaseFirestore()
      const docRef = doc(firestore, this.COLLECTION, userId)
      
      await updateDoc(docRef, {
        status: 'revoked',
        updated_at: new Date().toISOString()
      })

      console.log(`Integration revoked for user: ${userId}`)
    } catch (error) {
      console.error('Failed to revoke integration:', error)
      throw new Error('Failed to revoke integration')
    }
  }

  /**
   * Delete integration completely
   */
  static async deleteIntegration(userId: string): Promise<void> {
    try {
      const firestore = getFirebaseFirestore()
      const docRef = doc(firestore, this.COLLECTION, userId)
      await deleteDoc(docRef)

      console.log(`Integration deleted for user: ${userId}`)
    } catch (error) {
      console.error('Failed to delete integration:', error)
      throw new Error('Failed to delete integration')
    }
  }

  /**
   * Check if user has active Google Sheets integration
   */
  static async hasActiveIntegration(userId: string): Promise<boolean> {
    try {
      const integration = await this.getIntegration(userId)
      return integration?.status === 'active'
    } catch (error) {
      console.error('Failed to check integration status:', error)
      return false
    }
  }
}