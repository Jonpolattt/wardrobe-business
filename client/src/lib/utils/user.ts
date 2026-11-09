import type { SessionUser } from '../store/auth-store';

/** Name, initial and photo exactly as the original interface showed them. */
export function userDisplay(user: SessionUser | null) {
  const firstName = user?.firstName ?? '';
  const lastName = user?.lastName ?? '';
  return {
    fullName: (lastName + ' ' + firstName).trim() || '—',
    initial: (firstName || lastName || user?.email || '?').charAt(0).toUpperCase(),
    photo: user?.photoUrl ?? '',
  };
}
