import React, { useState, useEffect, useRef } from 'react';

import { Check, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

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

  const handleClose = () => {
    if (!isCreating) {
      onClose();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content className="bg-background fixed top-[50%] left-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-hidden rounded-lg border shadow-lg">
          {/* Header */}
          <div className="border-border flex items-center justify-between border-b p-4">
            <div className="space-y-1">
              <Dialog.Title className="text-lg font-semibold">
                Add Folder
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-sm">
                {parentFolderName ? (
                  <>
                    Creating a folder in{' '}
                    <span className="font-bold">{parentFolderName}</span>
                  </>
                ) : (
                  'Create a new folder to organize your notes'
                )}
              </Dialog.Description>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="space-y-4">
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
                      className={`relative h-10 w-10 rounded-lg border-2 ${
                        selectedColor === color
                          ? 'border-foreground scale-105 shadow-lg'
                          : 'border-border hover:border-foreground/50'
                      } disabled:opacity-50`}
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
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleCreate}
                  disabled={!name.trim() || isCreating}
                >
                  {isCreating ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Creating...
                    </>
                  ) : (
                    `Add`
                  )}
                </Button>
              </div>
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
