import { useState } from 'react';
import {
  Link2,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Backlink } from '../hooks/useBacklinks';

interface BacklinksPanelProps {
  backlinks: Backlink[];
  outgoingLinks: Backlink[];
  onNavigateToNote: (noteId: string) => void;
}

export function BacklinksPanel({
  backlinks,
  outgoingLinks,
  onNavigateToNote,
}: BacklinksPanelProps) {
  const [isBacklinksExpanded, setIsBacklinksExpanded] = useState(true);
  const [isOutgoingExpanded, setIsOutgoingExpanded] = useState(true);

  const totalLinks = backlinks.length + outgoingLinks.length;

  if (totalLinks === 0) {
    return null;
  }

  return (
    <div className="border-border bg-muted/30 border-t">
      {/* Backlinks Section */}
      {backlinks.length > 0 && (
        <div className="border-border border-b">
          <button
            onClick={() => setIsBacklinksExpanded(!isBacklinksExpanded)}
            className="hover:bg-muted/50 flex w-full items-center gap-2 px-4 py-2 text-left transition-colors"
          >
            {isBacklinksExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <ArrowDownLeft className="text-muted-foreground h-4 w-4" />
            <span className="text-sm font-medium">
              {backlinks.length} note{backlinks.length !== 1 ? 's' : ''} link
              here
            </span>
          </button>

          {isBacklinksExpanded && (
            <div className="px-2 pb-2">
              {backlinks.map((backlink) => (
                <Button
                  key={backlink.noteId}
                  variant="ghost"
                  size="sm"
                  className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-left"
                  onClick={() => onNavigateToNote(backlink.noteId)}
                >
                  <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{backlink.noteTitle}</div>
                    {backlink.folderName && (
                      <div className="text-muted-foreground flex items-center gap-1 text-xs">
                        <FolderOpen className="h-3 w-3" />
                        <span className="truncate">{backlink.folderName}</span>
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Outgoing Links Section */}
      {outgoingLinks.length > 0 && (
        <div>
          <button
            onClick={() => setIsOutgoingExpanded(!isOutgoingExpanded)}
            className="hover:bg-muted/50 flex w-full items-center gap-2 px-4 py-2 text-left transition-colors"
          >
            {isOutgoingExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <ArrowUpRight className="text-muted-foreground h-4 w-4" />
            <span className="text-sm font-medium">
              {outgoingLinks.length} outgoing link
              {outgoingLinks.length !== 1 ? 's' : ''}
            </span>
          </button>

          {isOutgoingExpanded && (
            <div className="px-2 pb-2">
              {outgoingLinks.map((link) => (
                <Button
                  key={link.noteId}
                  variant="ghost"
                  size="sm"
                  className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-left"
                  onClick={() => onNavigateToNote(link.noteId)}
                >
                  <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{link.noteTitle}</div>
                    {link.folderName && (
                      <div className="text-muted-foreground flex items-center gap-1 text-xs">
                        <FolderOpen className="h-3 w-3" />
                        <span className="truncate">{link.folderName}</span>
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for showing in status bar or header
 */
interface BacklinksIndicatorProps {
  backlinksCount: number;
  outgoingCount: number;
  onClick?: () => void;
}

export function BacklinksIndicator({
  backlinksCount,
  outgoingCount,
  onClick,
}: BacklinksIndicatorProps) {
  const totalLinks = backlinksCount + outgoingCount;

  if (totalLinks === 0) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground h-7 gap-1.5 px-2 text-xs"
      onClick={onClick}
    >
      <Link2 className="h-3.5 w-3.5" />
      <span>
        {backlinksCount > 0 && (
          <>
            <ArrowDownLeft className="inline h-3 w-3" />
            {backlinksCount}
          </>
        )}
        {backlinksCount > 0 && outgoingCount > 0 && ' · '}
        {outgoingCount > 0 && (
          <>
            <ArrowUpRight className="inline h-3 w-3" />
            {outgoingCount}
          </>
        )}
      </span>
    </Button>
  );
}
