import { useEffect } from 'react';
import FolderPanel from '@/components/folders';
import NotesPanel from '@/components/notes/NotesPanel';
import Index from '@/components/editor';
import { TabBar, type Tab } from './TabBar';
import type {
  FolderPanelProps,
  FilesPanelProps,
  EditorProps,
} from '@/types/layout';

interface DesktopLayoutProps {
  folderSidebarOpen: boolean;
  filesPanelOpen: boolean;
  folderPanelProps: FolderPanelProps;
  filesPanelProps: FilesPanelProps;
  editorProps: EditorProps;
  openTabs: Tab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
}

export function DesktopLayout({
  folderSidebarOpen,
  filesPanelOpen,
  folderPanelProps,
  filesPanelProps,
  editorProps,
  openTabs,
  activeTabId,
  onTabClick,
  onTabClose,
}: DesktopLayoutProps) {
  // Keyboard shortcuts for tab management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+W or Cmd+W: Close current tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'w' && !e.shiftKey) {
        if (activeTabId && openTabs.length > 0) {
          e.preventDefault();
          onTabClose(activeTabId);
        }
      }

      // Ctrl+Tab or Cmd+Tab: Switch to next tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && !e.shiftKey) {
        if (openTabs.length > 1 && activeTabId) {
          e.preventDefault();
          const currentIndex = openTabs.findIndex(tab => tab.id === activeTabId);
          const nextIndex = (currentIndex + 1) % openTabs.length;
          onTabClick(openTabs[nextIndex].id);
        }
      }

      // Ctrl+Shift+Tab or Cmd+Shift+Tab: Switch to previous tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && e.shiftKey) {
        if (openTabs.length > 1 && activeTabId) {
          e.preventDefault();
          const currentIndex = openTabs.findIndex(tab => tab.id === activeTabId);
          const prevIndex = (currentIndex - 1 + openTabs.length) % openTabs.length;
          onTabClick(openTabs[prevIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openTabs, activeTabId, onTabClick, onTabClose]);

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <FolderPanel isOpen={folderSidebarOpen} {...folderPanelProps} />
      <NotesPanel isOpen={filesPanelOpen} {...filesPanelProps} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TabBar
          tabs={openTabs}
          activeTabId={activeTabId}
          onTabClick={onTabClick}
          onTabClose={onTabClose}
        />
        <main className="flex-1 overflow-hidden">
          <Index {...editorProps} />
        </main>
      </div>
    </div>
  );
}
