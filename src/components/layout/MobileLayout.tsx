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
              <UserButton.MenuItems>
                <UserButton.Action
                  label="Typelets Open Source"
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
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                    </svg>
                  }
                  onClick={() => window.open('https://github.com/typelets/typelets-app', '_blank')}
                />
                <UserButton.Action
                  label="Support"
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
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <path d="M12 17h.01"></path>
                      <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                  }
                  onClick={() => window.open('https://github.com/typelets/typelets-app/issues', '_blank')}
                />
                {hasPassword && (
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
                )}
              </UserButton.MenuItems>
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