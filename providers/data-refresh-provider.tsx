import { createContext, useContext, useCallback, useState, ReactNode } from 'react';

type RefreshKey = 'items' | 'checkouts' | 'item-detail' | 'all';

interface DataRefreshContextType {
  refresh: (key?: RefreshKey) => void;
  refreshKey: number;
  subscribe: (callback: () => void) => () => void;
}

const DataRefreshContext = createContext<DataRefreshContextType | undefined>(undefined);

export function DataRefreshProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [subscribers, setSubscribers] = useState<Set<() => void>>(new Set());

  const refresh = useCallback((key: RefreshKey = 'all') => {
    // Increment refresh key to trigger re-renders
    setRefreshKey((prev) => prev + 1);
    
    // Notify all subscribers
    subscribers.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('Error in refresh subscriber:', error);
      }
    });
  }, [subscribers]);

  const subscribe = useCallback((callback: () => void) => {
    setSubscribers((prev) => {
      const next = new Set(prev);
      next.add(callback);
      return next;
    });

    // Return unsubscribe function
    return () => {
      setSubscribers((prev) => {
        const next = new Set(prev);
        next.delete(callback);
        return next;
      });
    };
  }, []);

  return (
    <DataRefreshContext.Provider value={{ refresh, refreshKey, subscribe }}>
      {children}
    </DataRefreshContext.Provider>
  );
}

export function useDataRefresh() {
  const context = useContext(DataRefreshContext);
  if (!context) {
    throw new Error('useDataRefresh must be used within DataRefreshProvider');
  }
  return context;
}
