import type { Movie } from './types.ts';

// Status timestamps are independent of watchingSince (the shared play countdown).
export function updateMovieActivity(previous: Movie, changes: Partial<Movie>, now = new Date().toISOString()): Movie {
  const updated = { ...previous, ...changes, dateAdded: previous.dateAdded };
  if (updated.status === previous.status) return updated;
  updated.statusChangedAt = now;
  if (updated.status === 'watching') updated.startedWatchingAt = now;
  if (updated.status === 'watched') {
    updated.lastWatchedAt = now;
    updated.watchHistory = [...(previous.watchHistory ?? []), now];
  }
  return updated;
}

export function initializeMovieActivity(movie: Movie): Movie {
  return updateMovieActivity({ ...movie, status: 'pending' }, movie, movie.dateAdded);
}

export function recordMovieWatch(movie: Movie, now = new Date().toISOString()): Movie {
  return { ...movie, lastWatchedAt: now, watchHistory: [...(movie.watchHistory ?? []), now] };
}

export function formatActivityDate(value?: string, compact = false): string {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'Sin fecha registrada';
  return new Intl.DateTimeFormat('es-PE', compact
    ? { day: '2-digit', month: 'short', year: 'numeric' }
    : { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  ).format(new Date(value));
}
