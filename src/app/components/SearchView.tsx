import { useState, useRef, useEffect } from 'react';
import { Search, Plus, Star, Key, ExternalLink, Loader2, X, Check, Info, Film, Tv } from 'lucide-react';
import { TMDBMovie, TMDBSeries, TMDB_GENRES, SERIES_STATUS_MAP, Movie, ContentType } from '../types';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w300';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// --- Cache helpers ---
interface CacheEntry { results: (TMDBMovie | TMDBSeries)[]; ts: number }
function readCache(key: string): (TMDBMovie | TMDBSeries)[] | null {
  try {
    const raw = localStorage.getItem(`tmdb_cache:${key}`);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) { localStorage.removeItem(`tmdb_cache:${key}`); return null; }
    return entry.results;
  } catch { return null; }
}
function writeCache(key: string, results: (TMDBMovie | TMDBSeries)[]) {
  try { localStorage.setItem(`tmdb_cache:${key}`, JSON.stringify({ results, ts: Date.now() })); } catch {}
}

interface SearchViewProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onAddMovieDirect: (movie: Partial<Movie>) => void;
  addedIds: Set<string>;
}

type SearchType = 'movie' | 'series';

const DEMO_MOVIES: TMDBMovie[] = [
  { id: 550,  title: 'Fight Club',           release_date: '1999-10-15', overview: 'Un empleado de oficina insomne forma un club de lucha clandestino con un carismático vendedor de jabón.', poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', genre_ids: [18, 53], vote_average: 8.4 },
  { id: 238,  title: 'El Padrino',           release_date: '1972-03-14', overview: 'El patriarca envejecido de una dinastía del crimen transfiere el control de su empire a su hijo.', poster_path: '/3bhkrj58Vtu7enYsLe1rhdaXHVU.jpg', genre_ids: [18, 80], vote_average: 8.7 },
  { id: 278,  title: 'Cadena perpetua',      release_date: '1994-09-23', overview: 'Dos hombres presos encuentran consuelo y redención a través de actos de decencia común.', poster_path: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', genre_ids: [18], vote_average: 8.7 },
  { id: 680,  title: 'Pulp Fiction',         release_date: '1994-09-10', overview: 'Relatos entrelazados de crimen, violencia y redención en el Los Ángeles del hampa.', poster_path: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', genre_ids: [53, 80], vote_average: 8.5 },
  { id: 155,  title: 'El Caballero de la Noche', release_date: '2008-07-14', overview: 'Batman enfrenta al Joker, un caótico criminal que quiere hundir a Gotham en la anarquía.', poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', genre_ids: [28, 80, 18], vote_average: 8.5 },
  { id: 13,   title: 'Forrest Gump',         release_date: '1994-06-23', overview: 'La historia de un hombre extraordinario cuya vida coincide con los momentos más importantes de la historia de EE.UU.', poster_path: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', genre_ids: [35, 18, 10749], vote_average: 8.5 },
];

const DEMO_SERIES: TMDBSeries[] = [
  { id: 1396, name: 'Breaking Bad',          first_air_date: '2008-01-20', overview: 'Un profesor de química con cáncer se convierte en fabricante de metanfetamina.', poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg', genre_ids: [18, 80], vote_average: 8.9, number_of_seasons: 5 },
  { id: 1399, name: 'Game of Thrones',       first_air_date: '2011-04-17', overview: 'Familias nobles luchan por el control del mítico continente de Westeros.', poster_path: '/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg', genre_ids: [10759, 18, 14], vote_average: 8.4, number_of_seasons: 8 },
  { id: 66732, name: 'Stranger Things',      first_air_date: '2016-07-15', overview: 'Un niño desaparece misteriosamente en Hawkins, Indiana, desatando fuerzas sobrenaturales.', poster_path: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', genre_ids: [18, 27, 878], vote_average: 8.6, number_of_seasons: 4 },
  { id: 60735, name: 'The Flash',            first_air_date: '2014-10-07', overview: 'Barry Allen se convierte en el superhéroe más rápido del mundo tras ser alcanzado por un rayo.', poster_path: '/lJA2RCMfsWoskqlQhXPSLFQGXEJ.jpg', genre_ids: [10759, 18], vote_average: 7.8, number_of_seasons: 9 },
  { id: 1418,  name: 'The Big Bang Theory',  first_air_date: '2007-09-24', overview: 'Cuatro científicos geeks navegan sus vidas sociales y relaciones amorosas.', poster_path: '/ooBGRQBdbGzBxAVfExiO8r7kloA.jpg', genre_ids: [35], vote_average: 8.0, number_of_seasons: 12 },
  { id: 2190,  name: 'South Park',           first_air_date: '1997-08-13', overview: 'Cuatro niños irreverentes viven aventuras absurdas en el pequeño pueblo de South Park.', poster_path: '/msiURL5GnEXtkJvBFQGbHQnVDcV.jpg', genre_ids: [16, 35], vote_average: 8.7, number_of_seasons: 26 },
];

function isSeries(item: TMDBMovie | TMDBSeries): item is TMDBSeries {
  return 'name' in item;
}

export function SearchView({ apiKey, onApiKeyChange, onAddMovieDirect, addedIds }: SearchViewProps) {
  const [searchType, setSearchType] = useState<SearchType>('movie');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<(TMDBMovie | TMDBSeries)[]>(DEMO_MOVIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  const [justAdded, setJustAdded] = useState<Set<number>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Switch demo when type changes
  useEffect(() => {
    if (!query.trim()) {
      setResults(searchType === 'movie' ? DEMO_MOVIES : DEMO_SERIES);
      setError('');
    }
  }, [searchType]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(searchType === 'movie' ? DEMO_MOVIES : DEMO_SERIES);
      setError('');
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query.trim()), 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, apiKey, searchType]);

  const doSearch = async (q: string) => {
    if (!apiKey) { setError('Agrega tu API Key de TMDB para buscar.'); setResults([]); return; }
    const cacheKey = `${searchType}:${q}`;
    const cached = readCache(cacheKey);
    if (cached) { setResults(cached); setError(''); return; }
    setLoading(true); setError('');
    try {
      const endpoint = searchType === 'movie' ? 'search/movie' : 'search/tv';
      const res = await fetch(`${TMDB_BASE}/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(q)}&language=es-ES&page=1`);
      if (res.status === 401) throw new Error('API Key inválida.');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const list = (data.results ?? []).slice(0, 12);
      writeCache(cacheKey, list);
      setResults(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al buscar.');
      setResults([]);
    } finally { setLoading(false); }
  };

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

  const fetchSeriesDetails = async (tmdbId: number): Promise<{ seasons: number; episodes: number; status: string }> => {
    if (!apiKey) return { seasons: 0, episodes: 0, status: '' };
    try {
      const res = await fetch(`${TMDB_BASE}/tv/${tmdbId}?api_key=${apiKey}&language=es-ES`);
      if (!res.ok) return { seasons: 0, episodes: 0, status: '' };
      const data = await res.json();
      return {
        seasons: data.number_of_seasons ?? 0,
        episodes: data.number_of_episodes ?? 0,
        status: SERIES_STATUS_MAP[data.status] ?? data.status ?? '',
      };
    } catch { return { seasons: 0, episodes: 0, status: '' }; }
  };

  const handleAdd = async (item: TMDBMovie | TMDBSeries) => {
    const genres = item.genre_ids.map(id => TMDB_GENRES[id]).filter(Boolean);
    const type: ContentType = isSeries(item) ? 'series' : 'movie';
    const title = isSeries(item) ? item.name : item.title;
    const dateStr = isSeries(item) ? item.first_air_date : (item as TMDBMovie).release_date;
    const year = dateStr ? parseInt(dateStr.slice(0, 4)) : null;
    const streamingPlatforms = await fetchProviders(item.id, type);

    let seriesExtras = {};
    if (type === 'series') {
      const details = await fetchSeriesDetails(item.id);
      seriesExtras = {
        seasons: details.seasons || (item as TMDBSeries).number_of_seasons || 0,
        episodes: details.episodes,
        seriesStatus: details.status,
        currentSeason: 1,
      };
    }

    onAddMovieDirect({
      type,
      title,
      year,
      poster: item.poster_path ? `${POSTER_BASE}${item.poster_path}` : null,
      overview: item.overview,
      genres,
      tmdbId: item.id,
      status: 'pending',
      rating: 0,
      notes: '',
      platform: '',
      streamingPlatforms,
      ...seriesExtras,
    });

    setJustAdded(prev => new Set(prev).add(item.id));
    setTimeout(() => setJustAdded(prev => { const n = new Set(prev); n.delete(item.id); return n; }), 2500);
  };

  const isAdded = (item: TMDBMovie | TMDBSeries) => addedIds.has(String(item.id)) || justAdded.has(item.id);
  const fromCache = query && readCache(`${searchType}:${query}`);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>Buscar</h2>
          <p style={{ fontSize: '12px', color: '#9CA3AF' }} className="mt-0.5">Powered by TMDB · caché 24h</p>
        </div>
        <button
          onClick={() => { setShowKeyInput(v => !v); setTempKey(apiKey); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-colors"
          style={apiKey
            ? { fontSize: '12px', fontWeight: 500, background: '#ECFDF5', borderColor: '#A7F3D0', color: '#059669' }
            : { fontSize: '12px', fontWeight: 500, background: '#FFF7ED', borderColor: '#FED7AA', color: '#D97706' }}
        >
          <Key size={12} />{apiKey ? 'API Key ✓' : 'API Key'}
        </button>
      </div>

      {/* API Key panel */}
      {showKeyInput && (
        <div className="rounded-2xl border p-4" style={{ background: '#F5F3FF', borderColor: '#DDD6FE' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#5B21B6' }} className="mb-1">API Key de TMDB (gratuita)</p>
          <p style={{ fontSize: '12px', color: '#7C3AED', lineHeight: '1.5' }} className="mb-3">
            Obtén una en{' '}
            <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5 font-medium">
              themoviedb.org <ExternalLink size={10} />
            </a>
          </p>
          <div className="flex gap-2">
            <input value={tempKey} onChange={e => setTempKey(e.target.value)} placeholder="Pega tu API Key..."
              className="flex-1 px-3 py-2 rounded-xl border outline-none transition-colors"
              style={{ fontSize: '13px', borderColor: '#C4B5FD', background: 'white' }} />
            <button onClick={() => { onApiKeyChange(tempKey.trim()); setShowKeyInput(false); if (query) doSearch(query.trim()); }}
              className="px-4 py-2 rounded-xl text-white" style={{ fontSize: '13px', fontWeight: 600, background: '#7C3AED' }}>
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Type toggle — Movies / Series */}
      <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ background: '#F3F4F6' }}>
        {([
          { key: 'movie' as SearchType, label: 'Películas', icon: <Film size={13} /> },
          { key: 'series' as SearchType, label: 'Series',   icon: <Tv size={13} /> },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => { setSearchType(t.key); setQuery(''); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all"
            style={{
              fontSize: '13px',
              fontWeight: searchType === t.key ? 700 : 500,
              background: searchType === t.key ? 'white' : 'transparent',
              color: searchType === t.key ? '#7C3AED' : '#6B7280',
              boxShadow: searchType === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={searchType === 'movie' ? 'Buscar película...' : 'Buscar serie...'}
          className="w-full pl-10 pr-10 py-3.5 rounded-2xl border outline-none transition-all"
          style={{ fontSize: '15px', borderColor: query ? '#A78BFA' : '#E5E7EB', background: 'white',
            boxShadow: query ? '0 0 0 3px rgba(124,58,237,0.1)' : undefined }}
        />
        {query && !loading && (
          <button onClick={() => setQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }}>
            <X size={15} />
          </button>
        )}
        {loading && <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin" style={{ color: '#7C3AED' }} />}
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '13px' }}>{error}</div>
      )}

      {!apiKey && !query && (
        <div className="flex items-start gap-2.5 rounded-xl px-3 py-2.5" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <Info size={13} style={{ color: '#059669', marginTop: '1px', flexShrink: 0 }} />
          <p style={{ fontSize: '12px', color: '#065F46', lineHeight: '1.5' }}>
            Sin API Key ves ejemplos. Con tu clave gratuita de TMDB puedes buscar cualquier {searchType === 'movie' ? 'película' : 'serie'}.
          </p>
        </div>
      )}

      {query && results.length > 0 && !loading && (
        <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
          {results.length} resultado{results.length !== 1 ? 's' : ''} {fromCache ? '· desde caché' : '· desde TMDB'}
        </p>
      )}

      {/* Results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {results.map(item => {
          const added = isAdded(item);
          const genres = item.genre_ids.map(id => TMDB_GENRES[id]).filter(Boolean);
          const title = isSeries(item) ? item.name : item.title;
          const dateStr = isSeries(item) ? item.first_air_date : (item as TMDBMovie).release_date;
          const year = dateStr?.slice(0, 4);
          const seasons = isSeries(item) ? item.number_of_seasons : undefined;

          return (
            <div
              key={item.id}
              className="flex gap-3 bg-white rounded-2xl border overflow-hidden transition-all"
              style={{ borderColor: added ? '#A7F3D0' : '#F3F4F6', boxShadow: added ? '0 0 0 1px #A7F3D0' : undefined }}
            >
              <div className="flex-shrink-0 w-16 bg-gray-100 rounded-l-2xl overflow-hidden relative">
                {item.poster_path
                  ? <img src={`${POSTER_BASE}${item.poster_path}`} alt={title} className="w-full h-full object-cover" style={{ minHeight: '104px' }} />
                  : <div className="w-full flex items-center justify-center text-2xl" style={{ minHeight: '104px' }}>{isSeries(item) ? '📺' : '🎬'}</div>}
                {/* Type badge */}
                <div className="absolute bottom-1 left-1">
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md"
                    style={{ fontSize: '8px', fontWeight: 700, background: isSeries(item) ? '#7C3AED' : '#F97316', color: 'white' }}>
                    {isSeries(item) ? <Tv size={8} /> : <Film size={8} />}
                    {isSeries(item) ? 'SERIE' : 'PELI'}
                  </span>
                </div>
              </div>

              <div className="flex-1 py-3 pr-3 min-w-0 flex flex-col justify-between">
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }} className="leading-tight mb-1">{title}</p>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {year && <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{year}</span>}
                    {seasons && <span style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 500 }}>{seasons} temp.</span>}
                    <div className="flex items-center gap-0.5">
                      <Star size={10} className="fill-amber-400 text-amber-400" />
                      <span style={{ fontSize: '11px', color: '#6B7280' }}>{item.vote_average.toFixed(1)}</span>
                    </div>
                  </div>
                  {genres.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {genres.slice(0, 2).map(g => (
                        <span key={g} style={{ fontSize: '10px', color: '#6B7280', background: '#F3F4F6' }} className="px-1.5 py-0.5 rounded-full">{g}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => !added && handleAdd(item)}
                  disabled={added}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all w-fit mt-2"
                  style={{
                    fontSize: '11px', fontWeight: 600,
                    background: added ? '#ECFDF5' : '#7C3AED',
                    color: added ? '#059669' : 'white',
                    cursor: added ? 'default' : 'pointer',
                  }}
                >
                  {added ? <Check size={11} /> : <Plus size={11} />}
                  {added ? 'Agregada' : 'Agregar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {results.length === 0 && !loading && query && (
        <div className="text-center py-12">
          <span className="text-4xl mb-3 block">{searchType === 'series' ? '📺' : '🔍'}</span>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>Sin resultados para "{query}"</p>
        </div>
      )}
    </div>
  );
}
