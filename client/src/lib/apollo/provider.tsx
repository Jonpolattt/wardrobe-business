'use client';

import { ApolloProvider } from '@apollo/client/react';
import { useState, type ReactNode } from 'react';
import { makeApolloClient } from './client';

export function AppApolloProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeApolloClient);
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
