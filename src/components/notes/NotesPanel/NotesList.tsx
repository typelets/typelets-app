import { useState } from 'react';

import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import type { Note, Folder } from '@/types/note.ts';

import NoteCard from './NoteCard.tsx';

function NoteCardSkeleton() {
  return (
    <div className="p-4 border-b border-slate-100 dark:border-slate-700">
      <div className="flex items-start gap-3">
        <Skeleton className="h-4 w-4 rounded mt-1" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

interface NotesListProps {
  notes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  onToggleStar: (noteId: string) => void;
  onEmptyTrash?: () => Promise<void>;
  isTrashView?: boolean;
  emptyMessage?: string;
  folders?: Folder[];
  loading?: boolean;
}

export default function NotesList({
  notes,
  selectedNote,
  onSelectNote,
  onToggleStar,
  onEmptyTrash,
  isTrashView = false,
  emptyMessage,
  folders,
  loading = false,
}: NotesListProps) {
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);

  const handleEmptyTrash = async () => {
    if (!onEmptyTrash || isEmptyingTrash) return;

    setIsEmptyingTrash(true);

    try {
      await onEmptyTrash();
    } catch (error) {
      console.error('Failed to empty trash:', error);
    } finally {
      setIsEmptyingTrash(false);
    }
  };

  // Show skeletons while loading
  if (loading) {
    return (
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {[...Array(5)].map((_, i) => (
          <NoteCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
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
                onClick={handleEmptyTrash}
                disabled={isEmptyingTrash}
                className="h-8"
              >
                {isEmptyingTrash ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Emptying...
                  </>
                ) : (
                  'Empty Trash'
                )}
              </Button>
            </div>
          </div>
        )}

        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            isSelected={selectedNote?.id === note.id}
            onSelect={onSelectNote}
            onToggleStar={onToggleStar}
            folders={folders}
          />
        ))}

        {notes.length === 0 && isTrashView && (
          <div className="flex flex-col items-center justify-center p-8 text-center h-64">
            <Trash2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        )}
      </div>
    </>
  );
}
