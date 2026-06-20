/* MARKER-MAKE-KIT-INVOKED */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Film, Search, BarChart2, Shuffle, Plus, Download, Upload, Clapperboard, Share2, ArrowUpDown, Users, LogOut, User, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Movie, MovieStatus } from './types';
import { MovieCard } from './components/MovieCard';
import { MovieModal } from './components/MovieModal';
import { SearchView } from './components/SearchView';
import { StatsView, RoomStat } from './components/StatsView';
import { RandomPicker } from './components/RandomPicker';
import { FilterBar, Filters } from './components/FilterBar';
import { ShareModal } from './components/ShareModal';
import { SharedListView } from './components/SharedListView';
import { CollabModal } from './components/CollabModal';
import { CollabView } from './components/CollabView';
import { AuthScreen, AuthSession } from './components/AuthScreen';
import { ConfirmDialog } from './components/ConfirmDialog';
import { MovieDetailModal } from './components/MovieDetailModal';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-da14cc3d`;
const HEADERS = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

const API_KEY_STORAGE = 'cinetrack_tmdb_key';
const DEFAULT_TMDB_KEY = '49c3918c2a3724e91d3ac9e4cc61cda7';
const AUTH_SESSION_KEY = 'cinetrack_auth_session';
const COLLAB_SESSION_KEY = 'cinetrack_collab_session';
const ROOMS_HISTORY_KEY = 'cinetrack_rooms_history';

export interface RoomHistoryEntry {
  roomId: string;
  name: string;
  memberName: string;
  isOwner: boolean;
  joinedAt: string;
}

type Tab = 'list' | 'search' | 'stats' | 'collab';

interface CollabSession {
  roomId: string;
  ownerKey: string | null;
  memberName: string;
}
type SortKey = 'dateAdded' | 'title' | 'year' | 'rating';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function decodeSharedList(hash: string): Movie[] | null {
  try {
    const encoded = hash.replace('#share=', '');
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch { return null; }
}

const getMetadataPayload = () => {
  const d: Record<string, string> = {};
  for(let i=0; i<localStorage.length; i++) {
    const k = localStorage.key(i);
    if(k && k.includes('cinetrack_room')) d[k] = localStorage.getItem(k) || '';
  }
  return { 
    id: 'METADATA_ROOMS', 
    type: 'metadata', 
    title: 'METADATA_ROOMS',
    status: 'pending',
    genres: [],
    rating: 0,
    dateAdded: new Date().toISOString(),
    data: d 
  };
};

export default function App() {
  // --- Auth state ---
  const [session, setSession] = useState<AuthSession | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const { theme, setTheme } = useTheme();

  // Detect shared list (accessible without login)
  const sharedMovies = useMemo(() => {
    if (window.location.hash.startsWith('#share=')) return decodeSharedList(window.location.hash);
    return null;
  }, []);

  // --- Movies state (cloud-synced) ---
  const [movies, setMovies] = useState<Movie[]>([]);
  const [moviesLoaded, setMoviesLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Load movies from server when session is ready
  const loadMovies = useCallback(async (sess: AuthSession) => {
    try {
      const res = await fetch(`${SERVER}/auth/movies`, { headers: HEADERS(sess.accessToken) });
      if (res.status === 401) {
        // Token expired — try refresh
        const refreshed = await refreshSession(sess);
        if (refreshed) return loadMovies(refreshed);
        handleLogout();
        return;
      }
      const data = await res.json();
      const loaded = Array.isArray(data.movies) ? data.movies : [];
      
      const meta = loaded.find((m: any) => m.id === 'METADATA_ROOMS');
      let shouldSaveInitial = false;

      if (meta && meta.data) {
        for (const k in meta.data) {
          localStorage.setItem(k, meta.data[k]);
        }
        if (meta.data[ROOMS_HISTORY_KEY]) {
          try { setRoomsHistory(JSON.parse(meta.data[ROOMS_HISTORY_KEY])); } catch {}
        }
      } else {
        if (localStorage.getItem(ROOMS_HISTORY_KEY)) {
          shouldSaveInitial = true;
        }
      }

      const realMovies = loaded.filter((m: any) => m.id !== 'METADATA_ROOMS');
      setMovies(realMovies);
      
      if (shouldSaveInitial) {
        setTimeout(() => window.dispatchEvent(new Event('cinetrack_force_save')), 1000);
      }
    } catch (e) {
      console.log('Error loading movies:', e);
    } finally {
      setMoviesLoaded(true);
    }
  }, []);

  const refreshSession = async (sess: AuthSession): Promise<AuthSession | null> => {
    try {
      const res = await fetch(`${SERVER}/auth/refresh`, {
        method: 'POST',
        headers: HEADERS(publicAnonKey),
        body: JSON.stringify({ refreshToken: sess.refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const newSession = { ...sess, accessToken: data.accessToken, refreshToken: data.refreshToken };
      setSession(newSession);
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(newSession));
      return newSession;
    } catch { return null; }
  };

  useEffect(() => {
    if (session) loadMovies(session);
  }, [session?.userId]);

  // Debounced save to server on every movies change
  const saveMovies = useCallback((updated: Movie[], sess: AuthSession) => {
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const payload = [...updated, getMetadataPayload() as any];
        const res = await fetch(`${SERVER}/auth/movies`, {
          method: 'PUT',
          headers: HEADERS(sess.accessToken),
          body: JSON.stringify({ movies: payload }),
        });
        if (res.status === 401) {
          const refreshed = await refreshSession(sess);
          if (refreshed) {
            await fetch(`${SERVER}/auth/movies`, {
              method: 'PUT',
              headers: HEADERS(refreshed.accessToken),
              body: JSON.stringify({ movies: payload }),
            });
          }
        }
      } catch (e) { console.log('Error saving movies:', e); }
    }, 1200);
  }, []);

  const updateMovies = (fn: (prev: Movie[]) => Movie[]) => {
    setMovies(prev => {
      const updated = fn(prev);
      if (session) saveMovies(updated, session);
      return updated;
    });
  };

  useEffect(() => {
    const handler = () => updateMovies(m => [...m]);
    window.addEventListener('cinetrack_force_save', handler);
    return () => window.removeEventListener('cinetrack_force_save', handler);
  }, [session]);

  // --- Auth handlers ---
  const handleAuth = (newSession: AuthSession) => {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
    setMoviesLoaded(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(COLLAB_SESSION_KEY);
    setSession(null);
    setMovies([]);
    setMoviesLoaded(false);
    setTab('list');
    setCollabSession(null);
  };

  // --- Other state ---
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(API_KEY_STORAGE) || DEFAULT_TMDB_KEY);

  const [collabSession, setCollabSession] = useState<CollabSession | null>(() => {
    try {
      const stored = localStorage.getItem(COLLAB_SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const [tab, setTab] = useState<Tab>(() => {
    try { if (localStorage.getItem(COLLAB_SESSION_KEY)) return 'collab'; } catch {}
    return 'list';
  });

  const [filters, setFilters] = useState<Filters>({ query: '', status: 'all', type: 'all', genre: '', platform: '', minRating: 0 });
  const [sortKey, setSortKey] = useState<SortKey>('dateAdded');
  const [sortAsc, setSortAsc] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [prefill, setPrefill] = useState<Partial<Movie> | undefined>();
  const [showRandom, setShowRandom] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [detailMovie, setDetailMovie] = useState<Movie | null>(null);
  const [roomStats, setRoomStats] = useState<RoomStat[]>([]);
  // Start as true when there are rooms so we don't flash "Sin datos" before first fetch
  const [roomStatsLoading, setRoomStatsLoading] = useState(() => {
    try {
      const stored = localStorage.getItem(ROOMS_HISTORY_KEY);
      return stored ? JSON.parse(stored).length > 0 : false;
    } catch { return false; }
  });

  const [roomsHistory, setRoomsHistory] = useState<RoomHistoryEntry[]>(() => {
    try {
      const stored = localStorage.getItem(ROOMS_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  useEffect(() => {
    if (collabSession) localStorage.setItem(COLLAB_SESSION_KEY, JSON.stringify(collabSession));
    else localStorage.removeItem(COLLAB_SESSION_KEY);
  }, [collabSession]);

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    localStorage.setItem(API_KEY_STORAGE, key);
  };

  const addMovie = (data: Omit<Movie, 'id' | 'dateAdded'> & { id?: string; dateAdded?: string }) => {
    if (data.id) {
      updateMovies(ms => ms.map(m => m.id === data.id ? { ...m, ...data } as Movie : m));
    } else {
      const movie: Movie = { ...data, id: generateId(), dateAdded: new Date().toISOString() } as Movie;
      updateMovies(ms => [movie, ...ms]);
    }
    setEditingMovie(null);
    setShowAddModal(false);
    setPrefill(undefined);
    if (tab === 'search') setTab('list');
  };

  const deleteMovie = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = () => {
    if (confirmDeleteId) {
      updateMovies(ms => ms.filter(m => m.id !== confirmDeleteId));
    }
    setConfirmDeleteId(null);
  };

  const changeStatus = (id: string, status: MovieStatus) => {
    updateMovies(ms => ms.map(m => m.id === id ? { ...m, status } : m));
  };

  const addMovieDirect = (partial: Partial<Movie>) => {
    const movie: Movie = {
      type: partial.type ?? 'movie',
      title: partial.title ?? '',
      year: partial.year ?? null,
      poster: partial.poster ?? null,
      overview: partial.overview ?? '',
      genres: partial.genres ?? [],
      platform: '',
      streamingPlatforms: partial.streamingPlatforms,
      status: 'pending',
      rating: 0,
      notes: '',
      tmdbId: partial.tmdbId,
      seasons: partial.seasons,
      episodes: partial.episodes,
      seriesStatus: partial.seriesStatus,
      currentSeason: partial.currentSeason,
      id: generateId(),
      dateAdded: new Date().toISOString(),
    };
    updateMovies(ms => [movie, ...ms]);
  };

  const addedTmdbIds = useMemo(
    () => new Set(movies.filter(m => m.tmdbId).map(m => String(m.tmdbId))),
    [movies]
  );

  const handleJoinRoom = (roomId: string, ownerKey: string | null, memberName: string, roomName?: string) => {
    const sess = { roomId, ownerKey, memberName };
    setCollabSession(sess);
    localStorage.setItem(COLLAB_SESSION_KEY, JSON.stringify(sess));
    setRoomsHistory(prev => {
      const entry: RoomHistoryEntry = { roomId, name: roomName ?? roomId, memberName, isOwner: !!ownerKey, joinedAt: new Date().toISOString() };
      const updated = [entry, ...prev.filter(r => r.roomId !== roomId)];
      localStorage.setItem(ROOMS_HISTORY_KEY, JSON.stringify(updated));
      
      // Trigger a save so the new room history goes to Supabase
      setTimeout(() => window.dispatchEvent(new Event('cinetrack_force_save')), 500);
      
      return updated;
    });
    setShowCollabModal(false);
    setTab('collab');
  };

  const loadRoomStats = useCallback(async () => {
    if (roomsHistory.length === 0) return;
    setRoomStatsLoading(true);
    const ANON_HEADERS = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };
    const results = await Promise.all(
      roomsHistory.map(async r => {
        try {
          const res = await fetch(`${SERVER}/rooms/${r.roomId}`, { headers: ANON_HEADERS });
          if (!res.ok) return { roomId: r.roomId, name: r.name, movies: [], isOwner: r.isOwner };
          const data = await res.json();
          return { roomId: r.roomId, name: r.name, movies: data.movies ?? [], isOwner: r.isOwner };
        } catch {
          return { roomId: r.roomId, name: r.name, movies: [], isOwner: r.isOwner };
        }
      })
    );
    setRoomStats(results);
    setRoomStatsLoading(false);
  }, [roomsHistory]);

  useEffect(() => {
    if (tab === 'stats') loadRoomStats();
  }, [tab, loadRoomStats]);

  const handleLeaveRoom = () => {
    setCollabSession(null);
    localStorage.removeItem(COLLAB_SESSION_KEY);
    setTab('list');
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(movies, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cinetrack-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (Array.isArray(data)) updateMovies(() => data);
      } catch { alert('Archivo inválido'); }
    };
    input.click();
  };

  const cycleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = useMemo(() => {
    const f = movies.filter(m => {
      if (filters.query && !m.title.toLowerCase().includes(filters.query.toLowerCase())) return false;
      if (filters.status !== 'all' && m.status !== filters.status) return false;
      if (filters.type !== 'all' && (m.type ?? 'movie') !== filters.type) return false;
      if (filters.genre && !m.genres.includes(filters.genre)) return false;
      if (filters.platform && m.platform !== filters.platform && !m.streamingPlatforms?.includes(filters.platform)) return false;
      if (filters.minRating > 0 && m.rating < filters.minRating) return false;
      return true;
    });
    return [...f].sort((a, b) => {
      let diff = 0;
      if (sortKey === 'title') diff = a.title.localeCompare(b.title);
      else if (sortKey === 'year') diff = (a.year ?? 0) - (b.year ?? 0);
      else if (sortKey === 'rating') diff = a.rating - b.rating;
      else diff = new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
      return sortAsc ? diff : -diff;
    });
  }, [movies, filters, sortKey, sortAsc]);

  const counts = {
    all: movies.length,
    pending: movies.filter(m => m.status === 'pending').length,
    watching: movies.filter(m => m.status === 'watching').length,
    watched: movies.filter(m => m.status === 'watched').length,
  };

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'dateAdded', label: 'Fecha' },
    { key: 'title', label: 'Título' },
    { key: 'year', label: 'Año' },
    { key: 'rating', label: 'Rating' },
  ];

  // --- Shared list view (no auth needed) ---
  if (sharedMovies) {
    return (
      <SharedListView
        movies={sharedMovies}
        onImport={(imported) => {
          const newMovies = imported.map(m => ({ ...m, id: generateId(), dateAdded: new Date().toISOString() }));
          updateMovies(ms => [...newMovies, ...ms]);
          window.location.hash = '';
          window.location.reload();
        }}
      />
    );
  }

  // --- Auth gate ---
  if (!session) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  // --- Loading movies ---
  if (!moviesLoaded) {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", minHeight: '100vh', background: '#F8F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: '#7C3AED' }}>
            <Clapperboard size={22} className="text-white" />
          </div>
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>Cargando tu watchlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", minHeight: '100vh', background: '#F8F7FF' }}>
      {/* Top nav */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100" style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.04)' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#7C3AED' }}>
              <Clapperboard size={16} className="text-white" />
            </div>
            <span style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.4px', color: '#111827' }}>CineTrack</span>
          </div>

          {/* Actions — icon-only for secondary, label only for primary */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Theme toggle */}
            <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-xl transition-colors hover:bg-gray-100"
                title="Alternar tema"
              >
                {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-gray-600" />}
              </button>
            {/* ¿Qué veo? — icon only */}
            <button
              onClick={() => setShowRandom(true)}
              className="p-2 rounded-xl border transition-colors"
              style={{ background: '#FFF7ED', borderColor: '#FED7AA', color: '#EA580C' }}
              title="¿Qué veo hoy?"
            >
              <Shuffle size={14} />
            </button>
            {/* Compartir — icon only */}
            <button
              onClick={() => setShowShare(true)}
              className="p-2 rounded-xl border transition-colors"
              style={{ background: '#F5F3FF', borderColor: '#DDD6FE', color: '#7C3AED' }}
              title="Compartir lista"
            >
              <Share2 size={14} />
            </button>
            {/* Export / Import */}
            <button onClick={exportData} className="hidden sm:flex p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Exportar JSON">
              <Download size={14} />
            </button>
            <button onClick={importData} className="hidden sm:flex p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Importar JSON">
              <Upload size={14} />
            </button>

            {/* + Agregar — primary, always visible */}
            <button
              onClick={() => setTab('search')}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-white transition-colors ml-0.5"
              style={{ fontSize: '12px', fontWeight: 600, background: '#7C3AED' }}
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Agregar</span>
            </button>

            {/* User — avatar + name + logout */}
            <div className="flex items-center gap-1 ml-1 pl-1 sm:pl-2 border-l border-gray-100">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#F5F3FF' }}>
                <User size={12} style={{ color: '#7C3AED' }} />
              </div>
              <span className="hidden sm:block" style={{ fontSize: '11px', fontWeight: 600, color: '#374151', maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.username}
              </span>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                style={{ color: '#9CA3AF' }}
                title="Cerrar sesión"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab bar — minimal pill switcher */}
      <div className="sticky top-14 z-20" style={{ background: 'rgba(248,247,255,0.85)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div className="max-w-2xl mx-auto px-4 py-2">
          <div className="flex gap-1 p-1 rounded-2xl w-fit mx-auto overflow-x-auto max-w-full hide-scrollbar" style={{ background: 'rgba(0,0,0,0.04)' }}>
            {([
              { key: 'list' as Tab, icon: <Film size={13} />, label: 'Lista', badge: counts.all },
              { key: 'search' as Tab, icon: <Search size={13} />, label: 'Buscar', badge: null },
              { key: 'stats' as Tab, icon: <BarChart2 size={13} />, label: 'Stats', badge: null },
              { key: 'collab' as Tab, icon: <Users size={13} />, label: 'Sala', badge: collabSession ? 1 : null },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all"
                style={{
                  fontSize: '12px',
                  fontWeight: tab === t.key ? 600 : 400,
                  background: tab === t.key ? 'white' : 'transparent',
                  color: tab === t.key ? '#7C3AED' : '#6B7280',
                  boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {t.icon}
                {t.label}
                {t.badge !== null && t.badge !== undefined && t.badge > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full"
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      background: tab === t.key ? '#7C3AED' : '#9CA3AF',
                      color: 'white',
                      lineHeight: 1,
                    }}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* LIST TAB */}
        {tab === 'list' && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {[
                { label: 'Todas', count: counts.all, textColor: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB', status: 'all' },
                { label: 'Pendiente', count: counts.pending, textColor: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE', status: 'pending' },
                { label: 'Viendo', count: counts.watching, textColor: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC', status: 'watching' },
                { label: 'Visto', count: counts.watched, textColor: '#059669', bg: '#ECFDF5', border: '#A7F3D0', status: 'watched' },
              ].map(s => (
                <button 
                  key={s.label} 
                  onClick={() => setFilters(prev => ({...prev, status: s.status as any}))}
                  className="rounded-2xl border px-3 py-2.5 text-center transition-all cursor-pointer"
                  style={{ 
                    background: s.bg, 
                    borderColor: filters.status === s.status ? s.textColor : s.border,
                    opacity: filters.status === s.status ? 1 : 0.6,
                    transform: filters.status === s.status ? 'scale(1.02)' : 'scale(1)'
                  }}>
                  <p style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1, color: s.textColor }}>{s.count}</p>
                  <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>{s.label}</p>
                </button>
              ))}
            </div>

            <FilterBar filters={filters} onChange={setFilters} movies={movies} />

            {movies.length > 1 && (
              <div className="flex items-center gap-1.5">
                <ArrowUpDown size={12} style={{ color: '#9CA3AF' }} />
                <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 500 }}>Ordenar:</span>
                <div className="flex gap-1">
                  {SORT_OPTIONS.map(o => (
                    <button key={o.key} onClick={() => cycleSort(o.key)}
                      className="px-2.5 py-1 rounded-lg border transition-all"
                      style={{
                        fontSize: '11px', fontWeight: sortKey === o.key ? 600 : 400,
                        background: sortKey === o.key ? '#7C3AED' : 'white',
                        color: sortKey === o.key ? 'white' : '#6B7280',
                        borderColor: sortKey === o.key ? '#7C3AED' : '#E5E7EB',
                      }}>
                      {o.label} {sortKey === o.key ? (sortAsc ? '↑' : '↓') : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-5xl block mb-4">🎬</span>
                <p style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }} className="mb-1">
                  {movies.length === 0 ? `Hola, ${session.username} 👋` : 'Sin resultados'}
                </p>
                <p style={{ fontSize: '14px', color: '#9CA3AF' }} className="mb-4">
                  {movies.length === 0 ? 'Busca películas con TMDB y agrégalas con un clic' : 'Prueba con otros filtros'}
                </p>
                {movies.length === 0 && (
                  <button onClick={() => setTab('search')} className="px-4 py-2 text-white rounded-xl"
                    style={{ fontSize: '14px', fontWeight: 500, background: '#7C3AED' }}>
                    Buscar películas
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filtered.map(m => (
                    <MovieCard 
                      key={m.id} 
                      movie={m} 
                      onEdit={setEditingMovie} 
                      onDelete={deleteMovie} 
                      onStatusChange={changeStatus} 
                      onDetail={setDetailMovie} 
                      onUpdateMovie={addMovie}
                      currentUser={session.username}
                    />
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: '#D1D5DB', textAlign: 'center', paddingTop: '8px' }}>
                  {filtered.length} de {movies.length} películas · guardado en la nube ☁️
                </p>
              </>
            )}
          </div>
        )}

        {/* SEARCH TAB */}
        {tab === 'search' && (
          <SearchView apiKey={apiKey} onApiKeyChange={handleApiKeyChange} onAddMovieDirect={addMovieDirect} addedIds={addedTmdbIds} />
        )}

        {/* STATS TAB */}
        {tab === 'stats' && (
          <StatsView
            movies={movies}
            rooms={roomStats}
            roomsLoading={roomStatsLoading}
            onRefreshRooms={loadRoomStats}
          />
        )}

        {/* COLLAB TAB */}
        {tab === 'collab' && (
          collabSession ? (
            <CollabView
              roomId={collabSession.roomId}
              ownerKey={collabSession.ownerKey}
              memberName={collabSession.memberName}
              apiKey={apiKey}
              onLeave={handleLeaveRoom}
            />
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>Salas colaborativas</p>
                  <p style={{ fontSize: '12px', color: '#9CA3AF' }} className="mt-0.5">Listas compartidas en tiempo real</p>
                </div>
                <button onClick={() => setShowCollabModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white"
                  style={{ fontSize: '12px', fontWeight: 600, background: '#7C3AED' }}>
                  <Plus size={13} /> Nueva sala
                </button>
              </div>

              {roomsHistory.length === 0 ? (
                <div className="flex flex-col items-center text-center py-12 gap-3">
                  <div className="w-14 h-14 rounded-3xl flex items-center justify-center" style={{ background: '#F5F3FF' }}>
                    <Users size={24} style={{ color: '#7C3AED' }} />
                  </div>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#374151' }}>Sin salas aún</p>
                  <p style={{ fontSize: '13px', color: '#9CA3AF', maxWidth: '220px' }}>
                    Crea una sala e invita a tus amigos con un código de 6 letras
                  </p>
                  <button onClick={() => setShowCollabModal(true)} className="px-4 py-2 rounded-xl text-white"
                    style={{ fontSize: '13px', fontWeight: 600, background: '#7C3AED' }}>
                    Crear o unirme a una sala
                  </button>
                </div>
              ) : (
                <>
                  {roomsHistory.filter(r => r.isOwner).length > 0 && (
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }} className="mb-2">Mis salas</p>
                      <div className="flex flex-col gap-2">
                        {roomsHistory.filter(r => r.isOwner).map(r => (
                          <button key={r.roomId}
                            onClick={() => handleJoinRoom(r.roomId, localStorage.getItem(`cinetrack_room_owner_${r.roomId}`), r.memberName, r.name)}
                            className="flex items-center gap-3 bg-white rounded-2xl border p-4 text-left hover:border-violet-300 transition-colors w-full"
                            style={{ borderColor: '#E5E7EB' }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#F5F3FF' }}>
                              <Users size={16} style={{ color: '#7C3AED' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }} className="truncate">{r.name}</p>
                                  <span style={{ fontSize: '10px', fontWeight: 600, background: '#FFF7ED', color: '#EA580C', padding: '1px 6px', borderRadius: '20px', flexShrink: 0 }}>👑 Propietario</span>
                                </div>
                              <p style={{ fontSize: '11px', color: '#9CA3AF' }}>Código: {r.roomId} · {new Date(r.joinedAt).toLocaleDateString('es')}</p>
                            </div>
                            <span style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 500 }}>Entrar →</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {roomsHistory.filter(r => !r.isOwner).length > 0 && (
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }} className="mb-2">Salas en las que participo</p>
                      <div className="flex flex-col gap-2">
                        {roomsHistory.filter(r => !r.isOwner).map(r => (
                          <button key={r.roomId}
                            onClick={() => handleJoinRoom(r.roomId, null, r.memberName, r.name)}
                            className="flex items-center gap-3 bg-white rounded-2xl border p-4 text-left hover:border-cyan-300 transition-colors w-full"
                            style={{ borderColor: '#E5E7EB' }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ECFEFF' }}>
                              <Users size={16} style={{ color: '#0891B2' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }} className="truncate">{r.name}</p>
                              <p style={{ fontSize: '11px', color: '#9CA3AF' }}>Código: {r.roomId} · como {r.memberName}</p>
                            </div>
                            <span style={{ fontSize: '11px', color: '#0891B2', fontWeight: 500 }}>Entrar →</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        )}
      </main>

      {/* Modals */}
      {(showAddModal || editingMovie) && (
        <MovieModal movie={editingMovie} prefill={prefill} onSave={addMovie}
          onClose={() => { setEditingMovie(null); setShowAddModal(false); setPrefill(undefined); }} />
      )}
      {showRandom && <RandomPicker movies={movies} onClose={() => setShowRandom(false)} onStatusChange={changeStatus} />}
      {showShare && <ShareModal movies={movies} onClose={() => setShowShare(false)} />}
      {showCollabModal && (
        <CollabModal movies={movies} onJoinRoom={handleJoinRoom} onClose={() => setShowCollabModal(false)} />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Eliminar película"
          message="¿Eliminar esta película de tu lista? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {detailMovie && (
        <MovieDetailModal
          movie={detailMovie}
          onClose={() => setDetailMovie(null)}
          onEdit={m => { setDetailMovie(null); setEditingMovie(m); }}
          onDelete={id => { setDetailMovie(null); deleteMovie(id); }}
          onStatusChange={(id, status) => {
            changeStatus(id, status);
            setDetailMovie(prev => prev?.id === id ? { ...prev, status } : prev);
          }}
          currentUser={session.username}
          onUpdateMovie={addMovie}
        />
      )}
    </div>
  );
}
