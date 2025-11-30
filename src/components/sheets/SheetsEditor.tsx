import { useEffect, useRef, useState } from 'react';
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import { useTheme } from '@/components/ui/theme-provider';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  PanelRightClose,
  PanelRightOpen,
  MoreHorizontal,
  Star,
  Eye,
  EyeOff,
  RefreshCw,
  FolderInput,
  Archive,
  Trash2,
  Globe,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MoveNoteModal from '@/components/editor/modals/MoveNoteModal';
import PublishNoteModal from '@/components/editor/modals/PublishNoteModal';
import type { Folder as FolderType, Note } from '@/types/note';

import '@univerjs/preset-sheets-core/lib/index.css';

interface SheetsEditorProps {
  noteId: string;
  initialData: string;
  initialTitle?: string;
  createdAt?: Date;
  updatedAt?: Date;
  starred?: boolean;
  hidden?: boolean;
  isPublished?: boolean;
  publicSlug?: string | null;
  folders?: FolderType[];
  folderId?: string | null;
  onSave: (data: string, title: string) => void | Promise<void>;
  onToggleStar?: (noteId: string) => void;
  starringStar?: boolean;
  onHideNote?: (noteId: string) => void;
  onUnhideNote?: (noteId: string) => void;
  hidingNote?: boolean;
  onRefreshNote?: (noteId: string) => void;
  onArchiveNote?: (noteId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onMoveNote?: (noteId: string, updates: { folderId: string | null }) => void;
  onPublishNote?: (noteId: string, authorName?: string) => Promise<unknown>;
  onUnpublishNote?: (noteId: string) => Promise<boolean>;
  onToggleNotesPanel?: () => void;
  isNotesPanelOpen?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  isReadOnly?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WorkbookData = any;

const DEFAULT_WORKBOOK_DATA: WorkbookData = {
  id: 'workbook-1',
  name: 'Untitled Spreadsheet',
  sheetOrder: ['sheet-1'],
  sheets: {
    'sheet-1': {
      id: 'sheet-1',
      name: 'Sheet1',
      rowCount: 100,
      columnCount: 26,
    },
  },
};

function parseWorkbookData(data: string): WorkbookData {
  if (!data) return DEFAULT_WORKBOOK_DATA;
  try {
    const parsed = JSON.parse(data);
    return parsed as WorkbookData;
  } catch {
    return DEFAULT_WORKBOOK_DATA;
  }
}

function formatDate(date: Date): string {
  const now = new Date();
  const noteDate = new Date(date);
  const diffMs = now.getTime() - noteDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return noteDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: noteDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// Store instances globally to survive React strict mode
const univerInstances = new Map<string, ReturnType<typeof createUniver>>();

export function SheetsEditor({
  noteId,
  initialData,
  initialTitle = 'Untitled Spreadsheet',
  createdAt,
  updatedAt,
  starred = false,
  hidden = false,
  isPublished = false,
  publicSlug,
  folders,
  folderId,
  onSave,
  onToggleStar,
  starringStar = false,
  onHideNote,
  onUnhideNote,
  hidingNote = false,
  onRefreshNote,
  onArchiveNote,
  onDeleteNote,
  onMoveNote,
  onPublishNote,
  onUnpublishNote,
  onToggleNotesPanel,
  isNotesPanelOpen,
  onDirtyChange,
  isReadOnly = false,
}: SheetsEditorProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedDataRef = useRef<string>(initialData);
  const lastSavedTitleRef = useRef<string>(initialTitle);
  const onSaveRef = useRef(onSave);
  const [title, setTitle] = useState(initialTitle);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const disposableRef = useRef<{ dispose: () => void } | null>(null);

  // Keep refs updated
  onSaveRef.current = onSave;

  // Update title when initialTitle changes (e.g., switching notes)
  useEffect(() => {
    setTitle(initialTitle);
    lastSavedTitleRef.current = initialTitle;
  }, [noteId, initialTitle]);

  // Track dirty state
  useEffect(() => {
    const isDirty = title !== lastSavedTitleRef.current;
    onDirtyChange?.(isDirty);
  }, [title, onDirtyChange]);

  // Toggle dark mode when theme changes
  useEffect(() => {
    const instance = univerInstances.get(noteId);
    if (instance) {
      instance.univerAPI.toggleDarkMode(isDarkMode);
    }
  }, [isDarkMode, noteId]);

  // Handle title changes with autosave
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSaveStatus('unsaved');

    // Debounced save for title changes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      const instance = univerInstances.get(noteId);
      if (instance) {
        try {
          const workbook = instance.univerAPI.getActiveWorkbook();
          if (workbook) {
            const snapshot = workbook.save();
            const dataString = JSON.stringify(snapshot);
            setSaveStatus('saving');
            await onSaveRef.current(dataString, newTitle);
            lastSavedDataRef.current = dataString;
            lastSavedTitleRef.current = newTitle;
            setSaveStatus('saved');
          }
        } catch (error) {
          console.error('Failed to save:', error);
          setSaveStatus('unsaved');
        }
      }
    }, 1000);
  };

