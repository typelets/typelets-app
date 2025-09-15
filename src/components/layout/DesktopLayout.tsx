import FolderPanel from '@/components/folders';
import NotesPanel from '@/components/notes/NotesPanel';
import Index from '@/components/editor';
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
}

export function DesktopLayout({
  folderSidebarOpen,
  filesPanelOpen,
  folderPanelProps,
  filesPanelProps,
  editorProps,
}: DesktopLayoutProps) {
  return (
    <div className="bg-background flex h-screen">
      <FolderPanel isOpen={folderSidebarOpen} {...folderPanelProps} />
      <NotesPanel isOpen={filesPanelOpen} {...filesPanelProps} />
      <div className="flex flex-1 flex-col">
        <main className="flex-1 overflow-hidden">
          <Index {...editorProps} />
        </main>
      </div>
    </div>
  );
}
