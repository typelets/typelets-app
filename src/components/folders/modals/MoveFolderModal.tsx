import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Folder, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Folder as FolderType } from '@/types/note';
import { canMoveToFolder } from '@/utils/folderTree';

interface MoveFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderType | null;
  folders: FolderType[];
  onMove: (folderId: string, parentId: string | null) => Promise<void>;
}

interface FolderNode extends FolderType {
  children: FolderNode[];
  level: number;
}

export default function MoveFolderModal({
  open,
  onOpenChange,
  folder,
  folders,
  onMove,
}: MoveFolderModalProps) {
  const [selectedParentId, setSelectedParentId] = React.useState<string | null>(
    null
  );
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isMoving, setIsMoving] = React.useState(false);

  React.useEffect(() => {
    if (open && folder) {
      setSelectedParentId(folder.parentId ?? null);
      setSearchQuery('');
      setIsMoving(false);
    }
  }, [open, folder]);

  const folderTree = React.useMemo(() => {
    if (!folder) return [];

    const isDescendant = (parentId: string, childId: string): boolean => {
      if (parentId === childId) return true;
      const child = folders.find((f) => f.id === childId);
      if (!child || !child.parentId) return false;
      return isDescendant(parentId, child.parentId);
    };

    const buildTree = (
      parentId: string | null = null,
      level = 0
    ): FolderNode[] => {
      return folders
        .filter((f) => {
          if (f.id === folder.id) return false;
          if (isDescendant(folder.id, f.id)) return false;
          return f.parentId === parentId;
        })
        .map((f) => ({
          ...f,
          level,
          children: buildTree(f.id, level + 1),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    };

    return buildTree();
  }, [folders, folder]);

  const displayFolders = React.useMemo(() => {
    const flattenTree = (
      nodes: FolderNode[],
      result: FolderNode[] = []
    ): FolderNode[] => {
      nodes.forEach((node) => {
        const matchesSearch =
          searchQuery === '' ||
          node.name.toLowerCase().includes(searchQuery.toLowerCase());

        const hasMatchingChildren = node.children.some((child) =>
          child.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (matchesSearch || hasMatchingChildren) {
          result.push(node);
          if (expandedFolders.has(node.id) || searchQuery !== '') {
            flattenTree(node.children, result);
          }
        }
      });
      return result;
    };

    return flattenTree(folderTree);
  }, [folderTree, expandedFolders, searchQuery]);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleMove = async () => {
    if (!folder || isMoving) return;

    const currentParent = folder.parentId ?? null;
    const newParent = selectedParentId;

    if (currentParent === newParent) {
      onOpenChange(false);
      return;
    }

    if (newParent !== null && !canMoveToFolder(folder.id, newParent, folders)) {
      alert('Cannot move folder to its own descendant');
      return;
    }

    setIsMoving(true);
    try {
      await onMove(folder.id, newParent);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to move folder:', error);
      setIsMoving(false);
    }
  };

  const hasChildren = (folderId: string) => {
    return folders.some((f) => f.parentId === folderId && f.id !== folder?.id);
  };

  if (!folder) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content className="bg-background fixed top-[50%] left-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-hidden rounded-lg border shadow-lg">
          {/* Header */}
          <div className="border-border flex items-center justify-between border-b p-4">
            <div className="space-y-1">
              <Dialog.Title className="text-lg font-semibold">
                Move Folder
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-sm">
                Choose a new location for{' '}
                <span className="font-bold">{folder.name}</span>.
              </Dialog.Description>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4 p-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    placeholder="Search folders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    disabled={isMoving}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Select destination</Label>
                <div className="max-h-[300px] overflow-y-auto rounded-lg border">
                  <div className="p-1">
                    <Button
                      variant={
                        selectedParentId === null ? 'secondary' : 'ghost'
                      }
                      onClick={() => setSelectedParentId(null)}
                      disabled={isMoving}
                      className="h-auto w-full justify-start gap-2 px-3 py-2 font-normal"
                    >
                      <Folder className="h-4 w-4" />
                      <span className="flex-1 text-left">Root Level</span>
                    </Button>

                    {displayFolders.map((f) => {
                      const isExpanded =
                        expandedFolders.has(f.id) || searchQuery !== '';
                      const hasChildFolders = hasChildren(f.id);
                      const isSelected = selectedParentId === f.id;
                      const isCurrentParent = f.id === folder.parentId;

                      return (
                        <Button
                          key={f.id}
                          variant={isSelected ? 'secondary' : 'ghost'}
                          onClick={() => setSelectedParentId(f.id)}
                          disabled={isMoving}
                          className="h-auto w-full justify-start gap-2 px-3 py-2 text-sm font-normal"
                          style={{ paddingLeft: `${f.level * 20 + 12}px` }}
                        >
                          {hasChildFolders && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFolder(f.id);
                              }}
                              className="hover:bg-accent-foreground/10 rounded p-0.5"
                            >
                              <ChevronRight
                                className={`h-3 w-3 ${
                                  isExpanded ? 'rotate-90' : ''
                                }`}
                              />
                            </div>
                          )}
                          {!hasChildFolders && <div className="w-4" />}

                          <div
                            className="h-4 w-4 flex-shrink-0 rounded-sm"
                            style={{ backgroundColor: f.color || '#6b7280' }}
                          />

                          <span className="flex-1 truncate text-left">
                            {f.name}
                            {isCurrentParent && (
                              <span className="text-muted-foreground ml-2 text-xs">
                                (current)
                              </span>
                            )}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleMove}
                disabled={
                  isMoving || (folder.parentId ?? null) === selectedParentId
                }
              >
                {isMoving ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Moving...
                  </>
                ) : (
                  'Move'
                )}
              </Button>
            </div>
          </div>

          <Dialog.Close asChild>
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 right-4"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
