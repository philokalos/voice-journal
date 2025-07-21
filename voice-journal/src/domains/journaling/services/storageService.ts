import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirebaseStorage } from '../../../lib/firebase';

export interface VoiceUploadResult {
  url: string;
  path: string;
  size: number;
}

export class StorageService {
  private static generateFileName(userId: string, entryId: string): string {
    const timestamp = Date.now();
    return `voices/${userId}/${entryId}/${timestamp}.webm`;
  }

  static async uploadVoiceFile(
    audioBlob: Blob,
    userId: string,
    entryId: string
  ): Promise<VoiceUploadResult> {
    try {
      const fileName = this.generateFileName(userId, entryId);
      const storage = getFirebaseStorage();
      const storageRef = ref(storage, fileName);
      
      const snapshot = await uploadBytes(storageRef, audioBlob, {
        contentType: 'audio/webm',
        customMetadata: {
          userId,
          entryId,
          uploadedAt: new Date().toISOString()
        }
      });

      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        url: downloadURL,
        path: fileName,
        size: snapshot.metadata.size
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
}