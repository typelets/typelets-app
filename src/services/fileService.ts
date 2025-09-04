import { encryptNoteData, decryptNoteData } from '@/lib/encryption';
import type { FileAttachment } from '@/types/note';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class FileService {
  private getToken: (() => Promise<string | null>) | null = null;

  setTokenProvider(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  private async getAuthHeaders() {
    if (!this.getToken) {
      throw new Error('Token provider not set. Make sure to call setTokenProvider first.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async encryptFile(file: File, userId: string): Promise<{ encryptedData: string; encryptedTitle: string; iv: string; salt: string }> {
    const fileBuffer = await file.arrayBuffer();
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    
    const encrypted = await encryptNoteData(userId, file.name, base64Content);
    return {
      encryptedData: encrypted.encryptedContent,
      encryptedTitle: encrypted.encryptedTitle,
      iv: encrypted.iv,
      salt: encrypted.salt
    };
  }

  private async decryptFile(encryptedData: string, encryptedTitle: string, iv: string, salt: string, userId: string): Promise<ArrayBuffer> {
    const decrypted = await decryptNoteData(userId, encryptedTitle, encryptedData, iv, salt);
    
    const binaryString = atob(decrypted.content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async uploadFiles(
    noteId: string,
    files: FileList,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileAttachment[]> {
    const uploadPromises: Promise<FileAttachment>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      uploadPromises.push(this.uploadSingleFile(noteId, file, userId, onProgress));
    }

    return Promise.all(uploadPromises);
  }

  private async uploadSingleFile(
    noteId: string,
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileAttachment> {
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size exceeds 10MB limit');
    }

    const encrypted = await this.encryptFile(file, userId);
    
    const fileData = {
      originalName: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      encryptedData: encrypted.encryptedData,
      encryptedTitle: encrypted.encryptedTitle,
      iv: encrypted.iv,
      salt: encrypted.salt
    };

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100)
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 201 || xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch {
            reject(new Error('Invalid response format'));
          }
        } else if (xhr.status === 413) {
          reject(new Error('File too large. Maximum 10MB per file, 50MB total per note.'));
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${API_BASE_URL}/notes/${noteId}/files`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      this.getAuthHeaders().then((headers) => {
        xhr.setRequestHeader('Authorization', headers.Authorization);
        xhr.send(JSON.stringify(fileData));
      }).catch((error) => {
        reject(error);
      });
    });
  }

  async downloadFile(attachment: FileAttachment, userId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/files/${attachment.id}`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const encryptedFile = await response.json();
    const decryptedBuffer = await this.decryptFile(
      encryptedFile.encryptedData,
      encryptedFile.encryptedTitle,
      encryptedFile.iv,
      encryptedFile.salt,
      userId
    );
    
    return new Blob([decryptedBuffer], { type: attachment.mimeType });
  }

  async removeFile(attachmentId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/files/${attachmentId}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
  }

  async getAttachments(noteId: string): Promise<FileAttachment[]> {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}/files`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch attachments: ${response.statusText}`);
    }

    return response.json();
  }

  downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const fileService = new FileService();