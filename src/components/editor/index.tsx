import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Star,
  Archive,
  Trash2,
  MoreHorizontal,
  FolderInput,
  Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEditor, EditorContent } from '@tiptap/react';
import { createEditorExtensions } from './config/editor-config';
import { editorStyles } from './config/editor-styles';
import { EmptyState } from '@/components/editor/Editor/EmptyState';
import { Toolbar } from '@/components/editor/Editor/Toolbar';
import MoveNoteModal from '@/components/editor/modals/MoveNoteModal';
import FileUpload from '@/components/editor/FileUpload';
import { fileService } from '@/services/fileService';
import type { Note, Folder as FolderType, FileAttachment } from '@/types/note';

interface NoteEditorProps {
  note: Note | null;
  folders?: FolderType[];
  onUpdateNote: (noteId: string, updates: Partial<Note>) => void;
  onDeleteNote: (noteId: string) => void;
  onArchiveNote: (noteId: string) => void;
  onToggleStar: (noteId: string) => void;
  userId?: string;
}

export default function Index({
  note,
  folders,
  onUpdateNote,
  onDeleteNote,
  onArchiveNote,
  onToggleStar,
  userId = 'current-user',
}: NoteEditorProps) {
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

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
      onUpdate: ({ editor }) => {
        if (!note) return;
        const html = editor.getHTML();
        if (html !== note.content) {
          onUpdateNote(note.id, { content: html });
        }
      },
    },
    [note?.id]
  );

  useEffect(() => {
    if (!editor || !note) return;
    
    const currentContent = editor.getHTML();
    if (note.content !== currentContent) {
      const { from, to } = editor.state.selection;
      editor.commands.setContent(note.content || '', false);
      
      try {
        const docSize = editor.state.doc.content.size;
        if (from <= docSize && to <= docSize) {
          editor.commands.setTextSelection({ from, to });
        }
      } catch {
      }
    }
  }, [note?.content, editor]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!note) return;
      const newTitle = e.target.value;
      onUpdateNote(note.id, { title: newTitle });
    },
    [note, onUpdateNote]
  );

  const handleMoveNote = useCallback(
    (targetFolderId: string | null) => {
      if (note) {
        onUpdateNote(note.id, { folderId: targetFolderId });
        setIsMoveModalOpen(false);
      }
    },
    [note, onUpdateNote]
  );

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      if (!note) return;

      setIsUploading(true);
      setUploadProgress(0);

      try {
        const attachments = await fileService.uploadFiles(
          note.id,
          files,
          userId,
          (progress) => setUploadProgress(progress.percentage)
        );

        const currentAttachments = note.attachments || [];
        const updatedAttachments = [...currentAttachments, ...attachments];
        onUpdateNote(note.id, { attachments: updatedAttachments });
      } catch (error) {
        console.error('File upload failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        alert(errorMessage);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [note, userId, onUpdateNote]
  );

  const handleFileRemove = useCallback(
    async (attachmentId: string) => {
      if (!note) return;

      setDeletingIds(prev => [...prev, attachmentId]);

      try {
        await fileService.removeFile(attachmentId);

        const updatedAttachments = (note.attachments || []).filter(
          (attachment) => attachment.id !== attachmentId
        );
        onUpdateNote(note.id, { attachments: updatedAttachments });
      } catch (error) {
        console.error('File removal failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to remove file';
        alert(errorMessage);
      } finally {
        setDeletingIds(prev => prev.filter(id => id !== attachmentId));
      }
    },
    [note, onUpdateNote]
  );

  const handleFileDownload = useCallback(
    async (attachment: FileAttachment) => {
      try {
        const blob = await fileService.downloadFile(attachment, userId);
        fileService.downloadBlob(blob, attachment.originalName);
      } catch (error) {
        console.error('File download failed:', error);
      }
    },
    [userId]
  );


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
              value={note.title || ''}
              onChange={handleTitleChange}
              className="text-foreground placeholder-muted-foreground min-w-0 flex-1 border-none bg-transparent text-2xl font-bold outline-none"
              placeholder="Untitled Note"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAttachments(!showAttachments)}
                className={
                  showAttachments
                    ? 'bg-accent text-accent-foreground'
                    : note.attachments && note.attachments.length > 0
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }
                title={showAttachments ? 'Hide attachments' : 'Show attachments'}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {(note.attachments?.length || 0) > 9 ? '9+' : (note.attachments?.length || 0)}
              </span>
            </div>
            
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
                  {note.starred ? 'Remove from Starred' : 'Star'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsMoveModalOpen(true)}>
                  <FolderInput className="mr-2 h-4 w-4" />
                  Move
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onArchiveNote(note.id)}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDeleteNote(note.id)}
                  className="text"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Trash
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

      {showAttachments && (
        <>
          <div className="flex-shrink-0 p-4">
            <FileUpload
              attachments={note.attachments}
              onUpload={handleFileUpload}
              onRemove={handleFileRemove}
              onDownload={handleFileDownload}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              deletingIds={deletingIds}
            />
          </div>
          <div className="h-px bg-border" />
        </>
      )}

      <div className="min-h-0 flex-1">
        <EditorContent
          editor={editor}
          className="bg-background text-foreground h-full"
        />
      </div>

      <style dangerouslySetInnerHTML={{ __html: editorStyles }} />

      {note && (
        <MoveNoteModal
          isOpen={isMoveModalOpen}
          onClose={() => setIsMoveModalOpen(false)}
          onMove={handleMoveNote}
          folders={folders || []}
          currentFolderId={note.folderId}
          noteTitle={note.title}
        />
      )}
    </div>
  );
}
