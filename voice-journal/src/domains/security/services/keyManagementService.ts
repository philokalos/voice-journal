import { getFirebaseFirestore } from '../../../lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { EncryptionService, UserEncryptionKey } from './encryptionService'

export class KeyManagementService {
  private static readonly COLLECTION_NAME = 'user_encryption_keys'
  
  /**
   * Get or create encryption key for the current user
   * Returns the user's master encryption key
   */
  static async getUserMasterKey(userId: string): Promise<CryptoKey> {
    try {
      const firestore = getFirebaseFirestore()
      const keyDocRef = doc(firestore, this.COLLECTION_NAME, userId)
      const keyDoc = await getDoc(keyDocRef)

      if (keyDoc.exists()) {
        // Key exists, decrypt and return it
        const keyData = keyDoc.data() as UserEncryptionKey
        return await EncryptionService.getUserKey(userId, keyData)
      } else {
        // First time user, generate new key
        console.log('Generating new encryption key for user:', userId)
        const { masterKey, keyData } = await EncryptionService.generateUserKey(userId)
        
        // Store encrypted key in Firestore
        await setDoc(keyDocRef, {
          ...keyData,
          userId,
          lastUsed: new Date().toISOString()
        })
        
        console.log('Encryption key generated and stored for user:', userId)
        return masterKey
      }
    } catch (error) {
      console.error('Failed to get/create user master key:', error)
      throw new Error('Failed to initialize user encryption')
    }
  }

  /**
   * Update last used timestamp for user's encryption key
   */
  static async updateKeyUsage(userId: string): Promise<void> {
    try {
      const firestore = getFirebaseFirestore()
      const keyDocRef = doc(firestore, this.COLLECTION_NAME, userId)
      
      // Update last used timestamp
      await setDoc(keyDocRef, {
        lastUsed: new Date().toISOString()
      }, { merge: true })
    } catch (error) {
      console.error('Failed to update key usage:', error)
      // Don't throw error for this non-critical operation
    }
  }

  /**
   * Check if user has an encryption key
   */
  static async hasEncryptionKey(userId: string): Promise<boolean> {
    try {
      const firestore = getFirebaseFirestore()
      const keyDocRef = doc(firestore, this.COLLECTION_NAME, userId)
      const keyDoc = await getDoc(keyDocRef)
      return keyDoc.exists()
    } catch (error) {
      console.error('Failed to check encryption key existence:', error)
      return false
    }
  }

  /**
   * Delete user's encryption key (used in data deletion workflow)
   */
  static async deleteUserKey(userId: string): Promise<void> {
    try {
      const firestore = getFirebaseFirestore()
      const keyDocRef = doc(firestore, this.COLLECTION_NAME, userId)
      
      // In practice, we might want to soft-delete or archive keys
      // For now, we'll actually delete them as part of GDPR compliance
      await setDoc(keyDocRef, {
        deleted: true,
        deletedAt: new Date().toISOString()
      }, { merge: true })
      
      console.log('User encryption key marked as deleted:', userId)
    } catch (error) {
      console.error('Failed to delete user encryption key:', error)
      throw new Error('Failed to delete encryption key')
    }
  }
}