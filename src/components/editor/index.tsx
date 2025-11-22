import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
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
import { NoteLinkSuggestion } from './extensions/NoteLinkSuggestion';
import { NoteLinkSuggestionList } from './extensions/NoteLinkSuggestionList';
import {
  notesToSuggestionItems,
  type NoteLinkItem,
} from './extensions/noteLinkUtils';
import { editorStyles } from './config/editor-styles';
import { EmptyState } from '@/components/editor/Editor/EmptyState';
import { Toolbar } from '@/components/editor/Editor/Toolbar';
import MoveNoteModal from '@/components/editor/modals/MoveNoteModal';
import FileUpload from '@/components/editor/FileUpload';
import { StatusBar } from '@/components/editor/Editor/StatusBar';
import { useEditorState } from '@/components/editor/hooks/useEditorState';
import { useEditorEffects } from '@/components/editor/hooks/useEditorEffects';
import { useBacklinks, useOutgoingLinks } from '@/components/editor/hooks/useBacklinks';
import { BacklinksPanel } from '@/components/editor/Editor/BacklinksPanel';
import { fileService } from '@/services/fileService';
import DiagramEditor from '@/components/diagrams/DiagramEditor';
import CodeEditor from '@/components/code/CodeEditor';
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

interface NoteLinkSuggestionProps {
  editor: Editor;
  range: { from: number; to: number };
  query: string;
  text: string;
  command: (item: NoteLinkItem) => void;
  clientRect?: (() => DOMRect | null) | null;
}

interface NoteLinkSuggestionHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

interface NoteEditorProps {
  note: Note | null;
  notes?: Note[]; // All notes for note linking feature
  folders?: FolderType[];
  onUpdateNote: (noteId: string, updates: Partial<Note>) => void;
  onDeleteNote: (noteId: string) => void;
  onArchiveNote: (noteId: string) => void;
  onToggleStar: (noteId: string) => void;
  starringStar?: boolean;
  onHideNote: (noteId: string) => void;
  hidingNote?: boolean;
  onUnhideNote: (noteId: string) => void;
  onRefreshNote?: (noteId: string) => void;
  onSelectNote?: (note: Note) => void; // Navigate to a linked note
  userId?: string;
  isNotesPanelOpen?: boolean;
  onToggleNotesPanel?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
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
  notes = [],
  folders,
  onUpdateNote,
  onDeleteNote,
  onArchiveNote,
  onToggleStar,
  starringStar = false,
  onHideNote,
  hidingNote = false,
  onUnhideNote,
  onRefreshNote,
  onSelectNote,
  userId = 'current-user',
  isNotesPanelOpen,
  onToggleNotesPanel,
  onDirtyChange,
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
  const [localTitle, setLocalTitle] = useState(note?.title || '');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const titleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditingTitleRef = useRef(false);

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

  // Handle note link click - navigate to the linked note
  const handleNoteLinkClick = useCallback(
    (noteId: string) => {
      const linkedNote = notes.find((n) => n.id === noteId);
      if (linkedNote && onSelectNote) {
        onSelectNote(linkedNote);
      }
    },
    [notes, onSelectNote]
  );

  // Memoize note suggestion items
  const noteLinkItems = useMemo(
    () => notesToSuggestionItems(notes, note?.id),
    [notes, note?.id]
  );

  // Backlinks and outgoing links
  const backlinks = useBacklinks(note?.id, notes);
  const outgoingLinks = useOutgoingLinks(note, notes);

