import { memo } from 'react';

import { MoreHorizontal, ChevronRight, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Folder } from '@/types/note';

import FolderEditDropdown from './FolderEditDropdown';

interface FolderItemProps {
  folder: Folder;
  folders: Folder[];
  index: number;
  isSelected: boolean;
  isDropdownOpen: boolean;
  isDraggedOver: boolean;
  isDragged: boolean;
  onSelect: (folder: Folder) => void;
  onToggleExpansion: (folderId: string) => void;
  onOpenDropdown: (folderId: string | null) => void;
  onUpdateFolder: (
    folderId: string,
    name: string,
    color: string
  ) => Promise<void>;
  onUpdateFolderParent: (
    folderId: string,
    parentId: string | null
  ) => Promise<void>;
  onCreateSubfolder: (parentId: string) => void;
  onOpenDeleteModal: (folder: Folder) => void;
  dragHandlers: {
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, index: number) => void;
    onDragEnd: (e: React.DragEvent) => void;
  };
}

function FolderItem({
  folder,
  folders,
  index,
  isSelected,
  isDropdownOpen,
  isDraggedOver,
  isDragged,
  onSelect,
  onToggleExpansion,
  onOpenDropdown,
  onUpdateFolder,
  onUpdateFolderParent,
  onCreateSubfolder,
  onOpenDeleteModal,
  dragHandlers,
}: FolderItemProps) {
  const hasChildren = folder.hasChildren;
  const isExpanded = folder.isExpanded;

  return (
    <div
      draggable
      onDragStart={(e) => dragHandlers.onDragStart(e, index)}
      onDragOver={(e) => dragHandlers.onDragOver(e, index)}
      onDragEnter={dragHandlers.onDragEnter}
      onDragLeave={dragHandlers.onDragLeave}
      onDrop={(e) => dragHandlers.onDrop(e, index)}
      onDragEnd={dragHandlers.onDragEnd}
      className={`group relative flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition-all duration-200 ${
        isSelected || isDropdownOpen
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
      } ${
        isDraggedOver && !isDragged
          ? 'border-accent-foreground/40 bg-accent/50 border-2 border-dashed'
          : ''
      } ${isDragged ? 'scale-[0.98] opacity-50 shadow-lg' : ''}`}
      style={{
        marginLeft: `${(folder.depth ?? 0) * 16}px`,
      }}
    >
      <button
        onClick={() => onSelect(folder)}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
        disabled={isDragged}
      >
        <div
          className="h-3 w-3 shrink-0 rounded-sm"
          style={{ backgroundColor: folder.color ?? '#6b7280' }}
        />
        <span className="truncate">{folder.name}</span>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        {(folder.noteCount ?? 0) > 0 && (
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-1 text-xs">
            {folder.noteCount}
          </span>
        )}

        <DropdownMenu
          open={isDropdownOpen}
          onOpenChange={(open) => onOpenDropdown(open ? folder.id : null)}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 w-6 shrink-0 p-0 transition-opacity duration-200 ${
                isDragged
                  ? 'pointer-events-none opacity-20'
                  : 'opacity-0 group-hover:opacity-100'
              } ${isSelected || isDropdownOpen ? '!opacity-100' : ''}`}
              onClick={(e) => e.stopPropagation()}
              disabled={isDragged}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            className="mt-2 -ml-2 p-0"
          >
            <FolderEditDropdown
              folder={folder}
              folders={folders}
              onClose={() => onOpenDropdown(null)}
              onUpdateFolder={onUpdateFolder}
              onUpdateFolderParent={onUpdateFolderParent}
              onCreateSubfolder={onCreateSubfolder}
              onOpenDeleteModal={onOpenDeleteModal}
            />
          </DropdownMenuContent>
        </DropdownMenu>

        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpansion(folder.id);
            }}
            className="hover:bg-accent/30 rounded p-1 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="text-muted-foreground h-4 w-4" />
            ) : (
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(FolderItem);
