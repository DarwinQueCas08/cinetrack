import test from 'node:test';
import assert from 'node:assert/strict';
import { updateMovieActivity, initializeMovieActivity, recordMovieWatch, formatActivityDate } from '../src/app/movieActivity.ts';

const added = '2026-10-01T16:00:00.000Z';
const started = '2026-10-03T17:00:00.000Z';
const finished = '2026-10-04T19:00:00.000Z';
const again = '2026-10-11T18:00:00.000Z';
const movie = { id: '1', type: 'movie', title: 'Ejemplo', year: null, poster: null, overview: '', genres: [], platform: '', status: 'pending', rating: 0, notes: '', dateAdded: added };

test('records watching and completion dates without changing the added date or shared countdown', () => {
  const watching = updateMovieActivity(movie, { status: 'watching' }, started);
  const watched = updateMovieActivity(watching, { status: 'watched' }, finished);
  assert.equal(watched.dateAdded, added);
  assert.equal(watched.startedWatchingAt, started);
  assert.equal(watched.lastWatchedAt, finished);
  assert.equal(watched.statusChangedAt, finished);
  assert.deepEqual(watched.watchHistory, [finished]);
  assert.equal(watched.watchingSince, undefined);
  assert.equal(movie.startedWatchingAt, undefined);
});

test('notes, ratings and repeated status saves do not add a viewing or reset dates', () => {
  const watched = updateMovieActivity(movie, { status: 'watched' }, finished);
  const edited = updateMovieActivity(watched, { status: 'watched', rating: 5, notes: 'Muy buena', dateAdded: again }, again);
  assert.equal(edited.lastWatchedAt, finished);
  assert.equal(edited.statusChangedAt, finished);
  assert.equal(edited.dateAdded, added);
  assert.deepEqual(edited.watchHistory, [finished]);
});

test('rewatching preserves previous dates and appends to history', () => {
  const watched = updateMovieActivity(movie, { status: 'watched' }, finished);
  const pending = updateMovieActivity(watched, { status: 'pending' }, again);
  assert.equal(pending.lastWatchedAt, finished);
  const rewatched = updateMovieActivity(pending, { status: 'watched' }, again);
  assert.deepEqual(rewatched.watchHistory, [finished, again]);
  const recorded = recordMovieWatch(watched, again);
  assert.equal(recorded.status, 'watched');
  assert.equal(recorded.lastWatchedAt, again);
  assert.deepEqual(recorded.watchHistory, [finished, again]);
  assert.deepEqual(watched.watchHistory, [finished]);
});

test('does not invent completion dates for old watched records', () => {
  const legacy = { ...movie, status: 'watched' };
  const edited = updateMovieActivity(legacy, { notes: 'Antigua' }, again);
  assert.equal(edited.lastWatchedAt, undefined);
  assert.equal(edited.watchHistory, undefined);
  assert.equal(formatActivityDate(edited.lastWatchedAt), 'Sin fecha registrada');
  assert.equal(formatActivityDate('invalid'), 'Sin fecha registrada');
});

test('new manually added watched/watching records get dates and survive JSON persistence', () => {
  const watched = initializeMovieActivity({ ...movie, status: 'watched' });
  assert.equal(watched.lastWatchedAt, added);
  const watching = initializeMovieActivity({ ...movie, status: 'watching' });
  assert.equal(watching.startedWatchingAt, added);
  assert.equal(initializeMovieActivity(movie).lastWatchedAt, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(watched)), watched);
});