  const handleMoveNote = (newFolderId: string | null) => {
    if (onMoveNote) {
      onMoveNote(noteId, { folderId: newFolderId });
    }
    setIsMoveModalOpen(false);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check if we already have an instance for this noteId
    let univerInstance = univerInstances.get(noteId);

    if (!univerInstance) {
      // Clear container
      container.innerHTML = '';

      const workbookData = parseWorkbookData(initialData);

      // Create Univer instance using presets with dark mode support
      univerInstance = createUniver({
        locale: LocaleType.EN_US,
        locales: {
          [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS),
        },
        darkMode: isDarkMode,
        presets: [
          UniverSheetsCorePreset({
            container,
          }),
        ],
      });

      const { univerAPI } = univerInstance;

      // Create workbook with initial data
      univerAPI.createWorkbook(workbookData);

      // Store instance
      univerInstances.set(noteId, univerInstance);

      // Save function
      const doSave = async () => {
        const instance = univerInstances.get(noteId);
        if (!instance) return;
        try {
          const workbook = instance.univerAPI.getActiveWorkbook();
          if (!workbook) return;

          const snapshot = workbook.save();
          const dataString = JSON.stringify(snapshot);

          if (dataString !== lastSavedDataRef.current) {
            setSaveStatus('saving');
            await onSaveRef.current(dataString, title);
            lastSavedDataRef.current = dataString;
            setSaveStatus('saved');
          } else {
            setSaveStatus('saved');
          }
        } catch (error) {
          console.error('Failed to save spreadsheet:', error);
          setSaveStatus('unsaved');
        }
      };

      // Debounced save
      const debouncedSave = () => {
        setSaveStatus('unsaved');
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(doSave, 1000);
      };

      // Set up change listener for auto-save
      if (!isReadOnly) {
        disposableRef.current = univerAPI.onCommandExecuted(() => {
          debouncedSave();
        });
      }
    }

    // Cleanup function - only runs on actual unmount (when key changes or component removed)
    return () => {
      // Use requestAnimationFrame to defer cleanup
      requestAnimationFrame(() => {
        // Check if container is actually gone from DOM
        if (!document.body.contains(container)) {
          const instance = univerInstances.get(noteId);
          if (instance) {
            if (disposableRef.current) {
              disposableRef.current.dispose();
              disposableRef.current = null;
            }
            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
            }
            // Save before disposing
            try {
              const workbook = instance.univerAPI.getActiveWorkbook();
              if (workbook) {
                const snapshot = workbook.save();
                const dataString = JSON.stringify(snapshot);
                if (dataString !== lastSavedDataRef.current) {
                  onSaveRef.current(dataString, title);
                }
              }
            } catch {
              // Ignore save errors on cleanup
            }
            instance.univer.dispose();
            univerInstances.delete(noteId);
          }
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-border flex-shrink-0 border-b p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {onToggleNotesPanel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleNotesPanel}
                title={isNotesPanelOpen ? 'Hide notes panel' : 'Show notes panel'}
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
              value={title}
              onChange={handleTitleChange}
              className="text-foreground placeholder-muted-foreground min-w-0 flex-1 border-none bg-transparent text-2xl font-bold outline-none"
              placeholder="Untitled Spreadsheet"
              disabled={hidden}
            />
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <ButtonGroup>
              {onToggleStar && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleStar(noteId)}
                  className={starred ? 'text-yellow-500' : 'text-muted-foreground'}
                  title={starred ? 'Remove from starred' : 'Add to starred'}
                  disabled={starringStar}
                >
                  {starringStar ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Star className={`h-4 w-4 ${starred ? 'fill-current' : ''}`} />
                  )}
                </Button>
              )}

              {onHideNote && onUnhideNote && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (hidden ? onUnhideNote(noteId) : onHideNote(noteId))}
                  className={hidden ? 'text-primary' : 'text-muted-foreground'}
                  title={hidden ? 'Unhide note' : 'Hide note'}
                  disabled={hidingNote}
                >
                  {hidingNote ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : hidden ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              )}

