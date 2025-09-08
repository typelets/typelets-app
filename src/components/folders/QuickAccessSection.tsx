import { useMemo } from 'react';

import type { ViewMode, Folder } from '@/types/note';

import { SPECIAL_VIEWS } from './constants';

interface QuickAccessSectionProps {
  currentView: ViewMode;
  selectedFolder: Folder | null;
  notesCount: number;
  starredCount: number;
  archivedCount: number;
  trashedCount: number;
  hiddenCount: number;
  onViewChange: (view: ViewMode) => void;
  onFolderSelect: (folder: Folder | null) => void;
}

export default function QuickAccessSection({
  currentView,
  selectedFolder,
  notesCount,
  starredCount,
  archivedCount,
  trashedCount,
  hiddenCount,
  onViewChange,
  onFolderSelect,
}: QuickAccessSectionProps) {
  const counts = useMemo(
    () => ({
      all: notesCount,
      starred: starredCount,
      archived: archivedCount,
      trash: trashedCount,
      hidden: hiddenCount,
    }),
    [notesCount, starredCount, archivedCount, trashedCount, hiddenCount]
  );

  const handleViewSelect = (view: ViewMode) => {
    onViewChange(view);
    onFolderSelect(null);
  };

  return (
    <div className="border-border shrink-0 border-b p-4">
      <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
        Quick Access
      </div>
      <nav className="space-y-1">
        {SPECIAL_VIEWS.map((item) => {
          const Icon = item.icon;
          const isSelected = currentView === item.id && !selectedFolder;
          const count = counts[item.id];

          return (
            <button
              key={item.id}
              onClick={() => handleViewSelect(item.id)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                isSelected
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.label}
              </div>
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-1 text-xs">
                {count}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
