import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Folder } from '@/types/note';
import { FOLDER_COLORS } from '../constants';

interface EditFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: Folder | null;
  onSave: (folderId: string, name: string, color: string) => Promise<void>;
}

export default function EditFolderModal({
  open,
  onOpenChange,
  folder,
  onSave,
}: EditFolderModalProps) {
  const [name, setName] = React.useState('');
  const [selectedColor, setSelectedColor] = React.useState('#6b7280');
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (open && folder) {
      setName(folder.name);
      setSelectedColor(folder.color ?? '#6b7280');
      setIsSaving(false);
    }
  }, [open, folder]);

  const handleSave = async () => {
    if (!folder || !name.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(folder.id, name.trim(), selectedColor);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update folder:', error);
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onOpenChange(false);
    }
  };

  const hasChanges =
    folder &&
    (name !== folder.name || selectedColor !== (folder.color ?? '#6b7280'));

  if (!folder) return null;

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content className="bg-background fixed top-[50%] left-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-hidden rounded-lg border shadow-lg">
          {/* Header */}
          <div className="border-border flex items-center justify-between border-b p-4">
            <div className="space-y-1">
              <Dialog.Title className="text-lg font-semibold">
                Edit Folder
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-sm">
                Update the name and color for{' '}
                <span className="font-bold">{folder.name}</span>
              </Dialog.Description>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4 p-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Folder Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter folder name..."
                  disabled={isSaving}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && hasChanges) {
                      handleSave();
                    }
                  }}
                />
              </div>

              <div className="grid gap-2">
                <Label>Color</Label>
                <div className="grid grid-cols-6 gap-2">
                  {FOLDER_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      disabled={isSaving}
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
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSave}
                disabled={!name.trim() || isSaving || !hasChanges}
              >
                {isSaving ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  'Save'
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
