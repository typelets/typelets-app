import React, { useState, useEffect, useRef } from 'react';

import { Check, FolderIcon } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (name: string, color: string) => void;
  parentFolderName?: string | null;
}

const FOLDER_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#6b7280',
  '#78716c',
  '#1f2937',
  '#374151',
];

export default function CreateFolderModal({
  isOpen,
  onClose,
  onCreateFolder,
  parentFolderName,
}: CreateFolderModalProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6b7280');
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setSelectedColor('#6b7280');
      setIsCreating(false);

      // Focus input after modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleCreate = () => {
    if (!name.trim() || isCreating) return;

    setIsCreating(true);
    try {
      onCreateFolder(name.trim(), selectedColor);
      onClose();
    } catch (error) {
      console.error('Failed to create folder:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FolderIcon className="h-5 w-5" />
            {parentFolderName
              ? `Create Subfolder in "${parentFolderName}"`
              : 'Create New Folder'}
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4">
          {parentFolderName && (
            <div className="bg-accent/20 rounded-lg p-3">
              <div className="text-muted-foreground text-sm">
                Creating subfolder in:
              </div>
              <div className="font-medium">{parentFolderName}</div>
            </div>
          )}

          {/* Folder Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Folder Name</label>
            <Input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter folder name..."
              disabled={isCreating}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
            <div className="grid grid-cols-6 gap-2">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  disabled={isCreating}
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

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || isCreating}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <FolderIcon className="mr-2 h-4 w-4" />
                  Create {parentFolderName ? 'Subfolder' : 'Folder'}
                </>
              )}
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
