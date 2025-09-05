import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Star,
  Archive,
  Trash2,
  MoreHorizontal,
  FolderInput,
  Paperclip,
  Printer,
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
import ReactDOM from 'react-dom/client';
import tippy from 'tippy.js';
import { createEditorExtensions } from './config/editor-config';
import { SlashCommands } from './extensions/SlashCommandsExtension';
import { SlashCommandsList } from './extensions/SlashCommands';
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
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>('');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const editor = useEditor(
    {
      extensions: [
        ...createEditorExtensions(),
        SlashCommands.configure({
          suggestion: {
            items: () => {
              return [];
            },
            render: () => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let component: any;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let popup: any;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let root: any;

              return {
                onStart: (props: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                  if (!props.clientRect) {
                    return;
                  }

                  const container = document.createElement('div');
                  
                  popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: container,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                  })[0];

                  root = ReactDOM.createRoot(container);
                  
                  const commandsList = document.createElement('div');
                  component = ReactDOM.createRoot(commandsList);
                  
                  component.render(
                    <SlashCommandsList
                      ref={(ref: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                        component = ref;
                      }}
                      command={props.command}
                    />
                  );
                  
                  root.render(
                    <SlashCommandsList
                      ref={(ref: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                        component = ref;
                      }}
                      command={props.command}
                    />
                  );
                },

                onUpdate: (props: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                  popup?.setProps({
                    getReferenceClientRect: props.clientRect,
                  });
                },

                onKeyDown: (props: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                  if (props.event.key === 'Escape') {
                    popup?.hide();
                    return true;
                  }
                  
                  return component?.onKeyDown?.(props);
                },

                onExit: () => {
                  popup?.destroy();
                  root?.unmount();
                },
              };
            },
          },
        }),
      ],
      content: note?.content || '',
      editorProps: {
        attributes: {
          class:
            'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4',
          style: 'max-width: none;',
        },
        handlePaste: (view, event) => {
          const items = event.clipboardData?.items;
          if (!items) return false;

          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              
              const file = item.getAsFile();
              if (!file) continue;

              // Check file size (max 10MB)
              if (file.size > 10 * 1024 * 1024) {
                alert('Image is too large. Maximum size is 10MB.');
                return true;
              }

              const reader = new FileReader();
              reader.onload = (e) => {
                const result = e.target?.result;
                if (result && typeof result === 'string') {
                  const { schema } = view.state;
                  const node = schema.nodes.image.create({ src: result });
                  const transaction = view.state.tr.replaceSelectionWith(node);
                  view.dispatch(transaction);
                }
              };
              reader.readAsDataURL(file);
              
              return true;
            }
          }

          return false;
        },
        handleDrop: (view, event, _slice, moved) => {
          if (moved) return false;
          
          const files = event.dataTransfer?.files;
          if (!files || files.length === 0) return false;

          for (const file of Array.from(files)) {
            if (file.type.startsWith('image/')) {
              event.preventDefault();

              // Check file size (max 10MB)
              if (file.size > 10 * 1024 * 1024) {
                alert(`File ${file.name} is too large. Maximum size is 10MB.`);
                continue;
              }

              const reader = new FileReader();
              reader.onload = (e) => {
                const result = e.target?.result;
                if (result && typeof result === 'string') {
                  const { schema } = view.state;
                  const coordinates = view.posAtCoords({
                    left: event.clientX,
                    top: event.clientY,
                  });

                  if (coordinates) {
                    const node = schema.nodes.image.create({ src: result });
                    const transaction = view.state.tr.insert(coordinates.pos, node);
                    view.dispatch(transaction);
                  }
                }
              };
              reader.readAsDataURL(file);
              
              return true;
            }
          }

          return false;
        },
      },
      onUpdate: ({ editor }) => {
        if (!note) return;
        
        // Update word and character counts
        const text = editor.state.doc.textContent;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        setWordCount(words);
        setCharCount(chars);
        
        const html = editor.getHTML();
        if (html !== note.content && html !== lastContentRef.current) {
          lastContentRef.current = html;
          setSaveStatus('saving');
          
          // Clear existing timeout
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
          
          // Debounce the save operation
          saveTimeoutRef.current = setTimeout(() => {
            try {
              onUpdateNote(note.id, { content: html });
              setSaveStatus('saved');
            } catch (error) {
              setSaveStatus('error');
              console.error('Failed to save note:', error);
            }
          }, 1000); // Wait 1 second after user stops typing
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
      lastContentRef.current = note.content || '';
      
      // Update word and character counts
      const text = editor.state.doc.textContent;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const chars = text.length;
      setWordCount(words);
      setCharCount(chars);
      
      try {
        const docSize = editor.state.doc.content.size;
        if (from <= docSize && to <= docSize) {
          editor.commands.setTextSelection({ from, to });
        }
      } catch {
        // Ignore cursor restoration errors
      }
    }
  }, [note, editor]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!note) return;
      const newTitle = e.target.value;
      setSaveStatus('saving');
      try {
        onUpdateNote(note.id, { title: newTitle });
        setTimeout(() => {
          setSaveStatus('saved');
        }, 500);
      } catch (error) {
        setSaveStatus('error');
        console.error('Failed to save title:', error);
      }
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

  const handlePrint = useCallback(() => {
    if (!note) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${note.title || 'Untitled Note'}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              color: #333;
            }
            h1 { color: #2d3748; margin-bottom: 0.5rem; }
            h2 { color: #4a5568; }
            h3 { color: #718096; }
            pre { background: #f7fafc; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
            code { background: #edf2f7; padding: 0.2rem 0.4rem; border-radius: 0.25rem; }
            blockquote { border-left: 4px solid #e2e8f0; margin: 1rem 0; padding-left: 1rem; color: #4a5568; }
            ul, ol { margin: 1rem 0; }
            @media print {
              body { margin: 0; padding: 1cm; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${note.title || 'Untitled Note'}</h1>
          ${note.content}
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }, [note]);


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
    <>
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
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
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

      {/* Status Bar - VSCode Style */}
      <div className="border-t bg-primary/5 dark:bg-primary/10 px-3 py-0.5 flex items-center justify-between text-[11px] font-mono">
        {/* Left side - Word and character count */}
        <div className="flex items-center gap-3">
          {(wordCount > 0 || charCount > 0) && (
            <>
              <span className="hover:bg-muted px-1.5 py-0.5 rounded cursor-default">
                {wordCount} {wordCount === 1 ? 'word' : 'words'}
              </span>
              <span className="hover:bg-muted px-1.5 py-0.5 rounded cursor-default">
                {charCount} {charCount === 1 ? 'character' : 'characters'}
              </span>
            </>
          )}
        </div>
        
        {/* Right side - Save status */}
        <div className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-muted rounded cursor-default" title={
          saveStatus === 'saving' ? 'Saving changes...' : 
          saveStatus === 'saved' ? 'All changes saved' : 
          'Error saving changes'
        }>
          {saveStatus === 'saving' && (
            <>
              <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span>Saving</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span>Saved</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span className="text-red-500">Error</span>
              </>
            )}
          </div>
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
    </>
  );
}
