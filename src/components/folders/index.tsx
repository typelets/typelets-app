import { useState, useCallback, useMemo } from 'react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { Plus, Search } from 'lucide-react';
import CreateFolderModal from '@/components/folders/modals/CreateFolderModal';
import FolderDeleteModal from '@/components/folders/modals/FolderDeleteModal';
import EditFolderModal from '@/components/folders/modals/EditFolderModal';
import MoveFolderModal from '@/components/folders/modals/MoveFolderModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { APP_VERSION } from '@/constants/version';
import type { ViewMode, Folder as FolderType } from '@/types/note';
import {
  buildFolderTree,
  flattenFolderTree,
  findFolderAndAncestors,
} from '@/utils/folderTree';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import FolderItem from './FolderItem';
import QuickAccessSection from './QuickAccessSection';

interface FolderPanelProps {
  isOpen: boolean;
  currentView: ViewMode;
  folders: FolderType[];
  selectedFolder: FolderType | null;
  searchQuery: string;
  notesCount: number;
  starredCount: number;
  archivedCount: number;
  trashedCount: number;
  expandedFolders: Set<string>;
  onCreateNote: () => void;
  onCreateFolder: (name: string, color: string, parentId?: string) => void;
  onUpdateFolder: (
    folderId: string,
    name: string,
    color: string
  ) => Promise<void>;
  onUpdateFolderParent: (
    folderId: string,
    parentId: string | null
  ) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onReorderFolders: (folderId: string, newIndex: number) => Promise<void>;
  onToggleFolderExpansion: (folderId: string) => void;
  onViewChange: (view: ViewMode) => void;
  onFolderSelect: (folder: FolderType | null) => void;
  onSearchChange: (query: string) => void;
}

