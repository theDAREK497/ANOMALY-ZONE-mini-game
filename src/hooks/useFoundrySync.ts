import { useEffect, useState, useCallback } from 'react';

export function useFoundrySync<T>(state: T, setState: (state: T | ((prev: T) => T)) => void, actionType: string) {
  const [isGM, setIsGM] = useState(false);
  const [username, setUsername] = useState('');

  // Отправка в Foundry
  const broadcast = useCallback((payload: T) => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ source: 'anomaly-zone', action: actionType, payload }, '*');
    }
  }, [actionType]);

  // Прием из Foundry
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.source === 'foundry') {
        const { action, payload } = event.data;
        if (action === actionType) {
          setState(payload);
        } else if (action === 'SET_ROLE') {
          setIsGM(payload.isGM);
          setUsername(payload.username);
        }
      }
    };
    window.addEventListener('message', handleMessage);

    // Request role on mount
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ source: 'anomaly-zone', action: 'REQUEST_ROLE', payload: null }, '*');
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [actionType, setState]);

  return { broadcast, isGM, username };
}
