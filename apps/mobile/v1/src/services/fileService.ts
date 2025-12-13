/**
 * File Service for Mobile
 * Handles file uploads, downloads, and encryption
 */

import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import forge from 'node-forge';

import { ENCRYPTION_CONFIG } from '../lib/encryption/config';
import { decryptWithAESGCM,encryptWithAESGCM } from '../lib/encryption/core/aes';
import { deriveEncryptionKey } from '../lib/encryption/core/keyDerivation';
import { getMasterKey,getUserSecret } from '../lib/encryption/storage/secureStorage';
import type { FileAttachment } from './api/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface PickedFile {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

class FileService {
  private getToken: (() => Promise<string | null>) | null = null;

  setTokenProvider(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.getToken) {
      throw new Error('Token provider not set. Make sure to call setTokenProvider first.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Convert base64 to Uint8Array
   * @deprecated Not currently used - keeping for potential future use
   */
  // noinspection JSUnusedLocalSymbols
  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = forge.util.decode64(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }


  /**
   * Encrypt file content (for uploads - mobile-compatible)
   */
  private async encryptFile(
    base64Content: string,
    fileName: string,
    userId: string
  ): Promise<{
    encryptedData: string;
    encryptedTitle: string;
    iv: string;
    salt: string;
  }> {
    try {
      // Generate random salt and IV
      const saltBytes = await Crypto.getRandomBytesAsync(ENCRYPTION_CONFIG.SALT_LENGTH);
      const ivBytes = await Crypto.getRandomBytesAsync(ENCRYPTION_CONFIG.IV_LENGTH);

      // Convert Uint8Array to base64 using node-forge
      const saltString = String.fromCharCode.apply(null, Array.from(saltBytes));
      const ivString = String.fromCharCode.apply(null, Array.from(ivBytes));
      const saltBase64 = forge.util.encode64(saltString);
      const ivBase64 = forge.util.encode64(ivString);

      // Derive encryption key (mobile-compatible)
      const keyBase64 = await this.deriveKeyForFiles(userId, saltBase64);

      // Encrypt filename and content using mobile encryption helpers
      const encryptedTitle = await encryptWithAESGCM(fileName, keyBase64, ivBase64);
      const encryptedData = await encryptWithAESGCM(base64Content, keyBase64, ivBase64);

      return {
        encryptedTitle,
        encryptedData,
        iv: ivBase64,
        salt: saltBase64,
      };
    } catch (error) {
      throw new Error(`File encryption failed: ${error}`);
    }
  }

  /**
   * Derive base64 key for file encryption/decryption (mobile-compatible)
   */
  private async deriveKeyForFiles(userId: string, saltBase64: string): Promise<string> {
    // Check if user has master password (same logic as mobile encryption)
    const masterKey = await getMasterKey(userId);

    if (masterKey) {
      // Master password mode: return the stored key directly
      return masterKey;
    }

    // Non-master-password mode: derive key from user secret using mobile's key derivation
    const userSecret = await getUserSecret(userId);
    return await deriveEncryptionKey(userId, userSecret, saltBase64);
  }

  /**
   * Decrypt file content (mobile-compatible using node-forge)
   */
  private async decryptFile(
    encryptedData: string,
    ivBase64: string,
    saltBase64: string,
    userId: string
  ): Promise<string> {
    try {
      // Derive the base64 key (mobile-compatible)
      const keyBase64 = await this.deriveKeyForFiles(userId, saltBase64);

      // Decrypt the file content using mobile encryption helpers
      const decryptedBase64 = await decryptWithAESGCM(encryptedData, keyBase64, ivBase64);

      return decryptedBase64;
    } catch (error) {
      throw new Error(`File decryption failed: ${error}`);
    }
  }


  /**
   * Pick files from device
   */
  async pickFiles(): Promise<PickedFile[]> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return [];
      }

      return result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name,
        size: asset.size || 0,
        mimeType: asset.mimeType || 'application/octet-stream',
      }));
    } catch (error) {
      console.error('Error picking files:', error);
      throw new Error('Failed to pick files');
    }
  }

  /**
   * Upload data using XMLHttpRequest with real progress tracking
   * Returns a promise that resolves with the response or rejects on error
   */
  private uploadWithProgress(
    url: string,
    headers: Record<string, string>,
    body: string,
    onProgress?: (loaded: number, total: number) => void,
    timeoutMs: number = 5 * 60 * 1000 // 5 minute default timeout for uploads
  ): Promise<{ ok: boolean; status: number; statusText: string; json: () => Promise<any> }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(event.loaded, event.total);
        }
      };

      xhr.onload = () => {
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          statusText: xhr.statusText,
          json: () => Promise.resolve(JSON.parse(xhr.responseText)),
        });
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Upload timed out. Please check your connection and try again.'));
      };

      xhr.open('POST', url);
      xhr.timeout = timeoutMs;

      // Set headers
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.send(body);
    });
  }

  /**
   * Upload a single file with retry logic
   */
  async uploadFile(
    noteId: string,
    file: PickedFile,
    userId: string,
    onProgress?: (progress: UploadProgress) => void,
    retryCount: number = 0
  ): Promise<FileAttachment> {
    const MAX_RETRIES = 2;
    const fileSize = file.size || 0;

    // Check file size (10MB limit)
    if (fileSize > 10 * 1024 * 1024) {
      throw new Error('File size exceeds 10MB limit');
    }

    try {
      // Step 1: Reading file (0-15%)
      onProgress?.({ loaded: 0, total: fileSize, percentage: 0 });
      const base64Content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: 'base64' as any,
      });
      onProgress?.({ loaded: fileSize * 0.15, total: fileSize, percentage: 15 });

      // Step 2: Encrypting file (15-30%)
      const encrypted = await this.encryptFile(base64Content, file.name, userId);
      onProgress?.({ loaded: fileSize * 0.3, total: fileSize, percentage: 30 });

      const fileData = {
        originalName: file.name,
        mimeType: file.mimeType || 'application/octet-stream',
        size: fileSize,
        encryptedData: encrypted.encryptedData,
        encryptedTitle: encrypted.encryptedTitle,
        iv: encrypted.iv,
        salt: encrypted.salt,
      };

      const body = JSON.stringify(fileData);
      const headers = await this.getAuthHeaders();

      // Step 3: Uploading with real progress (30-95%)
      // The upload progress represents 30% to 95% of the total progress
      const response = await this.uploadWithProgress(
        `${API_BASE_URL}/notes/${noteId}/files`,
        headers,
        body,
        (loaded, total) => {
          // Map upload progress (0-100%) to overall progress (30-95%)
          const uploadPercentage = total > 0 ? (loaded / total) * 100 : 0;
          const overallPercentage = 30 + (uploadPercentage * 0.65);
          onProgress?.({
            loaded: fileSize * (overallPercentage / 100),
            total: fileSize,
            percentage: overallPercentage,
          });
        }
      );

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('File too large. Maximum 10MB per file, 50MB total per note.');
        }
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      // Step 4: Processing response (95-100%)
      const result = await response.json();
      onProgress?.({ loaded: fileSize, total: fileSize, percentage: 100 });

      return result;
    } catch (error) {
      // Retry on network errors (not on validation or server errors)
      const isRetryable = error instanceof Error &&
        (error.message.includes('Network error') ||
         error.message.includes('timed out') ||
         error.message.includes('timeout'));

      if (isRetryable && retryCount < MAX_RETRIES) {
        console.log(`[FileService] Upload failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.uploadFile(noteId, file, userId, onProgress, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Upload multiple files with aggregated progress tracking
   */
  async uploadFiles(
    noteId: string,
    files: PickedFile[],
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileAttachment[]> {
    if (files.length === 0) {
      return [];
    }

    // For a single file, use the progress callback directly
    if (files.length === 1) {
      const result = await this.uploadFile(noteId, files[0], userId, onProgress);
      return [result];
    }

    // For multiple files, track progress per file and aggregate
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
    const fileProgress: number[] = files.map(() => 0);

    const updateAggregatedProgress = () => {
      if (!onProgress || totalSize === 0) return;

      const totalLoaded = fileProgress.reduce((sum, p) => sum + p, 0);
      const percentage = (totalLoaded / totalSize) * 100;

      onProgress({
        loaded: totalLoaded,
        total: totalSize,
        percentage: Math.min(percentage, 100),
      });
    };

    // Upload files sequentially to avoid overwhelming the connection
    // and to provide smoother progress updates
    const results: FileAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileSize = file.size || 0;

      const result = await this.uploadFile(
        noteId,
        file,
        userId,
        (progress) => {
          // Track this file's contribution to total progress
          fileProgress[i] = (progress.percentage / 100) * fileSize;
          updateAggregatedProgress();
        }
      );

      results.push(result);
    }

    return results;
  }

  /**
   * Download and decrypt a file
   */
  async downloadFile(attachment: FileAttachment, userId: string): Promise<string> {
    try {
      // Check if file already exists in cache
      // @ts-ignore - cacheDirectory exists on FileSystem but types are incomplete
      const cacheDir = FileSystem.cacheDirectory || '';
      const fileUri = `${cacheDir}${attachment.id}_${attachment.originalName}`;

      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        console.log('[Cache] File already downloaded:', fileUri);
        return fileUri;
      }

      console.log('[1/6] Starting download:', attachment.id, attachment.originalName);

      const headers = await this.getAuthHeaders();
      console.log('[2/6] Got auth headers');

      const response = await fetch(`${API_BASE_URL}/files/${attachment.id}`, {
        headers,
      });

      console.log('[3/6] Response received, status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ERROR] Download failed:', response.status, errorText);
        // noinspection ExceptionCaughtLocallyJS - Intentionally caught locally for logging before re-throw
        throw new Error(`${response.status} ${errorText}`);
      }

      console.log('[4/6] Parsing JSON and decrypting...');
      const encryptedFile = await response.json();

      const decryptedBase64 = await this.decryptFile(
        encryptedFile.encryptedData,
        encryptedFile.iv,
        encryptedFile.salt,
        userId
      );

      console.log('[5/6] Writing to cache...');

      await FileSystem.writeAsStringAsync(fileUri, decryptedBase64, {
        encoding: 'base64' as any,
      });

      console.log('[6/6] File saved successfully:', fileUri);

      return fileUri;
    } catch (error) {
      console.error('[ERROR] Download failed:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 200),
        });
      }
      throw error;
    }
  }

  /**
   * Share/open a downloaded file
   */
  async shareFile(fileUri: string): Promise<void> {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri);
    } else {
      throw new Error('Sharing is not available on this device');
    }
  }

  /**
   * Delete a file attachment
   */
  async deleteFile(attachmentId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/files/${attachmentId}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
  }

  /**
   * Get attachments for a note
   */
  async getAttachments(noteId: string): Promise<FileAttachment[]> {
    // Temp notes don't exist on server yet - return empty array
    if (noteId.startsWith('temp_')) {
      return [];
    }

    // Check if token provider is set and token is available
    if (!this.getToken) {
      console.warn('[FileService] Token provider not set yet - skipping attachment fetch');
      return [];
    }

    const token = await this.getToken();
    if (!token) {
      console.warn('[FileService] No auth token available yet - skipping attachment fetch');
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/notes/${noteId}/files`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch attachments: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    // noinspection JSVoidFunctionReturnValueUsed
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file icon emoji based on MIME type
   */
  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊';
    return '📎';
  }
}

export const fileService = new FileService();
