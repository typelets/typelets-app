import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Check,
  Hash,
  Calendar,
  Folder as FolderIcon,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Folder } from '@/types/note';
import {
  buildFolderPath,
  getFolderOptionsWithPaths,
  canMoveToFolder,
} from '@/utils/folderTree';
import { FOLDER_COLORS } from '../constants';

interface FolderEditModalProps {
  isOpen: boolean;
  folder: Folder | null;
  folders: Folder[];
  onClose: () => void;
  onUpdateFolder: (
    folderId: string,
    name: string,
    color: string
  ) => Promise<void>;
  onUpdateFolderParent: (
    folderId: string,
    parentId: string | null
  ) => Promise<void>;
  onCreateSubfolder: (parentId: string) => void;
  onOpenDeleteModal: (folder: Folder) => void;
}

export default function FolderEditModal({
  isOpen,
  folder,
  folders,
  onClose,
  onUpdateFolder,
  onUpdateFolderParent,
  onCreateSubfolder,
  onOpenDeleteModal,
}: FolderEditModalProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6b7280');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableParentsWithPaths = useMemo(() => {
    if (!folder) return [];
    return getFolderOptionsWithPaths(folder.id, folders);
  }, [folder, folders]);

  const isValidParentChange = useMemo(() => {
    if (!folder) return true;
    if (!selectedParentId || selectedParentId === folder.parentId) return true;
    return canMoveToFolder(folder.id, selectedParentId, folders);
  }, [folder, selectedParentId, folders]);

  useEffect(() => {
    if (isOpen && folder) {
      setName(folder.name);
      setSelectedColor(folder.color ?? '#6b7280');
      setSelectedParentId(folder.parentId ?? null);
      setIsSaving(false);
      setHasChanges(false);

      // Focus input after modal opens
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, folder]);

  useEffect(() => {
    if (!folder) return;

    const changes =
      name !== folder.name ||
      selectedColor !== (folder.color ?? '#6b7280') ||
      selectedParentId !== (folder.parentId ?? null);
    setHasChanges(changes);
  }, [name, selectedColor, selectedParentId, folder]);

  const handleSave = async () => {
    if (!folder || !name.trim() || isSaving || !hasChanges) return;

    if (!isValidParentChange) {
      alert('Cannot move folder to its own descendant');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateFolder(folder.id, name.trim(), selectedColor);

      if (selectedParentId !== (folder.parentId ?? null)) {
        await onUpdateFolderParent(folder.id, selectedParentId);
      }

      onClose();
    } catch (error) {
      console.error('Failed to update folder:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      void handleSave();
    }
  };

  const handleDelete = () => {
    if (folder) {
      onOpenDeleteModal(folder);
      onClose();
    }
  };

  const handleCreateSubfolder = () => {
    if (folder) {
      onCreateSubfolder(folder.id);
      onClose();
    }
  };

  if (!folder) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <div
              className="h-5 w-5 rounded-sm"
              style={{ backgroundColor: selectedColor }}
            />
            Edit Folder
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Folder Name */}
          <div className="space-y-2">
            <label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Folder Name
            </label>
            <Input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              placeholder="Enter folder name..."
            />
          </div>

          {/* Parent Folder */}
          <div className="space-y-2">
            <label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Parent Folder
            </label>
            <select
              value={selectedParentId ?? ''}
              onChange={(e) => setSelectedParentId(e.target.value || null)}
              disabled={isSaving}
              className="border-border bg-background focus:ring-ring h-9 w-full rounded-md border px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:outline-none"
            >
              <option value="">📁 Root Level (No Parent)</option>
              {availableParentsWithPaths.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  📂 {parent.path}
                </option>
              ))}
            </select>
            <div className="text-muted-foreground text-xs">
              {selectedParentId === null
                ? 'This folder will be at the root level'
                : `This folder will be inside "${
                    availableParentsWithPaths.find(
                      (p) => p.id === selectedParentId
                    )?.path ?? 'Unknown'
                  }"`}
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  disabled={isSaving}
                  className={`relative h-10 w-10 rounded-lg border-2 transition-all hover:scale-105 ${
                    selectedColor === color
                      ? 'border-foreground scale-105 shadow-lg'
                      : 'border-border hover:border-foreground/50'
                  } disabled:opacity-50 disabled:hover:scale-100`}
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && (
                    <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2">
            <label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Details
            </label>
            <div className="bg-accent/20 text-muted-foreground space-y-1.5 rounded-lg p-3 text-xs">
              <div className="flex items-center gap-2">
                <Hash className="h-3 w-3" />
                <span className="font-mono">{folder.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>
                  Created {new Date(folder.createdAt).toLocaleDateString()}
                </span>
              </div>
              {folder.parentId && (
                <div className="flex items-center gap-2">
                  <FolderIcon className="h-3 w-3" />
                  <span>
                    Currently in &ldquo;
                    {buildFolderPath(folder.parentId, folders) ?? 'Unknown'}
                    &rdquo;
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={handleCreateSubfolder}
              disabled={isSaving}
              className="w-full"
              size="sm"
            >
              <FolderIcon className="mr-2 h-4 w-4" />
              Create Subfolder
            </Button>

            {hasChanges && (
              <Button
                onClick={() => void handleSave()}
                disabled={!name.trim() || isSaving}
                className="w-full"
                size="sm"
              >
                {isSaving ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            )}

            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
              className="w-full"
              size="sm"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Folder
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
