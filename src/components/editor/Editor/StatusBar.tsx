import { Plus, Minus } from 'lucide-react';
import { WebSocketStatusCompact } from '@/components/common/WebSocketStatus';
import type { WebSocketStatus } from '@/types/websocket';

interface StatusBarProps {
  wordCount: number;
  charCount: number;
  readingTime: number;
  scrollPercentage: number;
  zoomLevel: number;
  saveStatus: 'saved' | 'saving' | 'error';
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  // WebSocket status props (optional)
  wsStatus?: WebSocketStatus;
  wsIsAuthenticated?: boolean;
  wsLastSync?: number | null;
  onWsReconnect?: () => void;
  onWsConnect?: () => void;
  onWsDisconnect?: () => void;
}

export function StatusBar({
  wordCount,
  charCount,
  readingTime,
  scrollPercentage,
  zoomLevel,
  saveStatus,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  wsStatus,
  wsIsAuthenticated,
  wsLastSync,
  onWsReconnect,
}: StatusBarProps) {
  return (
    <div className="bg-primary/5 dark:bg-primary/10 flex items-center justify-between border-t px-3 py-0.5 font-sans text-[11px]">
      {/* Left side - Word, character count, and reading time */}
      <div className="flex items-center gap-3">
        {(wordCount > 0 || charCount > 0) && (
          <>
            <span className="hover:bg-muted cursor-default rounded px-1.5 py-0.5">
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </span>
            <span className="hover:bg-muted cursor-default rounded px-1.5 py-0.5">
              {charCount} {charCount === 1 ? 'character' : 'characters'}
            </span>
          </>
        )}
        {readingTime > 0 && (
          <span
            className="hover:bg-muted cursor-default rounded px-1.5 py-0.5"
            title="Estimated reading time"
          >
            ~{readingTime} min read
          </span>
        )}
      </div>

      {/* Right side - Scroll percentage, zoom controls, and save status */}
      <div className="flex items-center gap-3">
        {scrollPercentage > 0 && (
          <span
            className="hover:bg-muted cursor-default rounded px-1.5 py-0.5"
            title="Scroll position"
          >
            {scrollPercentage}%
          </span>
        )}

        {/* Note ID */}
        {/* {noteId && (
          <span
            className="hover:bg-muted cursor-default rounded px-1.5 py-0.5"
            title="Note ID"
          >
            {noteId}
          </span>
        )} */}

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={onZoomOut}
            className="hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer rounded p-1 transition-colors"
            title="Zoom out"
            disabled={zoomLevel <= 50}
          >
            <Minus className="h-3 w-3" />
          </button>
          <span
            className="hover:bg-muted min-w-[45px] cursor-pointer rounded px-1.5 py-0.5 text-center"
            onClick={onResetZoom}
            title="Click to reset zoom"
          >
            {zoomLevel}%
          </span>
          <button
            onClick={onZoomIn}
            className="hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer rounded p-1 transition-colors"
            title="Zoom in"
            disabled={zoomLevel >= 200}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {/* WebSocket sync status */}
        {wsStatus && onWsReconnect && (
          <WebSocketStatusCompact
            status={wsStatus}
            isAuthenticated={wsIsAuthenticated || false}
            lastSync={wsLastSync ?? null}
          />
        )}

        {/* Save status */}
        <div
          className="hover:bg-muted flex cursor-default items-center gap-1 rounded px-1.5 py-0.5"
          title={
            saveStatus === 'saving'
              ? 'Saving changes...'
              : saveStatus === 'saved'
                ? 'All changes saved'
                : 'Error saving changes'
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
          {saveStatus === 'error' && (
            <>
              <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
              <span className="text-red-500">Error</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
