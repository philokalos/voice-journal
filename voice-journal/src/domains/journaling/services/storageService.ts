import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirebaseStorage } from '../../../lib/firebase';
import { EncryptionService } from '../../security/services/encryptionService';
import { KeyManagementService } from '../../security/services/keyManagementService';

export interface VoiceUploadResult {
  url: string;
  path: string;
  size: number;
  encrypted: boolean;
}

export class StorageService {
  private static generateFileName(userId: string, entryId: string, encrypted: boolean = true): string {
    const timestamp = Date.now();
    const extension = encrypted ? 'enc' : 'webm';
    return `voices/${userId}/${entryId}/${timestamp}.${extension}`;
  }

  static async uploadVoiceFile(
    audioBlob: Blob,
    userId: string,
    entryId: string
  ): Promise<VoiceUploadResult> {
    try {
      // Check if encryption is supported
      const encryptionSupported = EncryptionService.isSupported();
      
      let blobToUpload: Blob;
      let metadata: any;
      let encrypted = false;

      if (encryptionSupported) {
        // Get user's encryption key
        const userKey = await KeyManagementService.getUserMasterKey(userId);
        
        // Encrypt the audio blob
        const { encryptedBlob, metadata: encryptionMetadata } = await EncryptionService.encryptAudioBlob(audioBlob, userKey);
        
        blobToUpload = encryptedBlob;
        metadata = encryptionMetadata;
        encrypted = true;
        
        // Update key usage
        await KeyManagementService.updateKeyUsage(userId);
        
        console.log('Audio encrypted before upload');
      } else {
        console.warn('Web Crypto API not supported, uploading unencrypted audio');
        blobToUpload = audioBlob;
        metadata = { encrypted: false };
      }

      const fileName = this.generateFileName(userId, entryId, encrypted);
      const storage = getFirebaseStorage();
      const storageRef = ref(storage, fileName);
      
      const snapshot = await uploadBytes(storageRef, blobToUpload, {
        contentType: encrypted ? 'application/octet-stream' : 'audio/webm',
        customMetadata: {
          userId,
          entryId,
          uploadedAt: new Date().toISOString(),
          encrypted: encrypted.toString(),
          originalContentType: 'audio/webm',
          ...metadata
        }
      });

      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        url: downloadURL,
        path: fileName,
        size: snapshot.metadata.size,
        encrypted
      };
    } catch (error) {
      console.error('Voice upload failed:', error);
      throw new Error('음성 파일 업로드에 실패했습니다.');
    }
  }

  static async deleteVoiceFile(filePath: string): Promise<void> {
    try {
      const storage = getFirebaseStorage();
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Voice deletion failed:', error);
      throw new Error('음성 파일 삭제에 실패했습니다.');
    }
  }

  static async getVoiceFileURL(filePath: string): Promise<string> {
    try {
      const storage = getFirebaseStorage();
      const storageRef = ref(storage, filePath);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Failed to get voice file URL:', error);
      throw new Error('음성 파일 URL을 가져오는데 실패했습니다.');
    }
  }

  /**
   * Download and decrypt voice file for playback
   * Returns a blob URL that can be used in audio elements
   */
  static async getDecryptedVoiceFile(filePath: string, userId: string): Promise<string> {
    try {
      // Check if file is encrypted based on extension
      const isEncrypted = filePath.endsWith('.enc');
      
      if (!isEncrypted) {
        // File is not encrypted, return normal URL
        return await this.getVoiceFileURL(filePath);
      }

      // File is encrypted, download and decrypt
      const storage = getFirebaseStorage();
      const storageRef = ref(storage, filePath);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Download encrypted file
      const response = await fetch(downloadURL);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      
      const encryptedBlob = await response.blob();
      
      // Get user's encryption key
      const userKey = await KeyManagementService.getUserMasterKey(userId);
      
      // Decrypt the audio
      const decryptedBlob = await EncryptionService.decryptAudioBlob(encryptedBlob, userKey);
      
      // Create blob URL for playback
      const blobURL = URL.createObjectURL(decryptedBlob);
      
      console.log('Audio decrypted successfully for playback');
      return blobURL;
      
    } catch (error) {
      console.error('Failed to decrypt voice file:', error);
      throw new Error('암호화된 음성 파일을 복호화하는데 실패했습니다.');
    }
  }

  /**
   * Clean up blob URL to prevent memory leaks
   */
  static cleanupBlobURL(blobURL: string): void {
    if (blobURL.startsWith('blob:')) {
      URL.revokeObjectURL(blobURL);
    }
  }
}