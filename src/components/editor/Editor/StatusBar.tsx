import { Plus, Minus } from 'lucide-react';

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
}: StatusBarProps) {
  return (
    <div className="border-t bg-primary/5 dark:bg-primary/10 px-3 py-0.5 flex items-center justify-between text-[11px] font-sans">
      {/* Left side - Word, character count, and reading time */}
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
        {readingTime > 0 && (
          <span className="hover:bg-muted px-1.5 py-0.5 rounded cursor-default" title="Estimated reading time">
            ~{readingTime} min read
          </span>
        )}
      </div>
      
      {/* Right side - Scroll percentage, zoom controls, and save status */}
      <div className="flex items-center gap-3">
        {scrollPercentage > 0 && (
          <span className="hover:bg-muted px-1.5 py-0.5 rounded cursor-default" title="Scroll position">
            {scrollPercentage}%
          </span>
        )}
        
        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={onZoomOut}
            className="hover:bg-muted p-1 rounded cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom out"
            disabled={zoomLevel <= 50}
          >
            <Minus className="h-3 w-3" />
          </button>
          <span 
            className="hover:bg-muted px-1.5 py-0.5 rounded cursor-pointer min-w-[45px] text-center"
            onClick={onResetZoom}
            title="Click to reset zoom"
          >
            {zoomLevel}%
          </span>
          <button
            onClick={onZoomIn}
            className="hover:bg-muted p-1 rounded cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom in"
            disabled={zoomLevel >= 200}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        
        {/* Save status */}
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
    </div>
  );
}