              {onRefreshNote && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setIsRefreshing(true);
                    try {
                      await onRefreshNote(noteId);
                    } finally {
                      setIsRefreshing(false);
                    }
                  }}
                  className="text-muted-foreground"
                  title="Refresh note from server"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onToggleStar && (
                    <DropdownMenuItem onClick={() => onToggleStar(noteId)}>
                      <Star className="mr-2 h-4 w-4" />
                      {starred ? 'Unstar' : 'Star'}
                    </DropdownMenuItem>
                  )}
                  {onMoveNote && (
                    <DropdownMenuItem onClick={() => setIsMoveModalOpen(true)}>
                      <FolderInput className="mr-2 h-4 w-4" />
                      Move
                    </DropdownMenuItem>
                  )}
                  {onPublishNote && onUnpublishNote && (
                    <DropdownMenuItem onClick={() => setIsPublishModalOpen(true)}>
                      <Globe className="mr-2 h-4 w-4" />
                      {isPublished ? 'Manage' : 'Publish'}
                    </DropdownMenuItem>
                  )}
                  {onArchiveNote && (
                    <DropdownMenuItem onClick={() => onArchiveNote(noteId)}>
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {onDeleteNote && (
                    <DropdownMenuItem onClick={() => onDeleteNote(noteId)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Trash
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </ButtonGroup>
          </div>
        </div>

        <div className="text-muted-foreground flex flex-col gap-1 text-sm">
          <div className="flex items-center gap-4">
            {createdAt && (
              <>
                <span className="text-xs opacity-80">Created {formatDate(createdAt)}</span>
                <span className="text-xs opacity-80">•</span>
              </>
            )}
            {updatedAt && (
              <span className="text-xs opacity-80">Modified {formatDate(updatedAt)}</span>
            )}
            <span className="text-xs opacity-80">•</span>
            <div className="flex items-center gap-1">
              {saveStatus === 'saving' && (
                <>
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
                  <span className="text-xs opacity-80">Saving</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span className="text-xs opacity-80">Saved</span>
                </>
              )}
              {saveStatus === 'unsaved' && (
                <>
                  <div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                  <span className="text-xs opacity-80">Unsaved</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="flex-1 overflow-hidden">
        <style>{`
          /* Hide zoom slider */
          .sheets-editor-container [class*="zoom-slider"],
          .sheets-editor-container [class*="zoomSlider"],
          .sheets-editor-container input[type="range"],
          .sheets-editor-container [class*="zoom-container"],
          .sheets-editor-container [class*="zoomContainer"] {
            display: none !important;
          }

          /*
           * Univer Dark Mode Color Picker Fix
           *
           * Univer inverts all colors on the canvas in dark mode via getRenderColor().
           * This means selecting "white" in the picker stores white but renders as black.
           * We invert the color picker UI so what you see matches what renders on canvas.
           */
          .dark [role="menuitem"]:has([data-u-comp="color-picker"]):focus {
            background-color: transparent !important;
          }
          .dark [data-u-comp="color-picker-presets"] button,
          .dark [data-u-comp="color-picker"] [style*="background-color"] {
            filter: invert(1) hue-rotate(180deg) !important;
          }
          .dark .univerjs-icon-font-color-double-icon path[fill]:not([fill="currentColor"]):not([fill="none"]),
          .dark .univerjs-icon-paint-bucket-icon path[fill]:not([fill="currentColor"]):not([fill="none"]) {
            filter: invert(1) hue-rotate(180deg) !important;
          }
        `}</style>
        <div className="sheets-editor-container h-full w-full">
          <div
            ref={containerRef}
            className="h-full w-full"
          />
        </div>
      </div>

      {/* Move Note Modal */}
      <MoveNoteModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onMove={handleMoveNote}
        folders={folders || []}
        currentFolderId={folderId ?? null}
        noteTitle={title}
      />

      {/* Publish Note Modal */}
      {onPublishNote && onUnpublishNote && (
        <PublishNoteModal
          isOpen={isPublishModalOpen}
          onClose={() => setIsPublishModalOpen(false)}
          note={{
            id: noteId,
            title,
            content: initialData,
            type: 'sheets',
            isPublished,
            publicSlug,
          } as Note}
          onPublish={onPublishNote}
          onUnpublish={onUnpublishNote}
        />
      )}
    </div>
  );
}

export default SheetsEditor;
