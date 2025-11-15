import { useLocalSearchParams } from 'expo-router';

import FolderNotesScreen from '@/src/screens/FolderNotes';

export default function FolderNotesRoute() {
  const params = useLocalSearchParams();

  return (
    <FolderNotesScreen
      folderId={params.folderId as string | undefined}
      folderName={params.folderName as string | undefined}
      viewType={params.viewType as 'all' | 'starred' | 'archived' | 'trash' | undefined}
    />
  );
}
