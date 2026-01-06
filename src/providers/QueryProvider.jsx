import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - how long data is considered fresh
      staleTime: 5 * 60 * 1000, // 5 minutes
      
      // Cache time - how long to keep data in cache after it becomes unused
      cacheTime: 30 * 60 * 1000, // 30 minutes
      
      // Retry failed requests
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch on window focus
      refetchOnWindowFocus: true,
      
      // Don't refetch on mount if data is fresh
      refetchOnMount: true,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

/**
 * QueryProvider - Wraps the app with React Query context
 */
export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Export the client for use in hooks that need direct access
export { queryClient };

export default QueryProvider;
