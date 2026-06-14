import { Search, X, Film, Tv } from 'lucide-react';
import { Movie, MovieStatus, ContentType, ALL_GENRES, platformStyle } from '../types';

export interface Filters {
  query: string;
  status: MovieStatus | 'all';
  type: ContentType | 'all';
  genre: string;
  platform: string;
  minRating: number;
}

interface FilterBarProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  movies?: Movie[]; // to build dynamic platform list
}

export function FilterBar({ filters, onChange, movies = [] }: FilterBarProps) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    onChange({ ...filters, [k]: v });

  // Build dynamic platform list from movies (both manual + streaming)
  const availablePlatforms = Array.from(new Set([
    ...movies.map(m => m.platform).filter(Boolean),
    ...movies.flatMap(m => m.streamingPlatforms ?? []),
  ])).sort();

  const hasActive = filters.status !== 'all' || filters.genre || filters.platform || filters.minRating > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={filters.query}
          onChange={e => set('query', e.target.value)}
          placeholder="Buscar en tu watchlist..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 outline-none focus:border-violet-400 transition-colors"
          style={{ fontSize: '14px' }}
        />
        {filters.query && (
          <button onClick={() => set('query', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter pills row */}
      <div className="flex gap-2 flex-wrap items-center">
        {/* Status */}
        {(['all', 'pending', 'watching', 'watched'] as const).map(s => {
          const labels = { all: 'Todos', pending: 'Pendiente', watching: 'Viendo', watched: 'Visto' };
          const activeColors: Record<string, string> = {
            all: 'bg-gray-900 text-white border-gray-900',
            pending: 'bg-violet-600 text-white border-violet-600',
            watching: 'bg-cyan-500 text-white border-cyan-500',
            watched: 'bg-emerald-500 text-white border-emerald-500',
          };
          return (
            <button
              key={s}
              onClick={() => set('status', s)}
              className={`px-3 py-1.5 rounded-full border transition-all ${
                filters.status === s ? activeColors[s] : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              style={{ fontSize: '12px', fontWeight: 500 }}
            >
              {labels[s]}
            </button>
          );
        })}

        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Type filter */}
        {(['all', 'movie', 'series'] as const).map(t => {
          const labels = { all: 'Todo', movie: 'Películas', series: 'Series' };
          const icons = { all: null, movie: <Film size={10} />, series: <Tv size={10} /> };
          const activeColors: Record<string, string> = {
            all: 'bg-gray-900 text-white border-gray-900',
            movie: 'bg-orange-500 text-white border-orange-500',
            series: 'bg-violet-600 text-white border-violet-600',
          };
          return (
            <button
              key={t}
              onClick={() => set('type', t)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all ${
                filters.type === t ? activeColors[t] : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              style={{ fontSize: '12px', fontWeight: 500 }}
            >
              {icons[t]}{labels[t]}
            </button>
          );
        })}

        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Genre select */}
        <select
          value={filters.genre}
          onChange={e => set('genre', e.target.value)}
          className={`px-3 py-1.5 rounded-full border appearance-none cursor-pointer transition-colors ${
            filters.genre ? 'border-violet-300 bg-violet-50 text-violet-700' : 'bg-white border-gray-200 text-gray-600'
          }`}
          style={{ fontSize: '12px', fontWeight: 500 }}
        >
          <option value="">Género</option>
          {ALL_GENRES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>

        {/* Platform select — dynamic from user's movies */}
        {availablePlatforms.length > 0 && (
          <select
            value={filters.platform}
            onChange={e => set('platform', e.target.value)}
            className={`px-3 py-1.5 rounded-full border appearance-none cursor-pointer transition-colors ${
              filters.platform ? 'border-orange-300 bg-orange-50 text-orange-700' : 'bg-white border-gray-200 text-gray-600'
            }`}
            style={{ fontSize: '12px', fontWeight: 500 }}
          >
            <option value="">Plataforma</option>
            {availablePlatforms.map(p => {
              const s = platformStyle(p);
              return <option key={p} value={p} style={{ background: s.bg, color: s.color }}>{p.replace('Amazon Prime Video', 'Prime Video')}</option>;
            })}
          </select>
        )}

        {/* Min rating */}
        <select
          value={filters.minRating}
          onChange={e => set('minRating', parseInt(e.target.value))}
          className={`px-3 py-1.5 rounded-full border appearance-none cursor-pointer transition-colors ${
            filters.minRating > 0 ? 'border-amber-300 bg-amber-50 text-amber-700' : 'bg-white border-gray-200 text-gray-600'
          }`}
          style={{ fontSize: '12px', fontWeight: 500 }}
        >
          <option value={0}>★ Puntuación</option>
          <option value={1}>★ 1+</option>
          <option value={2}>★★ 2+</option>
          <option value={3}>★★★ 3+</option>
          <option value={4}>★★★★ 4+</option>
          <option value={5}>★★★★★ 5</option>
        </select>

        {/* Clear */}
        {hasActive && (
          <button
            onClick={() => onChange({ query: filters.query, status: 'all', genre: '', platform: '', minRating: 0 })}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-red-400 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
            style={{ fontSize: '12px' }}
          >
            <X size={11} />
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
