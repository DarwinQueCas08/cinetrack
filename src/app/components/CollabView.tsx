import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Copy, Check, LogOut, Search, Trash2, Users, Crown, Wifi, WifiOff, X, Star, Plus, Key, ExternalLink, Loader2, Film, Tv, Shuffle } from 'lucide-react';
import { Movie, MovieStatus, ContentType, TMDBMovie, TMDBSeries, TMDB_GENRES, SERIES_STATUS_MAP } from '../types';
import { MovieCard } from './MovieCard';
import { MovieModal } from './MovieModal';
import { MovieDetailModal } from './MovieDetailModal';
import { ConfirmDialog } from './ConfirmDialog';
import { RandomPicker } from './RandomPicker';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-da14cc3d`;
const HEADERS = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };
const POLL_MS = 5000;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w300';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const API_KEY_STORAGE = 'cinetrack_tmdb_key';
const DEFAULT_TMDB_KEY = '49c3918c2a3724e91d3ac9e4cc61cda7';

interface RoomData {
  roomId: string;
  name: string;
  movies: Movie[];
  members: string[];
  ownerName: string;
  updatedAt: string;
}

type SearchType = 'movie' | 'series';
type TMDBItem = TMDBMovie | TMDBSeries;
function isSeries(item: TMDBItem): item is TMDBSeries { return 'name' in item; }

// --- TMDB cache helpers ---
interface CacheEntry { results: TMDBItem[]; ts: number }
function readCache(key: string): TMDBItem[] | null {
  try {
    const raw = localStorage.getItem(`tmdb_cache:${key}`);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) { localStorage.removeItem(`tmdb_cache:${key}`); return null; }
    return entry.results;
  } catch { return null; }
}
function writeCache(key: string, results: TMDBItem[]) {
  try { localStorage.setItem(`tmdb_cache:${key}`, JSON.stringify({ results, ts: Date.now() })); } catch { }
}

interface CollabViewProps {
  roomId: string;
  ownerKey: string | null;
  memberName: string;
  apiKey: string;
  onLeave: () => void;
}

export function CollabView({ roomId, ownerKey, memberName, apiKey: initialApiKey, onLeave }: CollabViewProps) {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [detailMovie, setDetailMovie] = useState<Movie | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showRandom, setShowRandom] = useState(false);
  const [filterStatus, setFilterStatus] = useState<MovieStatus | 'all'>('all');
  const lastUpdatedRef = useRef<string>('');
  const isOwner = !!ownerKey;

  // TMDB search state
  const [apiKey, setApiKey] = useState(initialApiKey || localStorage.getItem(API_KEY_STORAGE) || DEFAULT_TMDB_KEY);
  const [searchType, setSearchType] = useState<SearchType>('movie');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const saveApiKey = (k: string) => {
    setApiKey(k);
    localStorage.setItem(API_KEY_STORAGE, k);
  };

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(searchQuery.trim()), 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, apiKey, searchType]);

  const doSearch = async (q: string) => {
    if (!apiKey) { setSearchError('Agrega tu API Key de TMDB para buscar.'); return; }
    const cacheKey = `${searchType}:${q}`;
    const cached = readCache(cacheKey);
    if (cached) { setSearchResults(cached); setSearchError(''); return; }
    setSearching(true); setSearchError('');
    try {
      const endpoint = searchType === 'movie' ? 'search/movie' : 'search/tv';
      const res = await fetch(`${TMDB_BASE}/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(q)}&language=es-ES`);
      if (res.status === 401) throw new Error('API Key inválida.');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const list: TMDBItem[] = data.results?.slice(0, 8) ?? [];
      writeCache(cacheKey, list);
      setSearchResults(list);
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : 'Error al buscar.');
    } finally { setSearching(false); }
  };

  const fetchRoom = useCallback(async (silent = false) => {
    if (!silent) setSyncing(true);
    try {
      const res = await fetch(`${SERVER}/rooms/${roomId}`, { headers: HEADERS });
      if (!res.ok) throw new Error('Error al cargar sala');
      const data: RoomData = await res.json();
      if (data.updatedAt !== lastUpdatedRef.current) {
        lastUpdatedRef.current = data.updatedAt;
        setRoom(data);
        if (!data.members?.includes(memberName)) {
          await pushUpdate(data.movies, memberName);
        }
      }
      setOnline(true); setError('');
    } catch (e: unknown) {
      setOnline(false);
      if (!silent) setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { setSyncing(false); setLoading(false); }
  }, [roomId, memberName]);

  const pushUpdate = async (movies: Movie[], mName?: string) => {
    const body: Record<string, unknown> = { movies, memberName: mName ?? memberName };
    if (ownerKey) body.ownerKey = ownerKey;
    const res = await fetch(`${SERVER}/rooms/${roomId}`, { method: 'PUT', headers: HEADERS, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('Error al sincronizar');
    const updated: RoomData = await res.json();
    lastUpdatedRef.current = updated.updatedAt;
    setRoom(updated);
    return updated;
  };

  useEffect(() => { fetchRoom(false); }, [fetchRoom]);
  useEffect(() => {
    const interval = setInterval(() => fetchRoom(true), POLL_MS);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  const fetchProviders = async (tmdbId: number, type: ContentType): Promise<string[]> => {
    if (!apiKey) return [];
    try {
      const endpoint = type === 'movie' ? `movie/${tmdbId}` : `tv/${tmdbId}`;
      const res = await fetch(`${TMDB_BASE}/${endpoint}/watch/providers?api_key=${apiKey}`);
      if (!res.ok) return [];
      const data = await res.json();
      const regions = ['MX', 'ES', 'CO', 'AR', 'CL', 'PE', 'US'];
      const seen = new Set<string>(); const platforms: string[] = [];
      for (const region of regions) {
        for (const s of data.results?.[region]?.flatrate ?? []) {
          if (!seen.has(s.provider_name)) { seen.add(s.provider_name); platforms.push(s.provider_name); }
        }
      }
      return platforms;
    } catch { return []; }
  };

  const fetchSeriesDetails = async (tmdbId: number): Promise<{ seasons: number; episodes: number; seriesStatus: string }> => {
    if (!apiKey) return { seasons: 0, episodes: 0, seriesStatus: '' };
    try {
      const res = await fetch(`${TMDB_BASE}/tv/${tmdbId}?api_key=${apiKey}&language=es-ES`);
      if (!res.ok) return { seasons: 0, episodes: 0, seriesStatus: '' };
      const data = await res.json();
      return {
        seasons: data.number_of_seasons ?? 0,
        episodes: data.number_of_episodes ?? 0,
        seriesStatus: SERIES_STATUS_MAP[data.status] ?? data.status ?? '',
      };
    } catch { return { seasons: 0, episodes: 0, seriesStatus: '' }; }
  };

  const addFromTMDB = async (item: TMDBItem) => {
    if (!room) return;
    const already = room.movies.some(x => x.tmdbId === item.id);
    if (already) return;
    const type: ContentType = isSeries(item) ? 'series' : 'movie';
    const title = isSeries(item) ? item.name : (item as TMDBMovie).title;
    const dateStr = isSeries(item) ? item.first_air_date : (item as TMDBMovie).release_date;
    const genres = item.genre_ids.map(id => TMDB_GENRES[id]).filter(Boolean);
    const streamingPlatforms = await fetchProviders(item.id, type);

    let seriesExtras = {};
    if (type === 'series') {
      const details = await fetchSeriesDetails(item.id);
      seriesExtras = {
        seasons: details.seasons || (item as TMDBSeries).number_of_seasons || 0,
        episodes: details.episodes,
        seriesStatus: details.seriesStatus,
        currentSeason: 1,
      };
    }

    const movie: Movie = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      type,
      title,
      year: dateStr ? parseInt(dateStr.slice(0, 4)) : null,
      poster: item.poster_path ? `${POSTER_BASE}${item.poster_path}` : null,
      overview: item.overview,
      genres,
      platform: '',
      streamingPlatforms,
      status: 'pending',
      rating: 0,
      notes: '',
      tmdbId: item.id,
      dateAdded: new Date().toISOString(),
      ...seriesExtras,
    };
    try {
      await pushUpdate([movie, ...room.movies]);
      setSearchQuery('');
      setSearchResults([]);
      setShowSearch(false);
    } catch { setError('Error al agregar.'); }
  };

  const handleEditSave = async (data: Omit<Movie, 'id' | 'dateAdded'> & { id?: string; dateAdded?: string }) => {
    if (!room || !data.id) return;
    const movies = room.movies.map(m => m.id === data.id ? { ...m, ...data } as Movie : m);
    try {
      await pushUpdate(movies);
    } catch { setError('Error al guardar cambios.'); }
    setEditingMovie(null);
  };

  const handleDeleteMovie = async (movieId: string) => {
    if (!room || !isOwner) return;
    setConfirmDelete(movieId);
  };

  const confirmDeleteMovie = async (movieId: string) => {
    setConfirmDelete(null);
    if (!room) return;
    try {
      const res = await fetch(`${SERVER}/rooms/${roomId}/movies/${movieId}`, {
        method: 'DELETE',
        headers: { ...HEADERS, 'x-owner-key': ownerKey! },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? `Error ${res.status}`);
      }
      const updated: RoomData = await res.json();
      lastUpdatedRef.current = updated.updatedAt;
      setRoom(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar.');
    }
  };

  const handleStatusChange = async (id: string, status: MovieStatus) => {
    if (!room) return;
    const movies = room.movies.map(m => m.id === id ? { ...m, status } : m);
    try { await pushUpdate(movies); } catch { }
  };

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(roomId); } catch { }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const roomMovieIds = new Set(room?.movies.map(m => m.tmdbId).filter(Boolean).map(String));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw size={24} className="animate-spin mb-3" style={{ color: '#7C3AED' }} />
        <p style={{ fontSize: '14px', color: '#6B7280' }}>Conectando a la sala...</p>
      </div>
    );
  }

  const counts = {
    all: room?.movies.length || 0,
    pending: room?.movies.filter(m => m.status === 'pending').length || 0,
    watching: room?.movies.filter(m => m.status === 'watching').length || 0,
    watched: room?.movies.filter(m => m.status === 'watched').length || 0,
  };

  const filteredMovies = room?.movies.filter(m => filterStatus === 'all' || m.status === filterStatus) || [];

  if (!room && error) {
    return (
      <div className="text-center py-16">
        <p style={{ fontSize: '15px', fontWeight: 500, color: '#EF4444' }} className="mb-2">{error}</p>
        <button onClick={onLeave} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600" style={{ fontSize: '13px' }}>Salir</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Room header */}
      <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#DDD6FE' }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }} className="truncate">{room?.name}</h2>
              {isOwner && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ fontSize: '10px', fontWeight: 600, background: '#FFF7ED', color: '#EA580C' }}>
                  <Crown size={9} /> Propietario
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-gray-300'}`} />
              <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                {online ? `Sync · cada ${POLL_MS / 1000}s` : 'Sin conexión'}
              </span>
              {syncing && <RefreshCw size={10} className="animate-spin" style={{ color: '#7C3AED' }} />}
              {online ? <Wifi size={11} style={{ color: '#10B981' }} /> : <WifiOff size={11} style={{ color: '#9CA3AF' }} />}
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => fetchRoom(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors" style={{ color: '#9CA3AF' }} title="Actualizar">
              <RefreshCw size={14} />
            </button>
            <button onClick={onLeave} className="p-2 rounded-xl hover:bg-red-50 transition-colors" style={{ color: '#9CA3AF' }} title="Salir">
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* Room code */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl mb-3" style={{ background: '#F5F3FF' }}>
          <div className="flex-1">
            <p style={{ fontSize: '10px', fontWeight: 600, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Código de sala</p>
            <p style={{ fontSize: '20px', fontWeight: 800, color: '#5B21B6', letterSpacing: '0.15em', fontFamily: 'monospace' }}>{roomId}</p>
          </div>
          <button onClick={copyCode} className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all"
            style={{ fontSize: '12px', fontWeight: 600, background: copied ? '#10B981' : '#7C3AED', color: 'white' }}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? '¡Copiado!' : 'Copiar'}
          </button>
        </div>

        {/* Members */}
        {room?.members && room.members.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Users size={12} style={{ color: '#9CA3AF' }} />
            {room.members.map(m => (
              <span key={m} className="px-2 py-0.5 rounded-full"
                style={{
                  fontSize: '11px', fontWeight: 500,
                  background: m === memberName ? '#F5F3FF' : '#F3F4F6',
                  color: m === memberName ? '#7C3AED' : '#6B7280',
                  border: m === memberName ? '1px solid #DDD6FE' : '1px solid transparent',
                }}>
                {m === room.ownerName ? `${m} 👑` : m}{m === memberName ? ' (tú)' : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ background: '#FEF2F2', color: '#DC2626', fontSize: '12px' }}>
          {error}
          <button onClick={() => setError('')}><X size={13} /></button>
        </div>
      )}

      {/* Add — TMDB search */}
      {!showSearch ? (
        <div className="flex gap-2">
          <button
            onClick={() => setShowSearch(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed transition-colors hover:border-violet-400 hover:bg-violet-50"
            style={{ borderColor: '#DDD6FE', color: '#7C3AED' }}
          >
            <Search size={15} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Buscar y agregar</span>
          </button>
          
          <button
            onClick={() => setShowRandom(true)}
            className="flex-shrink-0 w-12 flex items-center justify-center rounded-2xl transition-all hover:scale-105"
            style={{ background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA' }}
            title="Elegir película al azar"
          >
            <Shuffle size={18} />
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: '#DDD6FE' }}>
          {/* Header row */}
          <div className="flex items-center justify-between">
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#5B21B6' }}>Buscar en TMDB</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowKeyInput(v => !v); setTempKey(apiKey); }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors"
                style={apiKey
                  ? { fontSize: '11px', fontWeight: 500, background: '#ECFDF5', borderColor: '#A7F3D0', color: '#059669' }
                  : { fontSize: '11px', fontWeight: 500, background: '#FFF7ED', borderColor: '#FED7AA', color: '#D97706' }}
              >
                <Key size={10} /> {apiKey ? 'API Key ✓' : 'API Key'}
              </button>
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} style={{ color: '#9CA3AF' }}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* API Key input */}
          {showKeyInput && (
            <div className="flex gap-2">
              <input value={tempKey} onChange={e => setTempKey(e.target.value)} placeholder="API Key de TMDB..."
                className="flex-1 px-3 py-2 rounded-xl border outline-none transition-colors"
                style={{ borderColor: '#C4B5FD', fontSize: '13px' }} />
              <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer"
                className="p-2 rounded-xl border flex items-center" style={{ borderColor: '#E5E7EB', color: '#6B7280' }}>
                <ExternalLink size={13} />
              </a>
              <button onClick={() => { saveApiKey(tempKey.trim()); setShowKeyInput(false); }}
                className="px-3 py-2 rounded-xl text-white" style={{ background: '#7C3AED', fontSize: '13px' }}>
                Guardar
              </button>
            </div>
          )}

          {/* Type toggle */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#F3F4F6' }}>
            {([
              { key: 'movie' as SearchType, label: 'Películas', icon: <Film size={12} /> },
              { key: 'series' as SearchType, label: 'Series',   icon: <Tv size={12} /> },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => { setSearchType(t.key); setSearchQuery(''); setSearchResults([]); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all"
                style={{
                  fontSize: '12px', fontWeight: searchType === t.key ? 700 : 500,
                  background: searchType === t.key ? 'white' : 'transparent',
                  color: searchType === t.key ? '#7C3AED' : '#6B7280',
                  boxShadow: searchType === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={searchType === 'movie' ? 'Buscar película...' : 'Buscar serie...'}
              autoFocus
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border outline-none transition-colors"
              style={{ fontSize: '14px', borderColor: searchQuery ? '#A78BFA' : '#E5E7EB' }}
            />
            {searchQuery && !searching && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }}>
                <X size={13} />
              </button>
            )}
            {searching && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: '#7C3AED' }} />}
          </div>

          {searchError && <p style={{ fontSize: '12px', color: '#DC2626' }}>{searchError}</p>}
          {!apiKey && !searchQuery && (
            <p style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center' }}>Agrega tu API Key de TMDB para buscar</p>
          )}

          {searchResults.length > 0 && (
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {searchResults.map(item => {
                const inRoom = roomMovieIds.has(String(item.id));
                const isSer = isSeries(item);
                const title = isSer ? item.name : (item as TMDBMovie).title;
                const dateStr = isSer ? item.first_air_date : (item as TMDBMovie).release_date;
                const seasons = isSer ? item.number_of_seasons : undefined;
                const genres = item.genre_ids.map(id => TMDB_GENRES[id]).filter(Boolean);
                return (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border p-2.5 transition-all"
                    style={{ borderColor: inRoom ? '#A7F3D0' : '#F3F4F6', background: inRoom ? '#F0FDF4' : 'white' }}>
                    <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.poster_path
                        ? <img src={`${POSTER_BASE}${item.poster_path}`} alt={title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-lg">{isSer ? '📺' : '🎬'}</div>}
                      <div className="absolute bottom-0.5 left-0.5">
                        <span className="px-1 rounded" style={{ fontSize: '7px', fontWeight: 700, background: isSer ? '#7C3AED' : '#F97316', color: 'white' }}>
                          {isSer ? 'S' : 'P'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }} className="truncate">{title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{dateStr?.slice(0, 4)}</span>
                        {seasons && <span style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 600 }}>{seasons} temp.</span>}
                        <div className="flex items-center gap-0.5">
                          <Star size={9} className="fill-amber-400 text-amber-400" />
                          <span style={{ fontSize: '11px', color: '#6B7280' }}>{item.vote_average.toFixed(1)}</span>
                        </div>
                      </div>
                      {genres.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-0.5">
                          {genres.slice(0, 2).map(g => (
                            <span key={g} style={{ fontSize: '9px', color: '#6B7280', background: '#F3F4F6' }} className="px-1.5 py-0.5 rounded-full">{g}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => !inRoom && addFromTMDB(item)}
                      disabled={inRoom}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0"
                      style={{
                        fontSize: '11px', fontWeight: 600,
                        background: inRoom ? '#ECFDF5' : '#7C3AED',
                        color: inRoom ? '#059669' : 'white',
                        cursor: inRoom ? 'default' : 'pointer',
                      }}
                    >
                      {inRoom ? <Check size={11} /> : <Plus size={11} />}
                      {inRoom ? 'En sala' : 'Agregar'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Movie count */}
      {room && room.movies.length > 0 && (
        <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
          {room.movies.length} película{room.movies.length !== 1 ? 's' : ''} en la sala
          {!isOwner && <span className="ml-1">· Solo el propietario puede eliminar</span>}
        </p>
      )}

      {room && room.movies.length === 0 && (
        <div className="text-center py-10">
          <span className="text-4xl block mb-3">🎬</span>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>La sala está vacía — busca y agrega la primera película</p>
        </div>
      )}

      {/* Tabs */}
      {room && room.movies.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: 'Todas', count: counts.all, textColor: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB', status: 'all' },
            { label: 'Pendiente', count: counts.pending, textColor: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE', status: 'pending' },
            { label: 'Viendo', count: counts.watching, textColor: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC', status: 'watching' },
            { label: 'Visto', count: counts.watched, textColor: '#059669', bg: '#ECFDF5', border: '#A7F3D0', status: 'watched' },
          ].map(s => (
            <button 
              key={s.label} 
              onClick={() => setFilterStatus(s.status as any)}
              className="rounded-2xl border px-3 py-2.5 text-center transition-all cursor-pointer"
              style={{ 
                background: s.bg, 
                borderColor: filterStatus === s.status ? s.textColor : s.border,
                opacity: filterStatus === s.status ? 1 : 0.6,
                transform: filterStatus === s.status ? 'scale(1.02)' : 'scale(1)'
              }}>
              <p style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1, color: s.textColor }}>{s.count}</p>
              <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>{s.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Movie list */}
      {room && filteredMovies.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMovies.map(m => (
            <MovieCard
              key={m.id}
              movie={m}
              onEdit={setEditingMovie}
              onDelete={isOwner ? handleDeleteMovie : () => {}}
              onStatusChange={handleStatusChange}
              onDetail={setDetailMovie}
              readOnly={false}
            />
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingMovie && (
        <MovieModal
          movie={editingMovie}
          onSave={handleEditSave}
          onClose={() => setEditingMovie(null)}
        />
      )}

      {/* Detail modal */}
      {detailMovie && (
        <MovieDetailModal
          movie={detailMovie}
          onClose={() => setDetailMovie(null)}
          onEdit={m => { setDetailMovie(null); setEditingMovie(m); }}
          onDelete={id => { setDetailMovie(null); handleDeleteMovie(id); }}
          onStatusChange={(id, status) => {
            handleStatusChange(id, status);
            setDetailMovie(prev => prev?.id === id ? { ...prev, status } : prev);
          }}
          readOnly={!isOwner}
        />
      )}

      {/* Custom confirm dialog */}
      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar película"
          message="¿Eliminar esta película de la sala? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          onConfirm={() => confirmDeleteMovie(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Random Picker */}
      {showRandom && room && (
        <RandomPicker 
          movies={room.movies} 
          onClose={() => setShowRandom(false)} 
          onStatusChange={handleStatusChange} 
        />
      )}
    </div>
  );
}
