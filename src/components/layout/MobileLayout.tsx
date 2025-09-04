import { useState } from 'react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChangeMasterPasswordDialog } from '@/components/password/ChangeMasterPasswordDialog';
import { hasMasterPassword } from '@/lib/encryption';
import FolderPanel from '@/components/folders';
import NotesPanel from '@/components/notes/NotesPanel';
import Index from '@/components/editor';
import type { Note } from '@/types/note';
import type { FolderPanelProps, FilesPanelProps, EditorProps } from '@/types/layout';

type MobileTab = 'folders' | 'notes' | 'editor';

interface MobileLayoutProps {
  selectedNote: Note | null;
  folderPanelProps: FolderPanelProps;
  filesPanelProps: FilesPanelProps;
  editorProps: EditorProps;
}

export function MobileLayout({
  selectedNote,
  folderPanelProps,
  filesPanelProps,
  editorProps,
}: MobileLayoutProps) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<MobileTab>(
    selectedNote ? 'editor' : 'folders'
  );
  const [showChangePassword, setShowChangePassword] = useState(false);

  const hasPassword = user?.id ? hasMasterPassword(user.id) : false;

  // Auto-switch to editor when note is selected
  const handleNoteSelect = (note: Note) => {
    filesPanelProps.onSelectNote(note);
    setActiveTab('editor');
  };

  const modifiedFilesPanelProps = {
    ...filesPanelProps,
    onSelectNote: handleNoteSelect,
  };
  return (
    <>
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => {
          if (value === 'editor' && !selectedNote) return;
          setActiveTab(value as MobileTab);
        }}
        className="flex h-screen flex-col"
      >
      {/* Header - only show on editor tab */}
      {activeTab === 'editor' && selectedNote && (
        <div className="border-border bg-background flex shrink-0 items-center justify-center border-b p-3">
          <div className="text-foreground truncate text-sm font-medium">
            {selectedNote.title || 'Untitled Note'}
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <TabsContent value="folders" className="h-full m-0 p-0">
          <FolderPanel isOpen={true} {...folderPanelProps} />
        </TabsContent>
        
        <TabsContent value="notes" className="h-full m-0 p-0">
          <NotesPanel isOpen={true} {...modifiedFilesPanelProps} />
        </TabsContent>
        
        <TabsContent value="editor" className="h-full m-0 p-0">
          {selectedNote ? (
            <Index {...editorProps} />
          ) : (
            <div className="flex h-full items-center justify-center text-center p-4">
              <div>
                <p className="text-muted-foreground">Select a note to start editing</p>
              </div>
            </div>
          )}
        </TabsContent>
      </div>

      {/* Bottom Tab Bar */}
      <div className="border-t bg-background p-2">
        <div className="flex items-center">
          <TabsList className="flex-1">
            <TabsTrigger value="folders" className="flex-1">
              Folders
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex-1">
              Notes
            </TabsTrigger>
            <TabsTrigger 
              value="editor" 
              className="flex-1"
              disabled={!selectedNote}
            >
              Editor
            </TabsTrigger>
          </TabsList>
          
          <div className="mx-3 h-9 w-px bg-border" />
          
          <div className="flex items-center">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                  userButtonPopoverCard: 'w-64',
                },
              }}
              afterSignOutUrl="/"
            >
              {hasPassword && (
                <UserButton.MenuItems>
                  <UserButton.Action
                    label="Change Master Password"
                    labelIcon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="3"
                          y="11"
                          width="18"
                          height="11"
                          rx="2"
                          ry="2"
                        ></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    }
                    onClick={() => setShowChangePassword(true)}
                  />
                </UserButton.MenuItems>
              )}
            </UserButton>
          </div>
        </div>
      </div>
      </Tabs>

      <ChangeMasterPasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
        onSuccess={() => {
          setShowChangePassword(false);
          window.location.reload();
        }}
      />
    </>
  );
}