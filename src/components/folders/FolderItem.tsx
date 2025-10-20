import { memo } from 'react';
import {
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Edit,
  FolderInput,
  Trash2,
  FolderPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Folder } from '@/types/note';

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
  onEditFolder: (folder: Folder) => void;
  onMoveFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  onCreateSubfolder: (parentId: string) => void;
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
  index,
  isSelected,
  isDropdownOpen,
  isDraggedOver,
  isDragged,
  onSelect,
  onToggleExpansion,
  onOpenDropdown,
  onEditFolder,
  onMoveFolder,
  onDeleteFolder,
  onCreateSubfolder,
  dragHandlers,
}: FolderItemProps) {
  const hasChildren = folder.hasChildren;
  const isExpanded = folder.isExpanded;

  return (
    <div
      draggable
      onClick={() => !isDragged && onSelect(folder)}
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
      <div className="flex min-w-0 flex-1 items-center gap-2 pointer-events-none">
        <div
          className="h-3 w-3 shrink-0 rounded-sm"
          style={{ backgroundColor: folder.color ?? '#6b7280' }}
        />
        <span className="truncate">{folder.name}</span>
      </div>

      <div className="flex shrink-0 items-center gap-1 pointer-events-auto">
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
            className="w-[160px]"
          >
            <DropdownMenuItem
              onClick={() => {
                onEditFolder(folder);
                onOpenDropdown(null);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                onMoveFolder(folder);
                onOpenDropdown(null);
              }}
            >
              <FolderInput className="mr-2 h-4 w-4" />
              Move
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                onCreateSubfolder(folder.id);
                onOpenDropdown(null);
              }}
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              Add
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => {
                onDeleteFolder(folder);
                onOpenDropdown(null);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
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
