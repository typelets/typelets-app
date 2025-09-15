import { useState, useCallback, useEffect } from 'react';
import {
  Star,
  Archive,
  Trash2,
  MoreHorizontal,
  FolderInput,
  Paperclip,
  Printer,
  EyeOff,
  Eye,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import ReactDOM from 'react-dom/client';
import type { Root } from 'react-dom/client';
import tippy from 'tippy.js';
import { createEditorExtensions } from './config/editor-config';
import { SlashCommands } from './extensions/SlashCommandsExtension';
import { SlashCommandsList } from './extensions/SlashCommands';
import { editorStyles } from './config/editor-styles';
import { EmptyState } from '@/components/editor/Editor/EmptyState';
import { Toolbar } from '@/components/editor/Editor/Toolbar';
import MoveNoteModal from '@/components/editor/modals/MoveNoteModal';
import FileUpload from '@/components/editor/FileUpload';
import { StatusBar } from '@/components/editor/Editor/StatusBar';
import { useEditorState } from '@/components/editor/hooks/useEditorState';
import { useEditorEffects } from '@/components/editor/hooks/useEditorEffects';
import { fileService } from '@/services/fileService';
import type { Note, Folder as FolderType, FileAttachment } from '@/types/note';
import type { WebSocketStatus } from '@/types/websocket';

// Type definitions for TipTap Suggestion
// Import CommandItem type from SlashCommands
import type { CommandItem } from './extensions/SlashCommands';

interface SuggestionProps {
  editor: Editor;
  range: { from: number; to: number };
  query: string;
  text: string;
  command: (item: CommandItem) => void;
  clientRect?: () => DOMRect | null;
  decorationNode?: Element | null;
  virtualNode?: Element | null;
}

interface SuggestionKeyDownProps {
  event: KeyboardEvent;
}

interface SlashCommandsHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

interface NoteEditorProps {
  note: Note | null;
  folders?: FolderType[];
  onUpdateNote: (noteId: string, updates: Partial<Note>) => void;
  onDeleteNote: (noteId: string) => void;
  onArchiveNote: (noteId: string) => void;
  onToggleStar: (noteId: string) => void;
  onHideNote: (noteId: string) => void;
  onUnhideNote: (noteId: string) => void;
  userId?: string;
  isNotesPanelOpen?: boolean;
  onToggleNotesPanel?: () => void;
  // WebSocket sync status props (optional)
  wsStatus?: WebSocketStatus;
  wsIsAuthenticated?: boolean;
  wsLastSync?: number | null;
  onWsReconnect?: () => void;
  onWsConnect?: () => void;
  onWsDisconnect?: () => void;
}

export default function Index({
  note,
  folders,
  onUpdateNote,
  onDeleteNote,
  onArchiveNote,
  onToggleStar,
  onHideNote,
  onUnhideNote,
  userId = 'current-user',
  isNotesPanelOpen,
  onToggleNotesPanel,
  wsStatus,
  wsIsAuthenticated,
  wsLastSync,
  onWsReconnect,
  onWsConnect,
  onWsDisconnect,
}: NoteEditorProps) {
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  // Use custom hook for editor state management
  const {
    saveStatus,
    setSaveStatus,
    wordCount,
    charCount,
    scrollPercentage,
    setScrollPercentage,
    readingTime,
    zoomLevel,
    baseFontSize,
    setBaseFontSize,
    saveTimeoutRef,
    lastContentRef,
    updateCounts,
    handleZoomIn,
    handleZoomOut,
    resetZoom,
  } = useEditorState();

  const editor = useEditor(
    {
      editable: !note?.hidden,
      extensions: [
        ...createEditorExtensions(),
        SlashCommands.configure({
          suggestion: {
            items: () => {
              return [];
            },
            render: () => {
              let component: SlashCommandsHandle | null = null;
              let popup: ReturnType<typeof tippy>[0] | null = null;
              let root: Root | null = null;

              return {
                onStart: (props: SuggestionProps) => {
                  if (!props.clientRect) {
                    return;
                  }

                  const container = document.createElement('div');
                  
                  popup = tippy('body', {
                    getReferenceClientRect: props.clientRect as () => DOMRect,
                    appendTo: () => document.body,
                    content: container,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                  })[0];

                  root = ReactDOM.createRoot(container);
                  
                  root.render(
                    <SlashCommandsList
                      ref={(ref: SlashCommandsHandle | null) => {
                        component = ref;
                      }}
                      command={props.command}
                    />
                  );
                },

                onUpdate: (props: SuggestionProps) => {
                  popup?.setProps({
                    getReferenceClientRect: props.clientRect as () => DOMRect,
                  });
                },

                onKeyDown: (props: SuggestionKeyDownProps) => {
                  if (props.event.key === 'Escape') {
                    popup?.hide();
                    return true;
                  }
                  
                  return component?.onKeyDown?.(props);
                },

                onExit: () => {
                  if (popup && !popup.state.isDestroyed) {
                    popup.destroy();
                  }
                  popup = null;
                  
                  if (root) {
                    setTimeout(() => {
                      root?.unmount();
                      root = null;
                    }, 0);
                  }
                },
              };
            },
          },
        }),
      ],
      content: note?.hidden ? '[HIDDEN]' : (note?.content || ''),
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
        if (!note || note.hidden) return; // Prevent auto-save for hidden notes
        
        // Update word and character counts
        const text = editor.state.doc.textContent;
        updateCounts(text);
        
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
    [note?.id, note?.hidden, updateCounts]
  );

  // Use custom hook for editor effects
  useEditorEffects({
    editor,
    note,
    updateCounts,
    setScrollPercentage,
    zoomLevel,
    baseFontSize,
    setBaseFontSize,
    lastContentRef,
  });



  // Update editor when note hidden state changes
  useEffect(() => {
    if (editor && note) {
      const currentContent = editor.getHTML();
      
      // Only update if content actually changed
      if (note.hidden && currentContent !== '[HIDDEN]') {
        editor.commands.setContent('[HIDDEN]');
        editor.setEditable(false);
      } else if (!note.hidden && currentContent === '[HIDDEN]') {
        editor.commands.setContent(note.content || '');
        editor.setEditable(true);
      }
    }
  }, [editor, note]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [saveTimeoutRef]);

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
    [note, onUpdateNote, setSaveStatus]
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
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {onToggleNotesPanel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleNotesPanel}
                title={
                  isNotesPanelOpen ? 'Hide notes panel' : 'Show notes panel'
                }
                className="flex-shrink-0"
              >
                {isNotesPanelOpen ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
              </Button>
            )}
            <input
              type="text"
              value={note.title || ''}
              onChange={handleTitleChange}
              className="text-foreground placeholder-muted-foreground min-w-0 flex-1 border-none bg-transparent text-2xl font-bold outline-none"
              placeholder="Untitled Note"
              disabled={note.hidden}
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            
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
              title={note.starred ? 'Remove from starred' : 'Add to starred'}
            >
              <Star
                className={`h-4 w-4 ${note.starred ? 'fill-current' : ''}`}
              />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => note.hidden ? onUnhideNote(note.id) : onHideNote(note.id)}
              className={
                note.hidden ? 'text-primary' : 'text-muted-foreground'
              }
              title={note.hidden ? 'Unhide note' : 'Hide note'}
            >
              {note.hidden ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
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
                  {note.starred ? 'Unstar' : 'Star'}
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

      {!note.hidden && (
        <div className="flex-shrink-0">
          <Toolbar editor={editor} />
        </div>
      )}

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

      <StatusBar
        wordCount={wordCount}
        charCount={charCount}
        readingTime={readingTime}
        scrollPercentage={scrollPercentage}
        zoomLevel={zoomLevel}
        saveStatus={saveStatus}
        noteId={note?.id}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={resetZoom}
        wsStatus={wsStatus}
        wsIsAuthenticated={wsIsAuthenticated}
        wsLastSync={wsLastSync}
        onWsReconnect={onWsReconnect}
        onWsConnect={onWsConnect}
        onWsDisconnect={onWsDisconnect}
      />

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
