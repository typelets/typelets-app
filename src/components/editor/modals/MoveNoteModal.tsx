import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Folder, ChevronRight, Search } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Folder as FolderType } from '@/types/note';

interface MoveNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (folderId: string | null) => void;
  folders: FolderType[];
  currentFolderId: string | null;
  noteTitle: string;
}

interface FolderNode extends FolderType {
  children: FolderNode[];
  level: number;
}

export default function MoveNoteModal({
                                        isOpen,
                                        onClose,
                                        onMove,
                                        folders,
                                        currentFolderId,
                                        noteTitle,
                                      }: MoveNoteModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedFolderId(null);
      setSearchQuery('');
      setIsMoving(false);
      // Focus search input after modal opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Build folder tree structure
  const folderTree = useMemo(() => {
    const buildTree = (parentId: string | null = null, level = 0): FolderNode[] => {
      return folders
        .filter(f => f.parentId === parentId)
        .map(folder => ({
          ...folder,
          level,
          children: buildTree(folder.id, level + 1),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    };

    return buildTree();
  }, [folders]);

  // Flatten tree for display with search filtering
  const displayFolders = useMemo(() => {
    const flattenTree = (nodes: FolderNode[], result: FolderNode[] = []): FolderNode[] => {
      nodes.forEach(node => {
        // Apply search filter
        const matchesSearch = searchQuery === '' ||
          node.name.toLowerCase().includes(searchQuery.toLowerCase());

        const hasMatchingChildren = node.children.some(child =>
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
    if (isMoving) return;

    setIsMoving(true);
    try {
      onMove(selectedFolderId);
      onClose();
    } catch (error) {
      console.error('Failed to move note:', error);
    } finally {
      setIsMoving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedFolderId !== undefined) {
      e.preventDefault();
      handleMove();
    }
  };

  const hasChildren = (folderId: string) => {
    return folders.some(f => f.parentId === folderId);
  };

  const getSelectedFolderName = () => {
    if (selectedFolderId === null) return 'No Folder (Root)';
    return folders.find(f => f.id === selectedFolderId)?.name || '';
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            Move Note
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Note being moved */}
          <div className="bg-accent rounded-lg p-3">
            <div className="text-muted-foreground text-sm">Moving note:</div>
            <div className="font-medium truncate">{noteTitle || 'Untitled Note'}</div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
              disabled={isMoving}
            />
          </div>

          {/* Folder Tree */}
          <div className="border rounded-lg max-h-[300px] overflow-y-auto">
            <div className="p-1">
              {/* Root level option */}
              <button
                onClick={() => setSelectedFolderId(null)}
                disabled={isMoving}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-50 ${
                  selectedFolderId === null ? 'bg-accent' : ''
                }`}
              >
                <Folder className="h-4 w-4" />
                <span className="flex-1 text-left">No Folder (Root)</span>
              </button>

              {/* Folder list */}
              {displayFolders.length === 0 && searchQuery && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No folders found matching "{searchQuery}"
                </div>
              )}

              {displayFolders.map((folder) => {
                const isExpanded = expandedFolders.has(folder.id) || searchQuery !== '';
                const hasChildFolders = hasChildren(folder.id);
                const isSelected = selectedFolderId === folder.id;
                const isCurrentFolder = folder.id === currentFolderId;

                return (
                  <button
                    key={folder.id}
                    onClick={() => !isCurrentFolder && setSelectedFolderId(folder.id)}
                    disabled={isCurrentFolder || isMoving}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected ? 'bg-accent' : ''
                    }`}
                    style={{ paddingLeft: `${folder.level * 20 + 12}px` }}
                  >
                    {hasChildFolders && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFolder(folder.id);
                        }}
                        className="p-0.5 hover:bg-accent-foreground/10 rounded"
                      >
                        <ChevronRight
                          className={`h-3 w-3 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </div>
                    )}
                    {!hasChildFolders && <div className="w-4" />}

                    <div
                      className="h-4 w-4 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: folder.color || '#6b7280' }}
                    />

                    <span className="flex-1 text-left truncate">
                      {folder.name}
                      {isCurrentFolder && (
                        <span className="ml-2 text-xs text-muted-foreground">(current)</span>
                      )}
                    </span>
                  </button>
                );
              })}

              {folders.length === 0 && !searchQuery && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No folders available. Create a folder first.
                </div>
              )}
            </div>
          </div>

          {/* Selected folder preview */}
          {selectedFolderId !== undefined && (
            <div className="bg-accent rounded-lg p-3">
              <div className="text-muted-foreground text-sm">Moving to:</div>
              <div className="font-medium flex items-center gap-2">
                {selectedFolderId && (
                  <div
                    className="h-3 w-3 rounded-sm flex-shrink-0"
                    style={{
                      backgroundColor: folders.find(f => f.id === selectedFolderId)?.color || '#6b7280'
                    }}
                  />
                )}
                {getSelectedFolderName()}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isMoving}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMove}
              disabled={selectedFolderId === undefined || isMoving}
              className="flex-1"
            >
              {isMoving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Moving...
                </>
              ) : (
                <>
                  Move Note
                </>
              )}
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
