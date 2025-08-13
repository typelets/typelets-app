import { useState } from 'react';

import { X, AlertTriangle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

import { Button } from '@/components/ui/button.tsx';
import type { Folder } from '@/types/note.ts';

interface FolderDeleteModalProps {
  isOpen: boolean;
  folder: Folder | null;
  onClose: () => void;
  onDeleteFolder: (folderId: string) => Promise<void>;
}

export default function FolderDeleteModal({
  isOpen,
  folder,
  onClose,
  onDeleteFolder,
}: FolderDeleteModalProps) {
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

  if (!folder) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content className="bg-background fixed top-[50%] left-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-hidden rounded-lg border shadow-lg">
          {/* Header */}
          <div className="border-border flex items-center justify-between border-b p-4">
            <div className="mr-8 space-y-1">
              <Dialog.Title className="text-lg font-semibold">
                Delete Folder
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-sm">
                Permanently delete{' '}
                <span className="font-bold">{folder.name}</span>
              </Dialog.Description>
            </div>
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
                  You are about to permanently delete the folder "{folder.name}
                  ".
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
            <div className="flex justify-end pt-2">
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
                  <>Delete</>
                )}
              </Button>
            </div>
          </div>

          <Dialog.Close asChild>
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 right-4"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
