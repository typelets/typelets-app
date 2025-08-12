import { useState } from 'react';

import { X, Trash2, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button.tsx';
import type { Folder } from '@/types/note.ts';

interface DeleteFolderModalProps {
  isOpen: boolean;
  folder: Folder | null;
  onClose: () => void;
  onDeleteFolder: (folderId: string) => Promise<void>;
}

export default function FolderModalDelete({
  isOpen,
  folder,
  onClose,
  onDeleteFolder,
}: DeleteFolderModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!folder) return;

    setIsDeleting(true);
    setError('');

    try {
      await onDeleteFolder(folder.id);
      onClose();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete folder';
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setError('');
      onClose();
    }
  };

  if (!isOpen || !folder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border-border mx-4 w-full max-w-md rounded-lg border shadow-lg">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Delete Folder</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isDeleting}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-4">
          {/* Warning Message */}
          <div className="bg-destructive/10 border-destructive/20 flex items-start gap-3 rounded-md border p-3">
            <AlertTriangle className="text-destructive mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <p className="text-destructive text-sm font-medium">
                This action cannot be undone
              </p>
              <p className="text-muted-foreground text-sm">
                You are about to permanently delete the folder &ldquo;
                {folder.name}&rdquo;.
              </p>
            </div>
          </div>

          {/* Folder Preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Folder to Delete</label>
            <div className="bg-accent/20 flex items-center gap-3 rounded-md px-3 py-2">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: folder.color ?? '#6b7280' }}
              />
              <span className="text-sm font-medium">{folder.name}</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border-destructive/20 rounded-md border p-3">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Additional Info */}
          <div className="text-muted-foreground space-y-1 text-sm">
            <p>• This folder must be empty before it can be deleted</p>
            <p>• Move or delete all notes and subfolders first</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Folder
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