  const editor = useEditor(
    {
      editable: !note?.hidden,
      extensions: [
        ...createEditorExtensions({ onNoteLinkClick: handleNoteLinkClick }),
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
        NoteLinkSuggestion.configure({
          suggestion: {
            items: ({ query }: { query: string }) => {
              // Filter notes based on query
              if (!query) {
                return noteLinkItems.slice(0, 10);
              }
              const lowerQuery = query.toLowerCase();
              return noteLinkItems
                .filter((item) =>
                  item.noteTitle.toLowerCase().includes(lowerQuery)
                )
                .slice(0, 10);
            },
            render: () => {
              let component: NoteLinkSuggestionHandle | null = null;
              let popup: ReturnType<typeof tippy>[0] | null = null;
              let root: Root | null = null;
              let currentQuery = '';

              return {
                onStart: (props: NoteLinkSuggestionProps) => {
                  if (!props.clientRect) {
                    return;
                  }

                  currentQuery = props.query;
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
                    <NoteLinkSuggestionList
                      ref={(ref: NoteLinkSuggestionHandle | null) => {
                        component = ref;
                      }}
                      items={noteLinkItems}
                      query={currentQuery}
                      command={props.command}
                    />
                  );
                },

                onUpdate: (props: NoteLinkSuggestionProps) => {
                  currentQuery = props.query;
                  popup?.setProps({
                    getReferenceClientRect: props.clientRect as () => DOMRect,
                  });

                  // Re-render with updated query
                  root?.render(
                    <NoteLinkSuggestionList
                      ref={(ref: NoteLinkSuggestionHandle | null) => {
                        component = ref;
                      }}
                      items={noteLinkItems}
                      query={currentQuery}
                      command={props.command}
                    />
                  );
                },

                onKeyDown: (props: SuggestionKeyDownProps) => {
                  if (props.event.key === 'Escape') {
                    popup?.hide();
                    return true;
                  }

                  return component?.onKeyDown?.(props) ?? false;
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
      content: note?.hidden ? '[HIDDEN]' : note?.content || '',
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
                  view.dispatch(view.state.tr.replaceSelectionWith(node));
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
                    view.dispatch(view.state.tr.insert(coordinates.pos, node));
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
          }, 300); // Reduced from 1000ms to 300ms for faster sync
        }
      },
    },
    [note?.id]
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (titleTimeoutRef.current) {
        clearTimeout(titleTimeoutRef.current);
      }
    };
  }, [saveTimeoutRef]);

  // Sync local title when note changes, but not when actively editing
  useEffect(() => {
    if (!isEditingTitleRef.current) {
      setLocalTitle(note?.title || '');
    }
    // Reset editing state when switching notes
    if (note?.id) {
      isEditingTitleRef.current = false;
    }
  }, [note?.id, note?.title]);

  // Track dirty state and notify parent
  useEffect(() => {
    if (!note || !editor) {
      onDirtyChange?.(false);
      return;
    }

    const currentContent = editor.getHTML();
    const isDirty =
      currentContent !== note.content ||
      localTitle !== note.title;

    onDirtyChange?.(isDirty);
  }, [note, editor, localTitle, onDirtyChange]);

