import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { createAppQueryClient } from './queryClient.js';

export function AppQueryProvider({ children, client }) {
  const [defaultClient] = useState(createAppQueryClient);
  return (
    <QueryClientProvider client={client ?? defaultClient}>
      {children}
    </QueryClientProvider>
  );
}
