import { useLocalSearchParams } from 'expo-router';

import SearchScreen from '@/src/screens/Search';

export default function SearchRoute() {
  const params = useLocalSearchParams();

  return (
    <SearchScreen
      initialQuery={params.query as string | undefined}
    />
  );
}