  const saveTitleToServer = useCallback(
    (title: string) => {
      if (!note || title === note.title) return;

      setSaveStatus('saving');
      try {
        onUpdateNote(note.id, { title });
        setTimeout(() => {
          setSaveStatus('saved');
          isEditingTitleRef.current = false; // Mark editing as complete
        }, 500);
      } catch (error) {
        setSaveStatus('error');
        console.error('Failed to save title:', error);
        isEditingTitleRef.current = false; // Mark editing as complete even on error
      }
    },
    [note, onUpdateNote, setSaveStatus]
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setLocalTitle(newTitle);
      isEditingTitleRef.current = true; // Mark as actively editing

      // Clear existing timeout
      if (titleTimeoutRef.current) {
        clearTimeout(titleTimeoutRef.current);
      }

      // Debounce the save operation
      titleTimeoutRef.current = setTimeout(() => {
        saveTitleToServer(newTitle);
      }, 1000); // Save after 1 second of no typing
    },
    [saveTitleToServer]
  );

  const handleTitleBlur = useCallback(() => {
    // Clear timeout and save immediately on blur
    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current);
      titleTimeoutRef.current = null;
    }
    saveTitleToServer(localTitle);
  }, [localTitle, saveTitleToServer]);

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
        const errorMessage =
          error instanceof Error ? error.message : 'Upload failed';
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

      setDeletingIds((prev) => [...prev, attachmentId]);

      try {
        await fileService.removeFile(attachmentId);

        const updatedAttachments = (note.attachments || []).filter(
          (attachment) => attachment.id !== attachmentId
        );
        onUpdateNote(note.id, { attachments: updatedAttachments });
      } catch (error) {
        console.error('File removal failed:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to remove file';
        alert(errorMessage);
      } finally {
        setDeletingIds((prev) => prev.filter((id) => id !== attachmentId));
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

    // Safely create print document to prevent XSS
    const printDoc = printWindow.document;
    printDoc.open();

    // Build the HTML structure safely
    printDoc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title></title>
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
        </body>
      </html>
    `);

    // Safely set title and content using DOM methods
    printDoc.title = note.title || 'Untitled Note';
    const h1 = printDoc.createElement('h1');
    h1.textContent = note.title || 'Untitled Note';
    printDoc.body.appendChild(h1);

    // Safely add content by parsing HTML and sanitizing
    const contentDiv = printDoc.createElement('div');
    if (note.content) {
      // Parse the HTML content safely
      const parser = new DOMParser();
      const parsedContent = parser.parseFromString(note.content, 'text/html');
      // Import the parsed content nodes into the print document
      Array.from(parsedContent.body.childNodes).forEach((node) => {
        const importedNode = printDoc.importNode(node, true);
        contentDiv.appendChild(importedNode);
      });
    }
    printDoc.body.appendChild(contentDiv);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }, [note]);

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dateObj);
    } catch {
      return 'Invalid date';
    }
  };

  const getCurrentFolder = () => {
    if (!note?.folderId || !folders) return null;
    return folders.find((f) => f.id === note.folderId);
  };

  if (!note) {
    return <EmptyState />;
  }

  // Show diagram editor if this is a diagram note
  if (note.type === 'diagram') {
    const handleUpdateDiagram = async (code: string, title: string) => {
      // Only update if content or title actually changed
      if (code !== note.content || title !== note.title) {
        await onUpdateNote(note.id, { content: code, title });
      }
    };

    const handleMoveNoteDiagram = (noteId: string, updates: { folderId: string | null }) => {
      onUpdateNote(noteId, updates);
    };

    return (
      <DiagramEditor
        noteId={note.id}
        initialCode={note.content}
        initialTitle={note.title}
        createdAt={note.createdAt}
        updatedAt={note.updatedAt}
        starred={note.starred}
        hidden={note.hidden}
        folders={folders}
        folderId={note.folderId}
        onSave={handleUpdateDiagram}
        onToggleStar={onToggleStar}
        starringStar={starringStar}
        onHideNote={onHideNote}
        onUnhideNote={onUnhideNote}
        hidingNote={hidingNote}
        onRefreshNote={onRefreshNote}
        onArchiveNote={onArchiveNote}
        onDeleteNote={onDeleteNote}
        onMoveNote={handleMoveNoteDiagram}
        onToggleNotesPanel={onToggleNotesPanel}
        isNotesPanelOpen={isNotesPanelOpen}
        onDirtyChange={onDirtyChange}
      />
    );
  }

  // Show code editor if this is a code note
  if (note.type === 'code') {
    // Parse the JSON content to extract language, code, and lastExecution
    let parsedContent: {
      language: string;
      code: string;
      lastExecution?: {
        output: string;
        error?: string;
        executionTime: number;
        status?: { id: number; description: string };
        timestamp?: string;
      } | null;
    } = { language: 'javascript', code: '', lastExecution: null };

    try {
      const parsed = JSON.parse(note.content);

      // Validate the structure of the parsed content
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid code note structure: content is not an object');
      }

      if (!('code' in parsed)) {
        throw new Error('Invalid code note structure: missing "code" field');
      }

      // Set parsed content with defaults for missing fields
      parsedContent = {
        language: typeof parsed.language === 'string' ? parsed.language : 'javascript',
        code: typeof parsed.code === 'string' ? parsed.code : '',
        lastExecution: parsed.lastExecution || null,
      };
    } catch (error) {
      // Log the error for debugging
      console.error('Failed to parse code note content:', error, 'Note ID:', note.id);

      // If parsing fails, show an error state
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
          <div className="text-destructive flex flex-col items-center gap-2">
            <div className="text-4xl">⚠️</div>
            <h3 className="text-lg font-semibold">Failed to Load Code Note</h3>
            <p className="text-muted-foreground text-center text-sm">
              This code note appears to be corrupted or in an invalid format.
            </p>
            <p className="text-muted-foreground text-center text-xs">
              Note ID: {note.id}
            </p>
          </div>
          <div className="flex gap-2">
            {onRefreshNote && (
              <Button
                onClick={() => onRefreshNote(note.id)}
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            )}
            <Button
              onClick={() => {
                // Copy error details to clipboard for debugging
                navigator.clipboard.writeText(
                  `Note ID: ${note.id}\nError: ${error}\nContent: ${note.content.substring(0, 200)}`
                );
              }}
              variant="outline"
            >
              Copy Debug Info
            </Button>
          </div>
        </div>
      );
    }

    const handleUpdateCode = async (
      code: string,
      title: string,
      language: string,
      lastExecution?: {
        output: string;
        error?: string;
        executionTime: number;
        status?: { id: number; description: string };
        timestamp?: string;
      } | null
    ) => {
      const newContent = JSON.stringify({ language, code, lastExecution });
      // Only update if content or title actually changed
      if (newContent !== note.content || title !== note.title) {
        await onUpdateNote(note.id, { content: newContent, title });
      }
    };

    const handleMoveNoteCode = (noteId: string, updates: { folderId: string | null }) => {
      onUpdateNote(noteId, updates);
    };

    return (
      <CodeEditor
        noteId={note.id}
        initialCode={parsedContent.code}
        initialLanguage={parsedContent.language}
        initialTitle={note.title}
        initialLastExecution={parsedContent.lastExecution}
        createdAt={note.createdAt}
        updatedAt={note.updatedAt}
        starred={note.starred}
        hidden={note.hidden}
        folders={folders}
        folderId={note.folderId}
        onSave={handleUpdateCode}
        onToggleStar={onToggleStar}
        starringStar={starringStar}
        onHideNote={onHideNote}
        onUnhideNote={onUnhideNote}
        hidingNote={hidingNote}
        onRefreshNote={onRefreshNote}
        onArchiveNote={onArchiveNote}
        onDeleteNote={onDeleteNote}
        onMoveNote={handleMoveNoteCode}
        onToggleNotesPanel={onToggleNotesPanel}
        isNotesPanelOpen={isNotesPanelOpen}
        onDirtyChange={onDirtyChange}
      />
    );
  }

  const currentFolder = getCurrentFolder();

  return (
    <>
      <div className="flex h-full flex-1 flex-col">
        <div className="border-border flex-shrink-0 border-b p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
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
                  {isNotesPanelOpen ? (
                    <PanelRightOpen className="h-4 w-4" />
                  ) : (
                    <PanelRightClose className="h-4 w-4" />
                  )}
                </Button>
              )}
              <input
                type="text"
                value={localTitle}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                className="text-foreground placeholder-muted-foreground min-w-0 flex-1 border-none bg-transparent text-2xl font-bold outline-none"
                placeholder="Untitled Note"
                disabled={note.hidden}
              />
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <div className="relative mr-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAttachments(!showAttachments)}
                  className={`shadow-none ${
                    showAttachments
                      ? 'bg-accent text-accent-foreground'
                      : note.attachments && note.attachments.length > 0
                        ? 'text-primary'
                        : 'text-muted-foreground'
                  }`}
                  title={
                    showAttachments ? 'Hide attachments' : 'Show attachments'
                  }
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium">
                  {(note.attachments?.length || 0) > 9
                    ? '9+'
                    : note.attachments?.length || 0}
                </span>
              </div>

              <ButtonGroup>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleStar(note.id)}
                  className={
                    note.starred ? 'text-yellow-500' : 'text-muted-foreground'
                  }
                  title={note.starred ? 'Remove from starred' : 'Add to starred'}
                  disabled={starringStar}
                >
                  {starringStar ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Star
                      className={`h-4 w-4 ${note.starred ? 'fill-current' : ''}`}
                    />
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    note.hidden ? onUnhideNote(note.id) : onHideNote(note.id)
                  }
                  className={
                    note.hidden ? 'text-primary' : 'text-muted-foreground'
                  }
                  title={note.hidden ? 'Unhide note' : 'Hide note'}
                  disabled={hidingNote}
                >
                  {hidingNote ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : note.hidden ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>

                {onRefreshNote && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setIsRefreshing(true);
                      try {
                        await onRefreshNote(note.id);
                      } finally {
                        setIsRefreshing(false);
                      }
                    }}
                    className="text-muted-foreground"
                    title="Refresh note from server"
                    disabled={isRefreshing}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                    />
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
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
              </ButtonGroup>
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
            <div className="bg-border h-px" />
          </>
        )}

        <div className="min-h-0 flex-1">
          <EditorContent
            editor={editor}
            className="bg-background text-foreground h-full"
          />
        </div>

        {/* Backlinks Panel */}
        <BacklinksPanel
          backlinks={backlinks}
          outgoingLinks={outgoingLinks}
          onNavigateToNote={handleNoteLinkClick}
        />

        <StatusBar
          wordCount={wordCount}
          charCount={charCount}
          readingTime={readingTime}
          scrollPercentage={scrollPercentage}
          zoomLevel={zoomLevel}
          saveStatus={saveStatus}
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
