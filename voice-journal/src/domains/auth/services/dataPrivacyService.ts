import { getFunctions, httpsCallable } from 'firebase/functions'
import { firebaseApp } from '../../../lib/firebase'

export interface DataDeletionResult {
  success: boolean
  message: string
  deletedEntries: number
  deletedAudioFiles: number
  deletedAuditLogs: number
  timestamp: string
}

export class DataPrivacyService {
  /**
   * Request complete deletion of all user data (GDPR/CCPA compliance)
   * This will delete:
   * - All journal entries
   * - All audio files
   * - All audit logs
   * - User account
   */
  static async deleteAllUserData(): Promise<DataDeletionResult> {
    try {
      const functions = getFunctions(firebaseApp)
      const deleteUserData = httpsCallable<void, DataDeletionResult>(functions, 'deleteUserData')
      
      const result = await deleteUserData()
      
      if (!result.data.success) {
        throw new Error(result.data.message || 'Data deletion failed')
      }
      
      return result.data
    } catch (error) {
      console.error('Failed to delete user data:', error)
      
      if (error instanceof Error) {
        throw new Error(`Data deletion failed: ${error.message}`)
      }
      
      throw new Error('Failed to delete user data. Please try again or contact support.')
    }
  }

  /**
   * Confirm user intention to delete all data
   * Returns a promise that resolves to true if user confirms
   */
  static async confirmDataDeletion(): Promise<boolean> {
    const confirmation = window.confirm(
      'Are you sure you want to delete ALL your data?\n\n' +
      'This action will permanently delete:\n' +
      '• All your journal entries\n' +
      '• All voice recordings\n' +
      '• Your account and profile\n' +
      '• All associated data\n\n' +
      'This action CANNOT be undone.\n\n' +
      'Type "DELETE ALL MY DATA" to confirm:'
    )
    
    if (!confirmation) {
      return false
    }
    
    const confirmationText = window.prompt(
      'To confirm deletion, please type exactly: DELETE ALL MY DATA'
    )
    
    return confirmationText === 'DELETE ALL MY DATA'
  }

  /**
   * Handle complete data deletion workflow with user confirmation
   */
  static async handleDataDeletionRequest(): Promise<DataDeletionResult | null> {
    try {
      // Step 1: Get user confirmation
      const confirmed = await this.confirmDataDeletion()
      
      if (!confirmed) {
        console.log('Data deletion cancelled by user')
        return null
      }
      
      // Step 2: Show loading state
      const deleteButton = document.querySelector('[data-delete-account]') as HTMLButtonElement
      if (deleteButton) {
        deleteButton.disabled = true
        deleteButton.textContent = 'Deleting data...'
      }
      
      // Step 3: Execute deletion
      const result = await this.deleteAllUserData()
      
      // Step 4: Show success message
      alert(
        `Data deletion completed successfully!\n\n` +
        `Deleted:\n` +
        `• ${result.deletedEntries} journal entries\n` +
        `• ${result.deletedAudioFiles} audio files\n` +
        `• ${result.deletedAuditLogs} audit logs\n\n` +
        `You will now be signed out.`
      )
      
      return result
      
    } catch (error) {
      // Reset button state
      const deleteButton = document.querySelector('[data-delete-account]') as HTMLButtonElement
      if (deleteButton) {
        deleteButton.disabled = false
        deleteButton.textContent = 'Delete All My Data'
      }
      
      console.error('Data deletion workflow failed:', error)
      
      alert(
        'Failed to delete your data. Please try again later or contact support.\n\n' +
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      
      throw error
    }
  }
}