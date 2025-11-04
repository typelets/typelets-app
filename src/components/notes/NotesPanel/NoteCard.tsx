import { memo, useMemo } from 'react';
import { Star, Paperclip, Codesandbox, Network, Code2 } from 'lucide-react';
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

  const formattedDate = useMemo(() => {
    return note?.createdAt ? formatDateTime(note.createdAt) : 'No date';
  }, [note?.createdAt]);

  const previewText = useMemo(() => {
    if (note?.hidden) return '[HIDDEN]';

    if (!note?.content) return 'No additional text';

    // Safely extract text content from HTML while preserving readable spacing
    let text;
    if (note.content.includes('<')) {
      // Parse HTML safely using DOMParser (doesn't execute scripts)
      const parser = new DOMParser();
      const doc = parser.parseFromString(note.content, 'text/html');

      // Add spacing for block elements to preserve readability
      const blockElements = doc.querySelectorAll(
        'p, div, br, h1, h2, h3, h4, h5, h6, li, blockquote'
      );
      blockElements.forEach((el) => {
        if (el.tagName === 'BR') {
          el.replaceWith(' ');
        } else {
          // Add space after block elements
          el.insertAdjacentText('afterend', ' ');
        }
      });

      text = doc.body.textContent || doc.body.innerText || '';
    } else {
      // Plain text content
      text = note.content;
    }

    text = text.replace(/\s+/g, ' ').trim();

    const maxLength = 120;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }

    return text || 'No additional text';
  }, [note?.content, note?.hidden]);

  const folder = useMemo(() => {
    // First check if note has embedded folder data
    if (note?.folder) {
      return note.folder;
    }

    // Fallback to looking up in folders array
    if (!note?.folderId || !folders || folders.length === 0) return null;
    return folders.find((f) => f.id === note.folderId) || null;
  }, [note?.folder, note?.folderId, folders]);

  const hasExecutableCode = useMemo(() => {
    if (!note?.content) return false;

    // Check for executable code block markers
    return (
      note.content.includes('data-executable="true"') ||
      note.content.includes('class="executable-code-block"') ||
      note.content.includes('executableCodeBlock')
    );
  }, [note?.content]);

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

      <div className="p-2.5 pl-3.5">
        <div className="mb-1 flex items-start justify-between">
          <h3
            className={`pr-2 text-sm leading-5 font-medium ${
              isSelected ? 'text-accent-foreground' : 'text-foreground'
            }`}
          >
            {note.title || 'Untitled'}
          </h3>
          <div className="flex items-center gap-1">
            {note.isNew && (
              <span className="mr-1 rounded-full bg-orange-500 px-1 py-0 text-[9px] font-semibold text-white">
                NEW
              </span>
            )}
            {note.type === 'diagram' && (
              <div
                className="flex items-center text-xs"
                title="Diagram"
              >
                <Network className="h-3.5 w-3.5 text-cyan-500" />
              </div>
            )}
            {note.type === 'code' && (
              <div
                className="flex items-center text-xs"
                title="Code"
              >
                <Code2 className="h-3.5 w-3.5 text-green-500" />
              </div>
            )}
            {hasExecutableCode && (
              <div
                className="flex items-center text-xs"
                title="Contains executable code"
              >
                <Codesandbox className="h-3.5 w-3.5 text-purple-500" />
              </div>
            )}
            {((note.attachmentCount && note.attachmentCount > 0) ||
              (note.attachments && note.attachments.length > 0)) && (
              <div className="flex items-center gap-1 text-xs text-blue-500">
                <Paperclip className="h-3.5 w-3.5" />
                <span>
                  {note.attachmentCount ?? note.attachments?.length ?? 0}
                </span>
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar(note.id);
              }}
              className="hover:bg-muted shrink-0 rounded"
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

export default memo(NoteCard);
