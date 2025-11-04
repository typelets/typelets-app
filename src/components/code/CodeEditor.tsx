import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/ui/theme-provider';
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
  Play,
  Square,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MoveNoteModal from '@/components/editor/modals/MoveNoteModal';
import { DEFAULT_CODE } from './templates';
import { codeExecutionService, type ExecutionResult, type SupportedLanguage } from '@/services/codeExecutionService';
import type { Folder as FolderType } from '@/types/note';

// Maximum output size to prevent database/memory issues (50KB)
const MAX_OUTPUT_SIZE = 50000;

// Maximum code size to prevent database/API issues (100KB)
const MAX_CODE_SIZE = 100000;

interface SavedExecutionResult {
  output: string;
  error?: string;
  executionTime: number;
  status?: { id: number; description: string };
  timestamp?: string;
}

interface CodeEditorProps {
  noteId: string;
  initialCode?: string;
  initialLanguage?: string;
  initialTitle?: string;
  initialLastExecution?: SavedExecutionResult | null;
  createdAt?: Date;
  updatedAt?: Date;
  starred?: boolean;
  hidden?: boolean;
  folders?: FolderType[];
  folderId?: string | null;
  onSave: (
    code: string,
    title: string,
    language: string,
    lastExecution?: SavedExecutionResult | null
  ) => void | Promise<void>;
  onToggleStar?: (noteId: string) => void;
  starringStar?: boolean;
  onHideNote?: (noteId: string) => void;
  onUnhideNote?: (noteId: string) => void;
  hidingNote?: boolean;
  onRefreshNote?: (noteId: string) => void;
  onArchiveNote?: (noteId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onMoveNote?: (noteId: string, updates: { folderId: string | null }) => void;
  onToggleNotesPanel?: () => void;
  isNotesPanelOpen?: boolean;
}

export default function CodeEditor({
  noteId,
  initialCode = DEFAULT_CODE.code,
  initialLanguage = DEFAULT_CODE.language,
  initialTitle = 'Untitled Code',
  initialLastExecution = null,
  createdAt,
  updatedAt,
  starred = false,
  hidden = false,
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
  onToggleNotesPanel,
  isNotesPanelOpen,
}: CodeEditorProps) {
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(() => {
    return (
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  // Update isDark when theme changes or system preference changes
  useEffect(() => {
    const updateIsDark = () => {
      setIsDark(
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      );
    };

    updateIsDark();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateIsDark();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(initialLanguage);
  const [title, setTitle] = useState(initialTitle);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editorWidth, setEditorWidth] = useState(75); // percentage - 75/25 split
  const [isResizing, setIsResizing] = useState(false);
  const [output, setOutput] = useState<ExecutionResult | null>(() => {
    // Load saved execution result if available
    if (initialLastExecution) {
      return {
        output: initialLastExecution.output,
        error: initialLastExecution.error,
        executionTime: initialLastExecution.executionTime,
        language: initialLanguage as SupportedLanguage,
        status: initialLastExecution.status,
      };
    }
    return null;
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<{ id: number; description: string } | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedCodeRef = useRef(initialCode);
  const lastSavedTitleRef = useRef(initialTitle);
  const lastSavedLanguageRef = useRef(initialLanguage);
  const containerRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Update code, language, title and output when the note changes
  useEffect(() => {
    setCode(initialCode);
    setLanguage(initialLanguage);
    setTitle(initialTitle);
    lastSavedCodeRef.current = initialCode;
    lastSavedLanguageRef.current = initialLanguage;
    lastSavedTitleRef.current = initialTitle;
    setSaveStatus('saved');

    // Load saved execution result if available
    if (initialLastExecution) {
      setOutput({
        output: initialLastExecution.output,
        error: initialLastExecution.error,
        executionTime: initialLastExecution.executionTime,
        language: initialLanguage as SupportedLanguage,
        status: initialLastExecution.status,
      });
    } else {
      setOutput(null);
    }
  }, [noteId, initialCode, initialLanguage, initialTitle, initialLastExecution]);

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

  // Handle resizing
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Constrain width between 20% and 80%
      const constrainedWidth = Math.min(Math.max(newWidth, 20), 80);
      setEditorWidth(constrainedWidth);

      // Trigger Monaco layout when width changes
      if (monacoRef.current) {
        monacoRef.current.layout();
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Handle code execution
  const executeCode = async () => {
    if (isExecuting || !code.trim()) return;

    // Check if code size exceeds maximum allowed
    if (code.length > MAX_CODE_SIZE) {
      setOutput({
        output: '',
        error: `Code exceeds maximum size of ${(MAX_CODE_SIZE / 1000).toFixed(0)}KB. Please reduce code size before executing.`,
        executionTime: 0,
        language: language as SupportedLanguage,
        status: undefined,
      });
      return;
    }

    // Check if language is supported
    if (!codeExecutionService.isLanguageSupported(language)) {
      setOutput({
        output: '',
        error: `Language ${language} is not supported for execution.`,
        executionTime: 0,
        language: language as SupportedLanguage,
        status: undefined,
      });
      return;
    }

    setIsExecuting(true);
    setCurrentStatus({ id: 1, description: 'In Queue' });
    setOutput(null);

    try {
      const result = await codeExecutionService.executeCode(
        code,
        language as SupportedLanguage,
        (status) => {
          setCurrentStatus(status);
        }
      );

      // Truncate output if too large to prevent database/memory issues
      if (result.output && result.output.length > MAX_OUTPUT_SIZE) {
        result.output = result.output.substring(0, MAX_OUTPUT_SIZE) +
          '\n\n... (output truncated to 50KB)';
      }
      if (result.error && result.error.length > MAX_OUTPUT_SIZE) {
        result.error = result.error.substring(0, MAX_OUTPUT_SIZE) +
          '\n\n... (error message truncated)';
      }

      setOutput(result);
      setCurrentStatus(null);

      // Auto-save execution results immediately
      try {
        const lastExecution = {
          output: result.output,
          error: result.error,
          executionTime: result.executionTime,
          status: result.status,
          timestamp: new Date().toISOString(),
        };
        await onSave(code, title, language, lastExecution);
        setSaveStatus('saved');
        setSaveError(null);
      } catch (saveError) {
        console.error('Failed to save execution results:', saveError);
        setSaveStatus('error');
        setSaveError(saveError instanceof Error ? saveError.message : 'Failed to save execution results');
      }
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Truncate error message if too large
      if (errorMessage.length > MAX_OUTPUT_SIZE) {
        errorMessage = errorMessage.substring(0, MAX_OUTPUT_SIZE) +
          '\n\n... (error message truncated)';
      }

      const errorResult = {
        output: '',
        error: errorMessage,
        executionTime: 0,
        language: language as SupportedLanguage,
        status: undefined,
      };
      setOutput(errorResult);
      setCurrentStatus(null);

      // Auto-save error results immediately
      try {
        const lastExecution = {
          output: errorResult.output,
          error: errorResult.error,
          executionTime: errorResult.executionTime,
          status: errorResult.status,
          timestamp: new Date().toISOString(),
        };
        await onSave(code, title, language, lastExecution);
        setSaveStatus('saved');
        setSaveError(null);
      } catch (saveError) {
        console.error('Failed to save execution error results:', saveError);
        setSaveStatus('error');
        setSaveError(saveError instanceof Error ? saveError.message : 'Failed to save execution results');
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const clearOutput = async () => {
    setOutput(null);
    // Auto-save when clearing output
    try {
      await onSave(code, title, language, null);
      setSaveStatus('saved');
      setSaveError(null);
    } catch (error) {
      console.error('Failed to save after clearing output:', error);
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  // Auto-save handler
  const handleCodeChange = (value: string | undefined) => {
    if (value === undefined) return;

    // Check if code size exceeds maximum allowed
    if (value.length > MAX_CODE_SIZE) {
      setSaveStatus('error');
      setSaveError(`Code exceeds maximum size of ${(MAX_CODE_SIZE / 1000).toFixed(0)}KB (current: ${(value.length / 1000).toFixed(1)}KB)`);
      return;
    }

    setCode(value);
    setSaveStatus('unsaved');
    setSaveError(null);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (value !== lastSavedCodeRef.current ||
          title !== lastSavedTitleRef.current ||
          language !== lastSavedLanguageRef.current) {
        setSaveStatus('saving');
        const lastExecution = output ? {
          output: output.output,
          error: output.error,
          executionTime: output.executionTime,
          status: output.status,
          timestamp: new Date().toISOString(),
        } : null;

        try {
          await onSave(value, title, language, lastExecution);
          lastSavedCodeRef.current = value;
          lastSavedTitleRef.current = title;
          lastSavedLanguageRef.current = language;
          setTimeout(() => setSaveStatus('saved'), 500);
        } catch (error) {
          console.error('Failed to save code changes:', error);
          setSaveStatus('error');
          setSaveError(error instanceof Error ? error.message : 'Failed to save changes');
        }
      }
    }, 1000);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSaveStatus('unsaved');
    setSaveError(null);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (newTitle !== lastSavedTitleRef.current) {
        setSaveStatus('saving');
        const lastExecution = output ? {
          output: output.output,
          error: output.error,
          executionTime: output.executionTime,
          status: output.status,
          timestamp: new Date().toISOString(),
        } : null;

        try {
          await onSave(code, newTitle, language, lastExecution);
          lastSavedTitleRef.current = newTitle;
          setTimeout(() => setSaveStatus('saved'), 500);
        } catch (error) {
          console.error('Failed to save title changes:', error);
          setSaveStatus('error');
          setSaveError(error instanceof Error ? error.message : 'Failed to save changes');
        }
      }
    }, 1000);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    setSaveStatus('unsaved');
    setSaveError(null);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      const lastExecution = output ? {
        output: output.output,
        error: output.error,
        executionTime: output.executionTime,
        status: output.status,
        timestamp: new Date().toISOString(),
      } : null;

      try {
        await onSave(code, title, newLanguage, lastExecution);
        lastSavedLanguageRef.current = newLanguage;
        setTimeout(() => setSaveStatus('saved'), 500);
      } catch (error) {
        console.error('Failed to save language changes:', error);
        setSaveStatus('error');
        setSaveError(error instanceof Error ? error.message : 'Failed to save changes');
      }
    }, 1000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefreshNote?.(noteId);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header - matching diagram editor style */}
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
              value={title}
              onChange={handleTitleChange}
              className="text-foreground placeholder-muted-foreground min-w-0 flex-1 border-none bg-transparent text-2xl font-bold outline-none"
              placeholder="Untitled Code"
              disabled={hidden}
            />
            {saveStatus !== 'saved' && (
              <span
                className={`flex-shrink-0 text-xs ${
                  saveStatus === 'error'
                    ? 'text-destructive font-medium'
                    : 'text-muted-foreground opacity-80'
                }`}
              >
                {saveStatus === 'saving' && 'Saving...'}
                {saveStatus === 'unsaved' && 'Unsaved'}
                {saveStatus === 'error' && (
                  <span className="flex items-center gap-1">
                    ⚠️ Save failed
                    {saveError && (
                      <span className="text-muted-foreground font-normal">
                        ({saveError})
                      </span>
                    )}
                  </span>
                )}
              </span>
            )}
            {saveStatus === 'error' && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setSaveStatus('saving');
                  setSaveError(null);
                  const lastExecution = output ? {
                    output: output.output,
                    error: output.error,
                    executionTime: output.executionTime,
                    status: output.status,
                    timestamp: new Date().toISOString(),
                  } : null;
                  try {
                    await onSave(code, title, language, lastExecution);
                    lastSavedCodeRef.current = code;
                    lastSavedTitleRef.current = title;
                    lastSavedLanguageRef.current = language;
                    setSaveStatus('saved');
                  } catch (error) {
                    console.error('Retry save failed:', error);
                    setSaveStatus('error');
                    setSaveError(error instanceof Error ? error.message : 'Failed to save');
                  }
                }}
                className="h-7"
              >
                Retry Save
              </Button>
            )}
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {onToggleStar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleStar(noteId)}
                className={
                  starred ? 'text-yellow-500' : 'text-muted-foreground'
                }
                title={starred ? 'Remove from starred' : 'Add to starred'}
                disabled={starringStar}
              >
                {starringStar ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Star
                    className={`h-4 w-4 ${starred ? 'fill-current' : ''}`}
                  />
                )}
              </Button>
            )}

            {onHideNote && onUnhideNote && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  hidden ? onUnhideNote(noteId) : onHideNote(noteId)
                }
                className={
                  hidden ? 'text-primary' : 'text-muted-foreground'
                }
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
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
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
                <Button variant="ghost" size="sm">
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
          </div>
        </div>

        <div className="text-muted-foreground flex flex-col gap-1 text-sm">
          <div className="flex items-center gap-4">
            {createdAt && (
              <>
                <span className="text-xs opacity-80">
                  Created {formatDate(createdAt)}
                </span>
                <span className="text-xs opacity-80">•</span>
              </>
            )}
            {updatedAt && (
              <span className="text-xs opacity-80">
                Modified {formatDate(updatedAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Split Editor Container */}
      <div ref={containerRef} className="relative flex flex-1 overflow-hidden">
        {/* Left: Code Editor */}
        <div
          style={{ width: `${editorWidth}%` }}
          className="relative flex flex-col border-r border-gray-200 dark:border-gray-700"
        >
            {/* Code Editor Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Code Editor
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Language Selector */}
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="cursor-pointer appearance-none rounded border border-gray-200 bg-white px-2 py-1 pr-7 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    disabled={hidden}
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="c">C</option>
                    <option value="csharp">C#</option>
                    <option value="go">Go</option>
                    <option value="rust">Rust</option>
                    <option value="php">PHP</option>
                    <option value="ruby">Ruby</option>
                    <option value="kotlin">Kotlin</option>
                    <option value="swift">Swift</option>
                    <option value="bash">Bash</option>
                    <option value="sql">SQL</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3 w-3 -translate-y-1/2 transform text-gray-500 dark:text-gray-400" />
                </div>
                {/* Execute Button */}
                <Button
                  onClick={executeCode}
                  disabled={isExecuting || !code.trim() || hidden}
                  variant="default"
                  size="sm"
                  className="h-7 bg-green-600 px-3 hover:bg-green-700 disabled:bg-gray-400"
                >
                  {isExecuting ? (
                    <>
                      <Square className="mr-1 h-3 w-3" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="mr-1 h-3 w-3" />
                      Run
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex-1">
              <Editor
                height="100%"
                language={language}
                value={code}
                onChange={handleCodeChange}
                theme={isDark ? 'vs-dark' : 'vs'}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  fontSize: 14,
                  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 16, bottom: 16 },
                }}
                onMount={(editor) => {
                  monacoRef.current = editor;

                  // Track cursor position
                  editor.onDidChangeCursorPosition((e) => {
                    setCursorPosition({
                      line: e.position.lineNumber,
                      column: e.position.column,
                    });
                  });

                  // Add Ctrl+Enter shortcut to execute code
                  editor.addCommand(
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                    () => {
                      executeCode();
                    }
                  );
                }}
              />
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              <div className="flex items-center gap-4">
                <span>
                  Ln {cursorPosition.line}, Col {cursorPosition.column}
                </span>
                <span>
                  {code.split('\n').length} lines
                </span>
                <span>
                  {code.length} chars
                </span>
              </div>
              <div className="flex items-center gap-3">
                {saveStatus === 'saved' && (
                  <span className="text-green-600 dark:text-green-400">
                    ✓ Saved
                  </span>
                )}
                {saveStatus === 'saving' && (
                  <span className="opacity-70">
                    Saving...
                  </span>
                )}
                {saveStatus === 'unsaved' && (
                  <span className="text-orange-600 dark:text-orange-400">
                    • Unsaved
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-red-600 dark:text-red-400">
                    ⚠ Error
                  </span>
                )}
                <span className="opacity-70">Ctrl+Enter to run</span>
              </div>
            </div>
          </div>

        {/* Resize Handle */}
        <div
          className={`w-1 cursor-col-resize bg-gray-200 transition-colors hover:bg-blue-400 dark:bg-gray-700 dark:hover:bg-blue-500 ${
            isResizing ? 'bg-blue-500 dark:bg-blue-400' : ''
          }`}
          onMouseDown={handleResizeMouseDown}
          title="Drag to resize"
        >
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-1 rounded-full bg-gray-400 dark:bg-gray-500"></div>
          </div>
        </div>

        {/* Right: Console Output */}
        <div
          style={{ width: `${100 - editorWidth}%` }}
          className="flex flex-col bg-gray-50 dark:bg-gray-900"
        >
          {/* Console Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Console Output
              </span>
              {isExecuting && currentStatus && (
                <span
                  className={`animate-pulse rounded-full px-2 py-1 text-xs font-medium ${
                    currentStatus.id === 1
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : currentStatus.id === 2
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
                  }`}
                >
                  {currentStatus.description}
                </span>
              )}
              {output && (
                <>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({output.executionTime}ms)
                  </span>
                  {output.status && (
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        output.status.id === 3
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : output.status.id === 6
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                            : output.status.id === 5
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      }`}
                    >
                      {output.status.description}
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              {output && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearOutput}
                  className="h-7 px-2"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Console Content */}
          <div className="flex-1 overflow-auto p-4 font-mono text-sm">
            {!output ? (
              <div className="text-gray-400 italic dark:text-gray-500">
                Run code to see output... (Ctrl+Enter)
              </div>
            ) : output.error ? (
              <div className="whitespace-pre-wrap text-red-600 dark:text-red-400">
                <span className="font-semibold text-red-700 dark:text-red-500">
                  ERROR:
                </span>{' '}
                {output.error}
              </div>
            ) : (
              <div className="whitespace-pre-wrap">
                {output.output ? (
                  <>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      ›
                    </span>{' '}
                    <span className="text-gray-600 dark:text-gray-400">
                      output:
                    </span>
                    {'\n'}
                    <span className="text-green-600 dark:text-green-400">
                      {output.output}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-500 italic dark:text-gray-400">
                    (no output)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Move Note Modal */}
      <MoveNoteModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onMove={(folderId) => onMoveNote?.(noteId, { folderId })}
        folders={folders || []}
        currentFolderId={folderId ?? null}
        noteTitle={title}
      />
    </div>
  );
}
