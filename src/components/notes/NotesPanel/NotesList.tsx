import { useState } from 'react';

import { Trash2, AlertTriangle } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import type { Note } from '@/types/note.ts';

import NoteCard from './NoteCard.tsx';

interface NotesListProps {
  notes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  onToggleStar: (noteId: string) => void;
  onEmptyTrash?: () => Promise<void>;
  isTrashView?: boolean;
  emptyMessage?: string;
}

export default function NotesList({
  notes,
  selectedNote,
  onSelectNote,
  onToggleStar,
  onEmptyTrash,
  isTrashView = false,
  emptyMessage,
}: NotesListProps) {
  const [showEmptyTrashDialog, setShowEmptyTrashDialog] = useState(false);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);

  const handleEmptyTrash = async () => {
    if (!onEmptyTrash) return;

    setIsEmptyingTrash(true);
    try {
      await onEmptyTrash();
      setShowEmptyTrashDialog(false);
    } catch (error) {
      console.error('Failed to empty trash:', error);
    } finally {
      setIsEmptyingTrash(false);
    }
  };

  return (
    <>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {/* Empty Trash Button - Only show when in trash view and there are notes */}
        {isTrashView && notes.length > 0 && onEmptyTrash && (
          <div className="border-border bg-muted/20 border-b p-4">
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Trash2 className="h-4 w-4" />
                <span>
                  {notes.length} item{notes.length !== 1 ? 's' : ''} in trash
                </span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowEmptyTrashDialog(true)}
                className="h-8"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Empty Trash
              </Button>
            </div>
          </div>
        )}

        {/* Notes List */}
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            isSelected={selectedNote?.id === note.id}
            onSelect={onSelectNote}
            onToggleStar={onToggleStar}
          />
        ))}

        {/* Empty State */}
        {notes.length === 0 && emptyMessage && (
          <div className="text-muted-foreground p-8 text-center">
            <Trash2 className="mx-auto mb-4 h-12 w-12 opacity-20" />
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>

      {/* Empty Trash Confirmation Dialog */}
      <AlertDialog
        open={showEmptyTrashDialog}
        onOpenChange={setShowEmptyTrashDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive h-5 w-5" />
              Empty Trash
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete all {notes.length}{' '}
              item{notes.length !== 1 ? 's' : ''} in the trash? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEmptyingTrash}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleEmptyTrash()}
              disabled={isEmptyingTrash}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isEmptyingTrash ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Emptying...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Empty Trash
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
