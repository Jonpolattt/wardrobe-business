import { ApolloClient, ApolloLink, CombinedGraphQLErrors, HttpLink, InMemoryCache } from '@apollo/client';
import { ErrorLink } from '@apollo/client/link/error';
import { SetContextLink } from '@apollo/client/link/context';
import { from, switchMap, throwError } from 'rxjs';
import { refreshAccessToken } from '../auth/session';
import { useAuthStore } from '../store/auth-store';

const isUnauthenticated = (error: unknown) =>
  CombinedGraphQLErrors.is(error) && error.errors.some((e) => e.extensions?.code === 'UNAUTHENTICATED');

/** Adds the in-memory access token to every request. */
const authLink = new SetContextLink((prev) => {
  const token = useAuthStore.getState().accessToken;
  return { headers: { ...prev.headers, ...(token ? { authorization: `Bearer ${token}` } : {}) } };
});

/** On UNAUTHENTICATED: refresh the access token once and retry the operation. */
const refreshLink = new ErrorLink(({ error, operation, forward }) => {
  if (!isUnauthenticated(error) || operation.getContext().retried) return;
  return from(refreshAccessToken()).pipe(
    switchMap((ok) => {
      if (!ok) return throwError(() => error);
      const token = useAuthStore.getState().accessToken;
      operation.setContext(({ headers = {} }: { headers?: Record<string, string> }) => ({
        retried: true,
        headers: { ...headers, authorization: `Bearer ${token}` },
      }));
      return forward(operation);
    }),
  );
});

const httpLink = new HttpLink({ uri: '/graphql', credentials: 'same-origin' });

export function makeApolloClient() {
  return new ApolloClient({
    link: ApolloLink.from([refreshLink, authLink, httpLink]),
    cache: new InMemoryCache({
      typePolicies: {
        Query: { fields: { purchases: { merge: false }, batches: { merge: false }, expenses: { merge: false }, activity: { merge: false } } },
        Purchase: { keyFields: ['id'] },
        Batch: { keyFields: ['id'] },
      },
    }),
    defaultOptions: { watchQuery: { fetchPolicy: 'cache-and-network' } },
  });
}
