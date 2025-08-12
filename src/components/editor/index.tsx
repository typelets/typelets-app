import { useState, useEffect, useRef, useCallback } from 'react';
import { Star, Archive, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEditor, EditorContent } from '@tiptap/react';
import { createEditorExtensions } from './config/editor-config.ts';
import { editorStyles } from './config/editor-styles.ts';
import { EmptyState } from '@/components/editor/Editor/EmptyState.tsx';
import { Toolbar } from '@/components/editor/Editor/Toolbar.tsx';
import type { Note, Folder as FolderType } from '@/types/note';

interface NoteEditorProps {
  note: Note | null;
  folders?: FolderType[];
  onUpdateNote: (noteId: string, updates: Partial<Note>) => void;
  onDeleteNote: (noteId: string) => void;
  onArchiveNote: (noteId: string) => void;
  onToggleStar: (noteId: string) => void;
}

export default function Index({
  note,
  folders,
  onUpdateNote,
  onDeleteNote,
  onArchiveNote,
  onToggleStar,
}: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const contentUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');

  const editor = useEditor(
    {
      extensions: createEditorExtensions(),
      content: note?.content || '',
      editorProps: {
        attributes: {
          class:
            'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4',
          style: 'max-width: none;',
        },
      },
    },
    [note?.id]
  );

  useEffect(() => {
    if (!editor || !note) return;

    const handleUpdate = () => {
      const html = editor.getHTML();

      if (html !== lastSavedContentRef.current && html !== note.content) {
        if (contentUpdateTimeoutRef.current) {
          clearTimeout(contentUpdateTimeoutRef.current);
        }

        contentUpdateTimeoutRef.current = setTimeout(() => {
          lastSavedContentRef.current = html;
          onUpdateNote(note.id, { content: html });
        }, 1500);
      }
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      if (contentUpdateTimeoutRef.current) {
        clearTimeout(contentUpdateTimeoutRef.current);
      }
    };
  }, [editor, note, onUpdateNote]);

  useEffect(() => {
    if (!editor) return;

    if (note) {
      setTitle(note.title);

      const currentContent = editor.getHTML();
      if (
        note.content !== currentContent &&
        note.content !== lastSavedContentRef.current
      ) {
        const { from, to } = editor.state.selection;

        editor.commands.setContent(note.content || '', false);

        try {
          const docSize = editor.state.doc.content.size;
          if (from <= docSize && to <= docSize) {
            editor.commands.setTextSelection({ from, to });
          }
        } catch {
          // Silently handle selection errors
        }

        lastSavedContentRef.current = note.content || '';
      }
    } else {
      setTitle('');
      editor.commands.setContent('');
      lastSavedContentRef.current = '';
    }
  }, [note, editor]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);

      if (!note) return;

      if (titleUpdateTimeoutRef.current) {
        clearTimeout(titleUpdateTimeoutRef.current);
      }

      titleUpdateTimeoutRef.current = setTimeout(() => {
        if (newTitle !== note.title) {
          onUpdateNote(note.id, { title: newTitle });
        }
      }, 1500);
    },
    [note, onUpdateNote]
  );

  useEffect(() => {
    return () => {
      if (contentUpdateTimeoutRef.current) {
        clearTimeout(contentUpdateTimeoutRef.current);
      }
      if (titleUpdateTimeoutRef.current) {
        clearTimeout(titleUpdateTimeoutRef.current);
      }
    };
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getCurrentFolder = () => {
    if (!note?.folderId || !folders) return null;
    return folders.find((f) => f.id === note.folderId);
  };

  if (!note) {
    return <EmptyState />;
  }

  const currentFolder = getCurrentFolder();

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="border-border flex-shrink-0 border-b p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex flex-1 items-center gap-3">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              className="text-foreground placeholder-muted-foreground min-w-0 flex-1 border-none bg-transparent text-2xl font-bold outline-none"
              placeholder="Untitled Note"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleStar(note.id)}
              className={
                note.starred ? 'text-yellow-500' : 'text-muted-foreground'
              }
            >
              <Star
                className={`h-4 w-4 ${note.starred ? 'fill-current' : ''}`}
              />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onToggleStar(note.id)}>
                  <Star className="mr-2 h-4 w-4" />
                  {note.starred ? 'Remove from Starred' : 'Add to Starred'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onArchiveNote(note.id)}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive Note
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDeleteNote(note.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Move to Trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="text-muted-foreground flex flex-col gap-1 text-sm">
          <div className="flex items-center gap-4">
            <span className="text-xs opacity-80">
              Created {formatDate(note.createdAt)}
            </span>
            <span className="text-xs opacity-80">•</span>
            <span className="text-xs opacity-80">
              Modified {formatDate(note.updatedAt)}
            </span>
          </div>

          {currentFolder && (
            <div className="flex items-center gap-1 text-xs opacity-80">
              <span>
                <span className="font-semibold">Folder:</span>{' '}
                {currentFolder.name}
              </span>
            </div>
          )}

          {note.tags.length > 0 && (
            <div className="mt-1 flex gap-1">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0">
        <Toolbar editor={editor} />
      </div>

      <div className="min-h-0 flex-1">
        <EditorContent
          editor={editor}
          className="bg-background text-foreground h-full"
        />
      </div>

      <style dangerouslySetInnerHTML={{ __html: editorStyles }} />
    </div>
  );
}
