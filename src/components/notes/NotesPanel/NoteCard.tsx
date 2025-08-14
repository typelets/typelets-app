import { memo, useMemo } from 'react';
import { Star } from 'lucide-react';
import type { Note, Folder as FolderType } from '@/types/note.ts';

interface NoteCardProps {
  note: Note;
  isSelected: boolean;
  onSelect: (note: Note) => void;
  onToggleStar: (noteId: string) => void;
  folders?: FolderType[];
}

function NoteCard({
  note,
  isSelected,
  onSelect,
  onToggleStar,
  folders,
}: NoteCardProps) {
  const formatDateTime = (date: Date) => {
    try {
      const noteDate = new Date(date);
      return `${noteDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })} at ${noteDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })}`;
    } catch {
      return 'Invalid date';
    }
  };

  const previewText = useMemo(() => {
    if (!note?.content) return 'No additional text';

    const temp = document.createElement('div');
    temp.innerHTML = note.content;

    let text = temp.textContent || temp.innerText || '';

    text = text.replace(/\s+/g, ' ').trim();

    const maxLength = 120;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }

    return text || 'No additional text';
  }, [note?.content]);

  const formattedDate = useMemo(() => {
    return note?.updatedAt ? formatDateTime(note.updatedAt) : 'No date';
  }, [note?.updatedAt]);

  const folder = useMemo(() => {
    if (!note?.folderId || !folders || folders.length === 0) return null;
    return folders.find((f) => f.id === note.folderId) || null;
  }, [note?.folderId, folders]);

  if (!note) {
    return null;
  }

  return (
    <div
      className={`group border-border relative cursor-pointer border-b transition-colors last:border-b-0 ${
        isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
      }`}
      onClick={() => onSelect(note)}
    >
      {isSelected && (
        <div className="bg-primary absolute top-0 bottom-0 left-0 w-0.5" />
      )}

      <div className="p-4 pl-5">
        <div className="mb-1 flex items-start justify-between">
          <h3
            className={`pr-2 text-sm leading-5 font-medium ${
              isSelected ? 'text-accent-foreground' : 'text-foreground'
            }`}
          >
            {note.title || 'Untitled'}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(note.id);
            }}
            className={`shrink-0 rounded p-1 transition-opacity ${
              note.starred ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            } hover:bg-muted`}
          >
            <Star
              className={`h-3.5 w-3.5 ${
                note.starred
                  ? 'fill-yellow-500 text-yellow-500'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        </div>

        <p
          className={`mb-3 line-clamp-2 text-xs leading-4 ${
            isSelected ? 'text-accent-foreground/80' : 'text-muted-foreground'
          }`}
        >
          {previewText}
        </p>

        <div className="space-y-1">
          {/* Date and Folder */}
          <div className="flex flex-col gap-1">
            <span
              className={`text-xs ${
                isSelected
                  ? 'text-accent-foreground/70'
                  : 'text-muted-foreground'
              }`}
            >
              {formattedDate}
            </span>

            {folder && (
              <div
                className={`flex items-center gap-1.5 text-xs ${
                  isSelected
                    ? 'text-accent-foreground/60'
                    : 'text-muted-foreground/80'
                }`}
              >
                <div
                  className="h-2 w-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: folder.color || '#6b7280' }}
                />
                <span className="truncate">{folder.name}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex gap-1 pt-1">
              {note.tags.slice(0, 1).map((tag) => (
                <span
                  key={tag}
                  className={`rounded px-1.5 py-0.5 text-xs ${
                    isSelected
                      ? 'bg-background text-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tag}
                </span>
              ))}
              {note.tags.length > 1 && (
                <span
                  className={`text-xs ${
                    isSelected
                      ? 'text-accent-foreground/70'
                      : 'text-muted-foreground'
                  }`}
                >
                  +{note.tags.length - 1}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(NoteCard, (prevProps, nextProps) => {
  return (
    prevProps.note.id === nextProps.note.id &&
    prevProps.note.title === nextProps.note.title &&
    prevProps.note.content === nextProps.note.content &&
    prevProps.note.starred === nextProps.note.starred &&
    prevProps.note.updatedAt === nextProps.note.updatedAt &&
    prevProps.note.folderId === nextProps.note.folderId &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.folders === nextProps.folders
  );
});
