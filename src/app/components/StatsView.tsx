import { useState, useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Star, Film, Eye, Clock, CheckCircle2, Users, Loader2, RefreshCw } from 'lucide-react';
import { Movie } from '../types';

const COLORS = ['#7C3AED', '#F97316', '#06B6D4', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899'];

export interface RoomStat {
  roomId: string;
  name: string;
  movies: Movie[];
  isOwner: boolean;
  loading?: boolean;
}

interface StatsViewProps {
  movies: Movie[];           // personal list
  rooms: RoomStat[];         // collab rooms
  onRefreshRooms: () => void;
  roomsLoading: boolean;
}

type Source = 'personal' | 'rooms' | 'all';

function computeStats(all: Movie[]) {
  const watched  = all.filter(m => m.status === 'watched');
  const watching = all.filter(m => m.status === 'watching');
  const pending  = all.filter(m => m.status === 'pending');
  const rated    = all.filter(m => m.rating > 0);
  const avgRating = rated.length
    ? (rated.reduce((s, m) => s + m.rating, 0) / rated.length).toFixed(1)
    : '—';

  const genreCount: Record<string, number> = {};
  all.forEach(m => m.genres.forEach(g => { genreCount[g] = (genreCount[g] ?? 0) + 1; }));
  const genreData = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const platformCount: Record<string, number> = {};
  all.filter(m => m.platform).forEach(m => { platformCount[m.platform] = (platformCount[m.platform] ?? 0) + 1; });
  const platformData = Object.entries(platformCount).sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const ratingDist = [1,2,3,4,5].map(r => ({ name: '★'.repeat(r), value: all.filter(m => m.rating === r).length }));

  const statusData = [
    { name: 'Visto',     value: watched.length,  color: '#10B981' },
    { name: 'Viendo',    value: watching.length,  color: '#06B6D4' },
    { name: 'Pendiente', value: pending.length,   color: '#7C3AED' },
  ].filter(d => d.value > 0);

  return { watched, watching, pending, rated, avgRating, genreData, platformData, ratingDist, statusData };
}

export function StatsView({ movies, rooms, onRefreshRooms, roomsLoading }: StatsViewProps) {
  const [source, setSource] = useState<Source>('all');

  const roomMovies = rooms.flatMap(r => r.movies);

  const allMovies = useMemo(
    () => {
      // Deduplicate by tmdbId when combining
      if (source === 'personal') return movies;
      if (source === 'rooms') return roomMovies;
      const seen = new Set<string>();
      const combined: Movie[] = [];
      [...movies, ...roomMovies].forEach(m => {
        const key = m.tmdbId ? `tmdb:${m.tmdbId}` : `id:${m.id}`;
        if (!seen.has(key)) { seen.add(key); combined.push(m); }
      });
      return combined;
    },
    [source, movies, rooms]
  );

  const stats = computeStats(allMovies);
  const hasRooms = rooms.length > 0;

  const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) => (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1, color: '#111827' }}>{value}</p>
        <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{label}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>Estadísticas</h2>
        <button
          onClick={onRefreshRooms}
          disabled={roomsLoading}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          style={{ color: '#9CA3AF' }}
          title="Actualizar salas"
        >
          <RefreshCw size={14} className={roomsLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Source selector */}
      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: '#F3F4F6' }}>
        {([
          { key: 'all' as Source,      label: 'Todo',       count: allMovies.length },
          { key: 'personal' as Source, label: 'Mi lista',   count: movies.length },
          { key: 'rooms' as Source,    label: 'Salas',      count: roomMovies.length },
        ]).map(opt => (
          <button
            key={opt.key}
            onClick={() => setSource(opt.key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all"
            style={{
              fontSize: '12px',
              fontWeight: source === opt.key ? 700 : 500,
              background: source === opt.key ? 'white' : 'transparent',
              color: source === opt.key ? '#7C3AED' : '#6B7280',
              boxShadow: source === opt.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {opt.key === 'rooms' && <Users size={11} />}
            {opt.key === 'personal' && <Film size={11} />}
            {opt.label}
            <span
              className="px-1.5 py-0.5 rounded-full"
              style={{
                fontSize: '10px',
                fontWeight: 700,
                background: source === opt.key ? '#F5F3FF' : '#E5E7EB',
                color: source === opt.key ? '#7C3AED' : '#9CA3AF',
              }}
            >
              {opt.count}
            </span>
          </button>
        ))}
      </div>

      {/* Rooms breakdown (when viewing rooms or all) */}
      {(source === 'rooms' || source === 'all') && (
        <div>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }} className="mb-2">
            Salas
          </p>
          {roomsLoading ? (
            <div className="flex items-center gap-2 py-4" style={{ color: '#9CA3AF' }}>
              <Loader2 size={14} className="animate-spin" />
              <span style={{ fontSize: '13px' }}>Cargando salas...</span>
            </div>
          ) : rooms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4 text-center">
              <p style={{ fontSize: '13px', color: '#9CA3AF' }}>No hay salas en tu historial</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {rooms.map(r => (
                <div key={r.roomId} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: r.isOwner ? '#FFF7ED' : '#ECFEFF' }}>
                    <Users size={14} style={{ color: r.isOwner ? '#EA580C' : '#0891B2' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }} className="truncate">{r.name}</p>
                    <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{r.roomId} · {r.isOwner ? '👑 Propietario' : 'Miembro'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p style={{ fontSize: '18px', fontWeight: 700, color: '#7C3AED', lineHeight: 1 }}>{r.movies.length}</p>
                    <p style={{ fontSize: '10px', color: '#9CA3AF' }}>películas</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading rooms */}
      {roomsLoading && allMovies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Loader2 size={28} className="animate-spin" style={{ color: '#7C3AED' }} />
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>Cargando películas de tus salas...</p>
        </div>
      )}

      {/* No data — only show when NOT loading */}
      {!roomsLoading && allMovies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl mb-4 block">📊</span>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#374151' }} className="mb-1">Sin datos aún</p>
          <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
            {source === 'rooms' ? 'Únete a una sala y agrega películas' : 'Agrega películas para ver estadísticas'}
          </p>
        </div>
      ) : !roomsLoading && allMovies.length > 0 ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={<Film size={18} />}        label="Total"     value={allMovies.length}    color="#7C3AED" />
            <StatCard icon={<CheckCircle2 size={18} />} label="Vistas"   value={stats.watched.length} color="#10B981" />
            <StatCard icon={<Eye size={18} />}          label="Viendo"   value={stats.watching.length} color="#06B6D4" />
            <StatCard icon={<Star size={18} />}         label="Promedio" value={`★ ${stats.avgRating}`} color="#F59E0B" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Status donut */}
            {stats.statusData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }} className="mb-4">Estado de la lista</p>
                <div className="flex items-center justify-between">
                  <ResponsiveContainer width="50%" height={130}>
                    <PieChart>
                      <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                        {stats.statusData.map((entry, i) => <Cell key={`status-${i}-${entry.name}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v} películas`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2.5">
                    {stats.statusData.map(d => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>{d.name}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }} className="ml-auto pl-2">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Rating distribution */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }} className="mb-4">Calificaciones</p>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={stats.ratingDist} barSize={24}>
                  <XAxis dataKey="name" style={{ fontSize: '11px' }} axisLine={false} tickLine={false} />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [`${v} películas`, '']} />
                  <Bar dataKey="value" fill="#7C3AED" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Genres */}
          {stats.genreData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }} className="mb-4">Géneros favoritos</p>
              <ResponsiveContainer width="100%" height={Math.max(120, stats.genreData.length * 26)}>
                <BarChart data={stats.genreData} layout="vertical" barSize={14}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '11px' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`${v} películas`, '']} />
                  <Bar dataKey="value" radius={[0,6,6,0]}>
                    {stats.genreData.map((entry, i) => <Cell key={`genre-${i}-${entry.name}`} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Platforms */}
          {stats.platformData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }} className="mb-3">Plataformas</p>
              <div className="flex flex-wrap gap-2">
                {stats.platformData.map((p, i) => (
                  <div key={`platform-${i}-${p.name}`} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span style={{ fontSize: '13px', color: '#374151' }}>{p.name}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending list */}
          {stats.pending.length > 0 && source !== 'rooms' && (
            <div className="rounded-2xl border p-5" style={{ background: '#F5F3FF', borderColor: '#DDD6FE' }}>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} style={{ color: '#7C3AED' }} />
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#5B21B6' }}>Próximas ({stats.pending.length})</p>
              </div>
              <div className="flex flex-col gap-2">
                {stats.pending.slice(0, 5).map(m => (
                  <div key={m.id} className="flex items-center gap-3">
                    {m.poster && <img src={m.poster} alt={m.title} className="w-8 h-10 rounded-lg object-cover flex-shrink-0" />}
                    <div className="min-w-0">
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#3B0764' }} className="truncate">{m.title}</p>
                      {m.year && <p style={{ fontSize: '11px', color: '#7C3AED' }}>{m.year}</p>}
                    </div>
                    {m.platform && (
                      <span style={{ fontSize: '11px', background: '#EDE9FE', color: '#6D28D9', padding: '2px 8px', borderRadius: '20px' }} className="ml-auto flex-shrink-0">
                        {m.platform}
                      </span>
                    )}
                  </div>
                ))}
                {stats.pending.length > 5 && (
                  <p style={{ fontSize: '12px', color: '#7C3AED' }}>+{stats.pending.length - 5} más</p>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

