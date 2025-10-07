import { useRouter } from 'expo-router';
import FoldersScreen from '@/src/screens/FoldersScreen';

export default function HomeScreen() {
  const router = useRouter();

  // Create navigation object that pushes to new screens
  const navigation = {
    navigate: (screen: string, params?: any) => {
      console.log(`Navigate to ${screen} with params:`, params);
      if (screen === 'Notes') {
        // Navigate to a new notes screen as a modal or pushed screen
        const queryParams = new URLSearchParams();
        if (params?.folderId) queryParams.append('folderId', params.folderId);
        if (params?.folderName) queryParams.append('folderName', params.folderName);
        if (params?.viewType) queryParams.append('viewType', params.viewType);

        const queryString = queryParams.toString();
        const path = queryString ? `/folder-notes?${queryString}` : '/folder-notes';
        router.push(path as any);
      } else if (screen === 'Settings') {
        router.push('/settings');
      }
    }
  };

  return <FoldersScreen navigation={navigation} />;
}