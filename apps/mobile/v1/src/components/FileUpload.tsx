import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { logger } from '../lib/logger';
import { type FileAttachment,useApiService } from '../services/api';
import { useTheme } from '../theme';

interface FileUploadProps {
  noteId?: string;
  attachments?: FileAttachment[];
  onUploadComplete?: (attachments: FileAttachment[]) => void;
  onDeleteComplete?: () => void;
  onBeforeUpload?: () => Promise<string | null>;
}

export function FileUpload({
  noteId: initialNoteId,
  attachments = [],
  onUploadComplete,
  onDeleteComplete,
  onBeforeUpload,
}: FileUploadProps) {
  const theme = useTheme();
  const api = useApiService();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  const handlePickFiles = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // If no noteId, get it from onBeforeUpload callback
      let noteId: string | null = initialNoteId;
      if (!noteId && onBeforeUpload) {
        noteId = await onBeforeUpload();
        if (!noteId) {
          // Upload was cancelled or failed to create note
          logger.warn('[NOTE] File upload cancelled - no note ID', {
            attributes: { reason: 'onBeforeUpload returned null' }
          });
          return;
        }
      }

      if (!noteId) {
        logger.warn('[NOTE] File upload failed - note not saved', {
          attributes: { reason: 'note must be saved first' }
        });
        Alert.alert('Error', 'Note must be saved before adding attachments');
        return;
      }

      const files = await api.pickFiles();

      if (files.length === 0) {
        return;
      }

      logger.info('[NOTE] Uploading files', {
        attributes: { noteId, fileCount: files.length, totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0) }
      });

      setIsUploading(true);
      setUploadProgress(0);

      const uploadedFiles = await api.uploadFiles(noteId, files, (progress) => {
        setUploadProgress(progress.percentage);
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logger.info('[NOTE] Files uploaded successfully', {
        attributes: { noteId, fileCount: uploadedFiles.length }
      });
      onUploadComplete?.(uploadedFiles);
    } catch (error) {
      logger.error('[NOTE] File upload failed', error instanceof Error ? error : undefined, {
        attributes: { noteId: initialNoteId }
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Upload Failed', error instanceof Error ? error.message : 'Failed to upload files');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownloadChoice = async (attachment: FileAttachment) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      logger.info('[NOTE] Downloading attachment from editor', {
        attributes: { attachmentId: attachment.id, filename: attachment.originalName }
      });
      const fileUri = await api.downloadFile(attachment);
      await api.shareFile(fileUri);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logger.info('[NOTE] Attachment shared from editor', {
        attributes: { attachmentId: attachment.id, filename: attachment.originalName }
      });
    } catch (error) {
      logger.error('[NOTE] Failed to download/share attachment from editor', error instanceof Error ? error : undefined, {
        attributes: { attachmentId: attachment.id, filename: attachment.originalName }
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to download file';
      if (errorMessage.includes('not available')) {
        Alert.alert('Error', 'Sharing is not available on this device.');
      } else {
        Alert.alert('Download Failed', errorMessage);
      }
    }
  };

  const handleDelete = async (attachment: FileAttachment) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Delete Attachment',
      `Delete ${attachment.originalName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingIds((prev) => [...prev, attachment.id]);

              logger.info('[NOTE] Deleting attachment from editor', {
                attributes: { attachmentId: attachment.id, filename: attachment.originalName }
              });
              await api.deleteAttachment(attachment.id);

              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              logger.info('[NOTE] Attachment deleted successfully from editor', {
                attributes: { attachmentId: attachment.id, filename: attachment.originalName }
              });
              onDeleteComplete?.();
            } catch (error) {
              logger.error('[NOTE] Failed to delete attachment from editor', error instanceof Error ? error : undefined, {
                attributes: { attachmentId: attachment.id, filename: attachment.originalName }
              });
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Delete Failed', error instanceof Error ? error.message : 'Failed to delete attachment');
            } finally {
              setDeletingIds((prev) => prev.filter((id) => id !== attachment.id));
            }
          },
        },
      ]
    );
  };

  const styles = createStyles();

  return (
    <View style={styles.container}>
      {/* Upload Button */}
      <TouchableOpacity
        style={[styles.uploadButton, { borderColor: theme.colors.border }]}
        onPress={handlePickFiles}
        disabled={isUploading}
      >
        <View style={styles.uploadContent}>
          {isUploading ? (
            <>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.uploadText, { color: theme.colors.mutedForeground }]}>
                Uploading... {uploadProgress.toFixed(0)}%
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={24} color={theme.colors.mutedForeground} />
              <Text style={[styles.uploadText, { color: theme.colors.mutedForeground }]}>
                Tap to attach files
              </Text>
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <View style={styles.attachmentsList}>
          <Text style={[styles.attachmentsTitle, { color: theme.colors.foreground }]}>
            Attachments ({attachments.length})
          </Text>

          {attachments.map((attachment) => {
            const isDeleting = deletingIds.includes(attachment.id);
            const icon = api.getFileIcon(attachment.mimeType);

            return (
              <View
                key={attachment.id}
                style={[
                  styles.attachmentItem,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={styles.fileIcon}>{icon}</Text>

                <View style={styles.fileInfo}>
                  <Text
                    style={[styles.fileName, { color: theme.colors.foreground }]}
                    numberOfLines={1}
                  >
                    {attachment.originalName}
                  </Text>
                  <Text style={[styles.fileSize, { color: theme.colors.mutedForeground }]}>
                    {api.formatFileSize(attachment.size)}
                  </Text>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.muted }]}
                    onPress={() => handleDownloadChoice(attachment)}
                    disabled={isDeleting}
                  >
                    <Ionicons
                      name="download-outline"
                      size={16}
                      color={theme.colors.mutedForeground}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.muted }]}
                    onPress={() => handleDelete(attachment)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={theme.colors.mutedForeground} />
                    ) : (
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const createStyles = () =>
  StyleSheet.create({
    container: {
      gap: 12,
    },
    uploadButton: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderRadius: 8,
      padding: 16,
    },
    uploadContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    uploadText: {
      fontSize: 14,
    },
    attachmentsList: {
      gap: 8,
    },
    attachmentsTitle: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 4,
    },
    attachmentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      gap: 12,
    },
    fileIcon: {
      fontSize: 20,
    },
    fileInfo: {
      flex: 1,
      minWidth: 0,
    },
    fileName: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 2,
    },
    fileSize: {
      fontSize: 12,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
