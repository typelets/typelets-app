import { useState } from 'react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { Menu, X } from 'lucide-react';
import { ChangeMasterPasswordDialog } from '@/components/password/ChangeMasterPasswordDialog';
import { MobileAppBanner } from '@/components/common/MobileAppBanner';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { hasMasterPassword } from '@/lib/encryption';
import { APP_VERSION } from '@/constants/version';
import { useVersionNotification } from '@/hooks/useVersionNotification';
import FolderPanel from '@/components/folders';
import NotesPanel from '@/components/notes/NotesPanel';
import Index from '@/components/editor';
import type { Note } from '@/types/note';
import type {
  FolderPanelProps,
  FilesPanelProps,
  EditorProps,
} from '@/types/layout';

type MobileView = 'folders' | 'notes' | 'editor';

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
  const { hasNewVersion, markVersionAsSeen } = useVersionNotification();
  const [currentView, setCurrentView] = useState<MobileView>(
    selectedNote ? 'editor' : 'folders'
  );
  const [showSidebar, setShowSidebar] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const hasPassword = user?.id ? hasMasterPassword(user.id) : false;

  // Auto-switch to editor when note is selected
  const handleNoteSelect = (note: Note) => {
    filesPanelProps.onSelectNote(note);
    setCurrentView('editor');
    setShowSidebar(false);
  };

  const handleViewChange = (view: MobileView) => {
    setCurrentView(view);
    setShowSidebar(false);
  };

  const modifiedFilesPanelProps = {
    ...filesPanelProps,
    onSelectNote: handleNoteSelect,
  };
  const getViewTitle = () => {
    switch (currentView) {
      case 'folders':
        return 'Folders';
      case 'notes':
        return 'Notes';
      case 'editor':
        return selectedNote?.title || 'Editor';
      default:
        return 'Typelets';
    }
  };

  return (
    <>
      <MobileAppBanner />
      <div className="bg-background flex h-screen flex-col">
        {/* Header */}
        <div className="bg-background border-b p-3">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(true)}
              className="mr-3 h-9 w-9 p-0"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <h1 className="text-foreground flex-1 truncate text-lg font-semibold">
              {getViewTitle()}
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {currentView === 'folders' && (
            <FolderPanel isOpen={true} {...folderPanelProps} />
          )}

          {currentView === 'notes' && (
            <NotesPanel isOpen={true} {...modifiedFilesPanelProps} />
          )}

          {currentView === 'editor' &&
            (selectedNote ? (
              <Index {...editorProps} />
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center">
                <div>
                  <p className="text-muted-foreground">
                    Select a note to start editing
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Sidebar Overlay */}
      {showSidebar && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <div
        className={`bg-background fixed top-0 left-0 z-50 h-full w-80 border-r shadow-lg transition-transform duration-300 ease-in-out ${
          showSidebar ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Typelets</h2>
              <div className="text-muted-foreground text-xs opacity-80">
                v{APP_VERSION}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-4">
          <div
            className={`w-full cursor-pointer rounded-lg p-4 text-left transition-colors ${
              currentView === 'folders'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent hover:text-accent-foreground'
            }`}
            onClick={() => handleViewChange('folders')}
          >
            <div className="font-medium">Folders</div>
          </div>

          <div
            className={`w-full cursor-pointer rounded-lg p-4 text-left transition-colors ${
              currentView === 'notes'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent hover:text-accent-foreground'
            }`}
            onClick={() => handleViewChange('notes')}
          >
            <div className="font-medium">Notes</div>
          </div>

          <div
            className={`w-full cursor-pointer rounded-lg p-4 text-left transition-colors ${
              !selectedNote
                ? 'cursor-not-allowed opacity-50'
                : currentView === 'editor'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
            }`}
            onClick={() => selectedNote && handleViewChange('editor')}
          >
            <div className="font-medium">Editor</div>
          </div>
        </div>

        {/* User Section */}
        <div className="absolute right-0 bottom-0 left-0 border-t p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'w-10 h-10',
                      userButtonPopoverCard: 'w-64',
                    },
                  }}
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
                    onClick={() =>
                      window.open(
                        'https://github.com/typelets/typelets-app',
                        '_blank'
                      )
                    }
                  />
                  <UserButton.Action
                    label="What's New"
                    labelIcon={
                      <div className="relative">
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
                          <path d="M8 2v4" />
                          <path d="M16 2v4" />
                          <rect width="18" height="18" x="3" y="4" rx="2" />
                          <path d="M3 10h18" />
                          <path d="m9 16 2 2 4-4" />
                        </svg>
                        {hasNewVersion && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                        )}
                      </div>
                    }
                    onClick={() => {
                      markVersionAsSeen();
                      window.open(
                        'https://github.com/typelets/typelets-app/blob/main/CHANGELOG.md',
                        '_blank'
                      );
                    }}
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
                    onClick={() =>
                      window.open(
                        'https://typelets.com/support',
                        '_blank'
                      )
                    }
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
              {hasNewVersion && (
                <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-background" />
              )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-foreground truncate text-sm font-medium">
                  {user?.fullName ??
                    user?.firstName ??
                    user?.emailAddresses[0]?.emailAddress}
                </div>
                <div className="text-muted-foreground text-xs">
                  Tap avatar for settings
                </div>
              </div>
            </div>

            <ThemeToggle />
          </div>
        </div>
      </div>

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