export default function FolderPanel({
  isOpen,
  currentView,
  folders,
  selectedFolder,
  searchQuery,
  notesCount,
  starredCount,
  archivedCount,
  trashedCount,
  expandedFolders,
  onCreateFolder,
  onUpdateFolder,
  onUpdateFolderParent,
  onDeleteFolder,
  onReorderFolders,
  onToggleFolderExpansion,
  onViewChange,
  onFolderSelect,
  onSearchChange,
}: FolderPanelProps) {
  const { user } = useUser();
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [movingFolder, setMovingFolder] = useState<FolderType | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [createSubfolderParent, setCreateSubfolderParent] = useState<
    string | null
  >(null);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);
  const displayFolders = useMemo(
    () => flattenFolderTree(folderTree, expandedFolders),
    [folderTree, expandedFolders]
  );

  const {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  } = useDragAndDrop(displayFolders, folders, onReorderFolders);

  const handleFolderSelect = useCallback(
    (folder: FolderType) => {
      onFolderSelect(folder);
      onViewChange('all');

      const ancestors = findFolderAndAncestors(folder.id, folders);
      ancestors.forEach((ancestorId) => {
        if (!expandedFolders.has(ancestorId) && ancestorId !== folder.id) {
          onToggleFolderExpansion(ancestorId);
        }
      });
    },
    [
      onFolderSelect,
      onViewChange,
      folders,
      expandedFolders,
      onToggleFolderExpansion,
    ]
  );

  const handleCreateFolder = useCallback(
    (name: string, color: string) => {
      onCreateFolder(name, color, createSubfolderParent ?? undefined);
      setIsCreateFolderModalOpen(false);
      setCreateSubfolderParent(null);
    },
    [onCreateFolder, createSubfolderParent]
  );

  const handleCreateSubfolder = useCallback((parentId: string) => {
    setCreateSubfolderParent(parentId);
    setIsCreateFolderModalOpen(true);
    setOpenDropdownId(null);
  }, []);

  const handleDeleteFolder = useCallback(
    async (folderId: string) => {
      await onDeleteFolder(folderId);
      setIsDeleteFolderModalOpen(false);
      setFolderToDelete(null);

      if (selectedFolder?.id === folderId) {
        onFolderSelect(null);
        onViewChange('all');
      }
    },
    [onDeleteFolder, selectedFolder, onFolderSelect, onViewChange]
  );

  const handleEditFolder = useCallback((folder: FolderType) => {
    setEditingFolder(folder);
    setOpenDropdownId(null);
  }, []);

  const handleMoveFolder = useCallback((folder: FolderType) => {
    setMovingFolder(folder);
    setOpenDropdownId(null);
  }, []);

  const handleDeleteFolderAction = useCallback((folder: FolderType) => {
    setFolderToDelete(folder);
    setIsDeleteFolderModalOpen(true);
    setOpenDropdownId(null);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteFolderModalOpen(false);
    setFolderToDelete(null);
  }, []);

  const dragHandlers = useMemo(
    () => ({
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
      onDragEnd: handleDragEnd,
    }),
    [
      handleDragStart,
      handleDragOver,
      handleDragEnter,
      handleDragLeave,
      handleDrop,
      handleDragEnd,
    ]
  );

  if (!isOpen) {
    return (
      <div className="h-full w-0 overflow-hidden transition-all duration-300" />
    );
  }

  return (
    <>
      <div className="border-border bg-background flex h-full w-64 flex-col overflow-hidden border-r transition-all duration-300">
        <div className="border-border h-17 shrink-0 border-b p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground text-lg font-semibold">Folders</h3>
          </div>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span className="text-xs opacity-80">Typelets v{APP_VERSION}</span>
          </div>
        </div>

        <div className="border-border shrink-0 border-b p-4">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
        </div>

        <QuickAccessSection
          currentView={currentView}
          selectedFolder={selectedFolder}
          notesCount={notesCount}
          starredCount={starredCount}
          archivedCount={archivedCount}
          trashedCount={trashedCount}
          onViewChange={onViewChange}
          onFolderSelect={onFolderSelect}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Folders
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCreateSubfolderParent(null);
                  setIsCreateFolderModalOpen(true);
                }}
                className="h-6 w-6 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-1">
              {displayFolders.map((folder, index) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  folders={folders}
                  index={index}
                  isSelected={selectedFolder?.id === folder.id}
                  isDropdownOpen={openDropdownId === folder.id}
                  isDraggedOver={dragState.dragOverIndex === index}
                  isDragged={dragState.draggedIndex === index}
                  onSelect={handleFolderSelect}
                  onToggleExpansion={onToggleFolderExpansion}
                  onOpenDropdown={setOpenDropdownId}
                  onEditFolder={handleEditFolder}
                  onMoveFolder={handleMoveFolder}
                  onDeleteFolder={handleDeleteFolderAction}
                  onCreateSubfolder={handleCreateSubfolder}
                  dragHandlers={dragHandlers}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="m-2 flex justify-end">
          <ThemeToggle />
        </div>

        <div className="border-border mt-auto border-t p-4">
          <div className="flex items-center gap-3">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                  userButtonPopoverCard: 'w-64',
                },
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-foreground truncate text-sm font-medium">
                {user?.fullName ??
                  user?.firstName ??
                  user?.emailAddresses[0]?.emailAddress}
              </div>
              <div className="text-muted-foreground text-xs">
                Manage profile & settings
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => {
          setIsCreateFolderModalOpen(false);
          setCreateSubfolderParent(null);
        }}
        onCreateFolder={handleCreateFolder}
        parentFolderName={
          createSubfolderParent
            ? folders.find((f) => f.id === createSubfolderParent)?.name
            : null
        }
      />

      <EditFolderModal
        open={!!editingFolder}
        onOpenChange={(open) => !open && setEditingFolder(null)}
        folder={editingFolder}
        onSave={onUpdateFolder}
      />

      <MoveFolderModal
        open={!!movingFolder}
        onOpenChange={(open) => !open && setMovingFolder(null)}
        folder={movingFolder}
        folders={folders}
        onMove={async (folderId, parentId) => {
          await onUpdateFolderParent(folderId, parentId);
        }}
      />

      <FolderDeleteModal
        isOpen={isDeleteFolderModalOpen}
        folder={folderToDelete}
        onClose={closeDeleteModal}
        onDeleteFolder={handleDeleteFolder}
      />
    </>
  );
}
