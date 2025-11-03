import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import mermaid from 'mermaid';
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
  Printer,
  Archive,
  Trash2,
  ZoomIn,
  ZoomOut,
  Copy,
  Check,
  Image as ImageIcon,
  FileImage,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MoveNoteModal from '@/components/editor/modals/MoveNoteModal';
import { DEFAULT_DIAGRAM } from './templates';
import type { Folder as FolderType } from '@/types/note';

interface DiagramEditorProps {
  noteId: string;
  initialCode?: string;
  initialTitle?: string;
  createdAt?: Date;
  updatedAt?: Date;
  starred?: boolean;
  hidden?: boolean;
  folders?: FolderType[];
  folderId?: string | null;
  onSave: (code: string, title: string) => void | Promise<void>;
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

export default function DiagramEditor({
  noteId,
  initialCode = DEFAULT_DIAGRAM,
  initialTitle = 'Untitled Diagram',
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
}: DiagramEditorProps) {
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
  const [title, setTitle] = useState(initialTitle);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCodeCollapsed, setIsCodeCollapsed] = useState(false);
  const [editorWidth, setEditorWidth] = useState(25); // percentage - start with smaller code editor
  const [isResizing, setIsResizing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isCopied, setIsCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedCodeRef = useRef(initialCode);
  const lastSavedTitleRef = useRef(initialTitle);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update code and title when the note changes (e.g., when switching notes or creating new ones)
  useEffect(() => {
    setCode(initialCode);
    setTitle(initialTitle);
    lastSavedCodeRef.current = initialCode;
    lastSavedTitleRef.current = initialTitle;
    setSaveStatus('saved');
  }, [noteId, initialCode, initialTitle]);

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

  // Initialize mermaid with theme
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
    });
  }, [isDark]);

  // Render mermaid diagram
  useEffect(() => {
    const renderDiagram = async () => {
      if (!previewRef.current || !code.trim()) return;

      try {
        // Clear previous diagram
        previewRef.current.innerHTML = '';

        // Re-initialize mermaid with current theme
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
        });

        // Generate unique ID for this diagram
        const id = `mermaid-${Date.now()}`;

        // Render the diagram
        const { svg } = await mermaid.render(id, code);

        // Insert the SVG
        previewRef.current.innerHTML = svg;
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        console.error('Mermaid render error:', err);
      }
    };

    // Debounce rendering
    const timeout = setTimeout(renderDiagram, 500);
    return () => clearTimeout(timeout);
  }, [code, isDark]);

  // Autosave on code changes
  useEffect(() => {
    if (code === lastSavedCodeRef.current && title === lastSavedTitleRef.current) {
      return;
    }

    setSaveStatus('unsaved');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!code.trim()) {
        return;
      }

      setSaveStatus('saving');
      try {
        await onSave(code, title);
        lastSavedCodeRef.current = code;
        lastSavedTitleRef.current = title;
        setSaveStatus('saved');
      } catch (error) {
        console.error('Failed to save diagram:', error);
        setSaveStatus('unsaved');
      }
    }, 1000); // 1 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [code, title, onSave]);

  // Handle title changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanPosition({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Mouse wheel zoom - attach directly to DOM with passive: false
  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Scroll = Zoom (no Ctrl needed)
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 3));
    };

    // Add with passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Export as PNG
  const handleExportPNG = async () => {
    const svg = previewRef.current?.querySelector('svg');
    if (!svg) return;

    try {
      // Get the actual content bounds from the original SVG
      const bbox = svg.getBBox();
      const padding = 40; // Larger padding to ensure we capture all content

      // Get full SVG dimensions
      const svgRect = svg.getBoundingClientRect();
      const fullWidth = svgRect.width || parseFloat(svg.getAttribute('width') || '800');
      const fullHeight = svgRect.height || parseFloat(svg.getAttribute('height') || '600');

      // Create canvas with full size first
      const tempCanvas = document.createElement('canvas');
      const scale = 2; // Higher resolution
      tempCanvas.width = fullWidth * scale;
      tempCanvas.height = fullHeight * scale;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCtx.scale(scale, scale);

      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      // Load image and draw to canvas
      const img = new Image();
      img.onload = () => {
        // Draw full SVG to temp canvas
        tempCtx.drawImage(img, 0, 0, fullWidth, fullHeight);
        URL.revokeObjectURL(url);

        // Calculate crop dimensions with safety bounds
        const cropX = Math.max(0, bbox.x - padding);
        const cropY = Math.max(0, bbox.y - padding);
        const cropWidth = Math.min(fullWidth - cropX, bbox.width + padding * 2);
        const cropHeight = Math.min(fullHeight - cropY, bbox.height + padding * 2);

        // Create final canvas with cropped size
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = cropWidth * scale;
        finalCanvas.height = cropHeight * scale;
        const finalCtx = finalCanvas.getContext('2d');
        if (!finalCtx) return;

        // Set background
        finalCtx.fillStyle = isDark ? '#1a1a1a' : '#ffffff';
        finalCtx.fillRect(0, 0, cropWidth * scale, cropHeight * scale);

        // Copy cropped region from temp canvas
        finalCtx.drawImage(
          tempCanvas,
          cropX * scale,
          cropY * scale,
          cropWidth * scale,
          cropHeight * scale,
          0,
          0,
          cropWidth * scale,
          cropHeight * scale
        );

        // Download
        finalCanvas.toBlob((blob) => {
          if (blob) {
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `${title || 'diagram'}.png`;
            a.click();
            URL.revokeObjectURL(downloadUrl);
          }
        }, 'image/png');
      };
      img.src = url;
    } catch (error) {
      console.error('Failed to export PNG:', error);
    }
  };

  // Export as SVG
  const handleExportSVG = () => {
    const svg = previewRef.current?.querySelector('svg');
    if (!svg) return;

    try {
      // Get the actual content bounds from the original SVG (before cloning)
      const bbox = svg.getBBox();
      const padding = 40; // Larger padding to ensure we capture all content

      // Clone SVG to avoid modifying the original
      const svgClone = svg.cloneNode(true) as SVGSVGElement;

      // Set viewBox to crop tightly to content
      svgClone.setAttribute('viewBox',
        `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`
      );
      svgClone.setAttribute('width', String(bbox.width + padding * 2));
      svgClone.setAttribute('height', String(bbox.height + padding * 2));

      const svgData = new XMLSerializer().serializeToString(svgClone);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'diagram'}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export SVG:', error);
    }
  };

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    const svg = previewRef.current?.querySelector('svg');
    if (!svg) return;

    try {
      // Get the actual content bounds from the original SVG
      const bbox = svg.getBBox();
      const padding = 40; // Larger padding to ensure we capture all content

      // Get full SVG dimensions
      const svgRect = svg.getBoundingClientRect();
      const fullWidth = svgRect.width || parseFloat(svg.getAttribute('width') || '800');
      const fullHeight = svgRect.height || parseFloat(svg.getAttribute('height') || '600');

      // Create canvas with full size first
      const tempCanvas = document.createElement('canvas');
      const scale = 2;
      tempCanvas.width = fullWidth * scale;
      tempCanvas.height = fullHeight * scale;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCtx.scale(scale, scale);

      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      // Load image and draw to canvas
      const img = new Image();
      img.onload = async () => {
        // Draw full SVG to temp canvas
        tempCtx.drawImage(img, 0, 0, fullWidth, fullHeight);
        URL.revokeObjectURL(url);

        // Calculate crop dimensions with safety bounds
        const cropX = Math.max(0, bbox.x - padding);
        const cropY = Math.max(0, bbox.y - padding);
        const cropWidth = Math.min(fullWidth - cropX, bbox.width + padding * 2);
        const cropHeight = Math.min(fullHeight - cropY, bbox.height + padding * 2);

        // Create final canvas with cropped size
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = cropWidth * scale;
        finalCanvas.height = cropHeight * scale;
        const finalCtx = finalCanvas.getContext('2d');
        if (!finalCtx) return;

        // Set background
        finalCtx.fillStyle = isDark ? '#1a1a1a' : '#ffffff';
        finalCtx.fillRect(0, 0, cropWidth * scale, cropHeight * scale);

        // Copy cropped region from temp canvas
        finalCtx.drawImage(
          tempCanvas,
          cropX * scale,
          cropY * scale,
          cropWidth * scale,
          cropHeight * scale,
          0,
          0,
          cropWidth * scale,
          cropHeight * scale
        );

        // Copy to clipboard
        finalCanvas.toBlob(async (blob) => {
          if (blob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob }),
              ]);
              // Show success feedback
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2000);
            } catch (error) {
              console.error('Failed to copy to clipboard:', error);
            }
          }
        }, 'image/png');
      };
      img.src = url;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handlePrint = async () => {
    // If in dark mode, temporarily re-render diagram in light mode for printing
    if (isDark && previewRef.current) {
      try {
        // Re-initialize mermaid in light mode
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default', // Force light theme for print
          securityLevel: 'loose',
        });

        // Generate unique ID for print diagram
        const id = `mermaid-print-${Date.now()}`;

        // Render the diagram in light mode
        const { svg } = await mermaid.render(id, code);

        // Store original content
        const originalContent = previewRef.current.innerHTML;

        // Replace with light mode version
        previewRef.current.innerHTML = svg;

        // Print
        window.print();

        // Restore original content
        previewRef.current.innerHTML = originalContent;

        // Re-initialize mermaid with original theme
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
        });
      } catch (error) {
        console.error('Failed to render light mode for print:', error);
        window.print(); // Fallback to regular print
      }
    } else {
      window.print();
    }
  };

  const handleMoveNote = (folderId: string | null) => {
    if (onMoveNote) {
      onMoveNote(noteId, { folderId });
    }
    setIsMoveModalOpen(false);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Print styles */}
      <style>{`
        @media print {
          /* Hide everything except the diagram */
          body * {
            visibility: hidden;
          }

          /* Show only the preview container and its contents */
          [data-print-content],
          [data-print-content] * {
            visibility: visible;
          }

          /* Position the print content */
          [data-print-content] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: white !important;
            padding: 20px;
          }

          /* Reset zoom and pan for print */
          [data-print-diagram] {
            transform: none !important;
            transition: none !important;
          }

          /* Center the diagram */
          [data-print-diagram] {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: auto;
          }

          /* Remove page margins for better fit */
          @page {
            margin: 0.5cm;
          }
        }
      `}</style>

      {/* Header - matching note editor style */}
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
              placeholder="Untitled Diagram"
              disabled={hidden}
            />
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
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </DropdownMenuItem>
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

      {/* Editor and Preview */}
      <div className="flex-1 flex overflow-hidden" ref={containerRef}>
        {/* Code Editor */}
        {!isCodeCollapsed && (
          <div
            className="border-r flex flex-col"
            style={{ width: `${editorWidth}%` }}
          >
            <div className="p-2 bg-muted/50 border-b flex items-center h-10">
              <span className="text-sm font-medium">Code</span>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="markdown"
                value={code}
                onChange={(value) => setCode(value || '')}
                theme={isDark ? 'vs-dark' : 'light'}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>
        )}

        {/* Resize Handle */}
        {!isCodeCollapsed && (
          <div
            className={`w-1 hover:bg-primary/50 cursor-col-resize flex-shrink-0 ${
              isResizing ? 'bg-primary' : 'bg-border'
            }`}
            onMouseDown={handleResizeMouseDown}
          />
        )}

        {/* Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-2 bg-muted/50 border-b flex items-center justify-between h-10">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCodeCollapsed(!isCodeCollapsed)}
                title={isCodeCollapsed ? 'Show code editor' : 'Hide code editor'}
              >
                {isCodeCollapsed ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </Button>
              <span className="text-sm font-medium">Preview</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyToClipboard}
                title={isCopied ? "Copied!" : "Copy to clipboard"}
                className={isCopied ? "text-green-600" : ""}
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    <span className="text-xs">Copied!</span>
                  </>
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportPNG}
                title="Export as PNG"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportSVG}
                title="Export as SVG"
              >
                <FileImage className="h-4 w-4" />
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                title="Zoom out (or scroll down)"
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetZoom}
                title="Reset zoom and position"
                className="min-w-[60px]"
              >
                <span className="text-xs">{Math.round(zoom * 100)}%</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                title="Zoom in (or scroll up)"
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div
            ref={previewContainerRef}
            className="flex-1 overflow-hidden bg-background"
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            data-print-content
          >
            <div
              className="p-8 h-full"
              style={{
                transform: `scale(${zoom}) translate(${panPosition.x / zoom}px, ${panPosition.y / zoom}px)`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.1s ease-out',
              }}
              data-print-diagram
            >
              {error ? (
                <div className="text-red-500 p-4 border border-red-300 rounded bg-red-50 dark:bg-red-900/20">
                  <p className="font-semibold">Error:</p>
                  <pre className="mt-2 text-sm whitespace-pre-wrap">{error}</pre>
                </div>
              ) : (
                <div
                  ref={previewRef}
                  className="flex items-center justify-center min-h-full"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-primary/5 dark:bg-primary/10 flex items-center justify-between border-t px-3 py-0.5 font-sans text-[11px]">
        {/* Left side - Info */}
        <div className="flex items-center gap-3">
        </div>

        {/* Right side - Save status */}
        <div className="flex items-center gap-3">
          <div
            className="hover:bg-muted flex cursor-default items-center gap-1 rounded px-1.5 py-0.5"
            title={
              saveStatus === 'saving'
                ? 'Saving changes...'
                : saveStatus === 'saved'
                  ? 'All changes saved'
                  : 'Unsaved changes'
            }
          >
            {saveStatus === 'saving' && (
              <>
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
                <span>Saving</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span>Saved</span>
              </>
            )}
            {saveStatus === 'unsaved' && (
              <>
                <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                <span>Unsaved</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Move Note Modal */}
      {onMoveNote && folders && (
        <MoveNoteModal
          isOpen={isMoveModalOpen}
          onClose={() => setIsMoveModalOpen(false)}
          onMove={handleMoveNote}
          folders={folders}
          currentFolderId={folderId ?? null}
          noteTitle={title}
        />
      )}
    </div>
  );
}
