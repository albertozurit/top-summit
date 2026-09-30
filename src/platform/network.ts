import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/** `null` mientras no se sabe. Solo informa a la UI: el mapa nunca depende de la red. */
export function useIsOnline(): boolean | null {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(
    () =>
      NetInfo.addEventListener((state) => {
        setOnline(state.isConnected === true && state.isInternetReachable !== false);
      }),
    [],
  );
  return online;
}
