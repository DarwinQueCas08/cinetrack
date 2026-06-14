import { useState, useEffect } from 'react';
import { X, Star, ChevronDown, ChevronUp, Film, Tv } from 'lucide-react';
import { Movie, MovieStatus, ContentType, PLATFORMS, ALL_GENRES, platformStyle } from '../types';

interface MovieModalProps {
  movie?: Movie | null;
  onSave: (movie: Omit<Movie, 'id' | 'dateAdded'> & { id?: string; dateAdded?: string }) => void;
  onClose: () => void;
  prefill?: Partial<Movie>;
}

const EMPTY: Omit<Movie, 'id' | 'dateAdded'> = {
  type: 'movie',
  title: '',
  year: null,
  poster: null,
  overview: '',
  genres: [],
  platform: '',
  streamingPlatforms: [],
  status: 'pending',
  rating: 0,
  notes: '',
  seasons: undefined,
  episodes: undefined,
  seriesStatus: undefined,
  currentSeason: undefined,
};

const STATUS_OPTIONS: { value: MovieStatus; label: string; emoji: string; active: string }[] = [
  { value: 'pending',  label: 'Pendiente',   emoji: '🕐', active: 'bg-violet-600 text-white border-violet-600' },
  { value: 'watching', label: 'Viendo',      emoji: '👁️', active: 'bg-cyan-500 text-white border-cyan-500' },
  { value: 'watched',  label: 'Visto',       emoji: '✅', active: 'bg-emerald-500 text-white border-emerald-500' },
];

const RATING_LABELS = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];

export function MovieModal({ movie, onSave, onClose, prefill }: MovieModalProps) {
  const [form, setForm] = useState({ ...EMPTY, ...prefill });
  const [hoverStar, setHoverStar] = useState(0);
  const [showPosterUrl, setShowPosterUrl] = useState(false);

  useEffect(() => {
    if (movie) {
      const { id: _id, dateAdded: _d, ...rest } = movie;
      setForm({ ...EMPTY, ...rest });
    }
  }, [movie]);

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const toggleGenre = (g: string) =>
    setForm(f => ({
      ...f,
      genres: f.genres.includes(g) ? f.genres.filter(x => x !== g) : [...f.genres, g],
    }));

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.title.trim()) return;
    onSave({ ...form, ...(movie ? { id: movie.id, dateAdded: movie.dateAdded } : {}) });
  };

  const isEdit = !!movie;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white w-full sm:max-w-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        style={{ maxHeight: '94vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {form.poster && (
              <img src={form.poster} alt="" className="w-9 h-12 rounded-xl object-cover shadow-sm flex-shrink-0" />
            )}
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                {isEdit ? 'Editar película' : 'Agregar película'}
              </h2>
              {form.title && (
                <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '1px' }} className="truncate max-w-[200px]">
                  {form.title}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0"
            style={{ color: '#9CA3AF' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Type selector */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }} className="block mb-2">
                Tipo
              </label>
              <div className="flex gap-2">
                {([
                  { value: 'movie' as ContentType, label: 'Película', icon: <Film size={14} /> },
                  { value: 'series' as ContentType, label: 'Serie',   icon: <Tv size={14} /> },
                ]).map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set('type', t.value)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 transition-all"
                    style={form.type === t.value
                      ? { borderColor: '#7C3AED', background: '#7C3AED', color: 'white', fontWeight: 700, fontSize: '13px' }
                      : { borderColor: '#E5E7EB', background: 'white', color: '#9CA3AF', fontWeight: 500, fontSize: '13px' }}
                  >
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }} className="block mb-2">
                Título *
              </label>
              <input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Nombre de la película"
                required
                className="w-full px-4 py-3 rounded-2xl border outline-none transition-all"
                style={{ fontSize: '15px', fontWeight: 500, borderColor: '#E5E7EB', background: '#F9FAFB' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#A78BFA'; e.currentTarget.style.background = 'white'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#F9FAFB'; }}
              />
            </div>

            {/* Year + Platform */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }} className="block mb-2">
                  Año
                </label>
                <input
                  type="number"
                  value={form.year ?? ''}
                  onChange={e => set('year', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="2024"
                  min={1900} max={2030}
                  className="w-full px-4 py-3 rounded-2xl border outline-none transition-all"
                  style={{ fontSize: '15px', borderColor: '#E5E7EB', background: '#F9FAFB' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#A78BFA'; e.currentTarget.style.background = 'white'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#F9FAFB'; }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }} className="block mb-2">
                  Viendo en
                </label>
                <select
                  value={form.platform}
                  onChange={e => set('platform', e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border outline-none appearance-none cursor-pointer transition-all"
                  style={{ fontSize: '14px', borderColor: '#E5E7EB', background: '#F9FAFB' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#A78BFA'; e.currentTarget.style.background = 'white'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#F9FAFB'; }}
                >
                  <option value="">Ninguna</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Series-only fields */}
            {form.type === 'series' && (
              <div className="flex flex-col gap-4 p-4 rounded-2xl" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  📺 Detalles de serie
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280' }} className="block mb-1.5">Temporadas</label>
                    <input
                      type="number" min={0} max={99}
                      value={form.seasons ?? ''}
                      onChange={e => set('seasons', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="—"
                      className="w-full px-3 py-2.5 rounded-xl border outline-none transition-colors"
                      style={{ fontSize: '14px', borderColor: '#DDD6FE', background: 'white' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280' }} className="block mb-1.5">Episodios</label>
                    <input
                      type="number" min={0}
                      value={form.episodes ?? ''}
                      onChange={e => set('episodes', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="—"
                      className="w-full px-3 py-2.5 rounded-xl border outline-none transition-colors"
                      style={{ fontSize: '14px', borderColor: '#DDD6FE', background: 'white' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280' }} className="block mb-1.5">En temporada</label>
                    <input
                      type="number" min={1} max={form.seasons ?? 99}
                      value={form.currentSeason ?? ''}
                      onChange={e => set('currentSeason', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="—"
                      className="w-full px-3 py-2.5 rounded-xl border outline-none transition-colors"
                      style={{ fontSize: '14px', borderColor: '#DDD6FE', background: 'white' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280' }} className="block mb-1.5">Estado de la serie</label>
                  <div className="flex gap-2 flex-wrap">
                    {['En emisión', 'Finalizada', 'Cancelada'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => set('seriesStatus', form.seriesStatus === s ? undefined : s)}
                        className="px-3 py-1.5 rounded-xl border-2 transition-all"
                        style={{
                          fontSize: '12px', fontWeight: form.seriesStatus === s ? 700 : 500,
                          borderColor: form.seriesStatus === s ? '#7C3AED' : '#DDD6FE',
                          background: form.seriesStatus === s ? '#7C3AED' : 'white',
                          color: form.seriesStatus === s ? 'white' : '#6B7280',
                        }}
                      >
                        {s === 'En emisión' ? '🟢' : s === 'Finalizada' ? '✅' : '🔴'} {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Streaming platforms (from TMDB — read-only) */}
            {form.streamingPlatforms && form.streamingPlatforms.length > 0 && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }} className="block mb-2">
                  Disponible en (TMDB)
                </label>
                <div className="flex flex-wrap gap-2 p-3 rounded-2xl" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  {form.streamingPlatforms.map(p => {
                    const s = platformStyle(p);
                    return (
                      <span
                        key={p}
                        className="px-2.5 py-1 rounded-lg"
                        style={{ fontSize: '11px', fontWeight: 700, background: s.bg, color: s.color }}
                      >
                        {p.replace('Amazon Prime Video', 'Prime Video').replace('Apple TV Plus', 'Apple TV+').replace('Paramount Plus', 'Paramount+')}
                      </span>
                    );
                  })}
                </div>
                <p style={{ fontSize: '11px', color: '#D1D5DB', marginTop: '4px' }}>Obtenidas automáticamente desde TMDB</p>
              </div>
            )}

            {/* Status */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }} className="block mb-2">
                Estado
              </label>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => set('status', s.value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border-2 transition-all`}
                    style={form.status === s.value
                      ? { borderColor: 'transparent', fontWeight: 700, fontSize: '12px',
                          background: s.value === 'pending' ? '#7C3AED' : s.value === 'watching' ? '#06B6D4' : '#10B981',
                          color: 'white' }
                      : { borderColor: '#E5E7EB', fontWeight: 500, fontSize: '12px', color: '#9CA3AF', background: 'white' }
                    }
                  >
                    <span>{s.emoji}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }} className="block mb-2">
                Calificación
              </label>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set('rating', form.rating === n ? 0 : n)}
                      onMouseEnter={() => setHoverStar(n)}
                      onMouseLeave={() => setHoverStar(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={26}
                        className={n <= (hoverStar || form.rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-200 fill-gray-200'}
                      />
                    </button>
                  ))}
                </div>
                {(hoverStar || form.rating) > 0 && (
                  <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>
                    {RATING_LABELS[hoverStar || form.rating]}
                  </span>
                )}
              </div>
            </div>

            {/* Genres */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }} className="block mb-2">
                Géneros <span style={{ color: '#D1D5DB', fontWeight: 400 }}>({form.genres.length} seleccionados)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ALL_GENRES.map(g => {
                  const selected = form.genres.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGenre(g)}
                      className="px-3 py-2 rounded-xl border-2 transition-all text-center"
                      style={{
                        fontSize: '12px',
                        fontWeight: selected ? 700 : 500,
                        borderColor: selected ? '#7C3AED' : '#E5E7EB',
                        background: selected ? '#7C3AED' : 'white',
                        color: selected ? 'white' : '#6B7280',
                      }}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }} className="block mb-2">
                Notas personales
              </label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="¿Qué te pareció? ¿Con quién la viste? ¿Recomendada por...?"
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border outline-none resize-none transition-all"
                style={{ fontSize: '14px', borderColor: '#E5E7EB', background: '#F9FAFB', lineHeight: '1.6' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#A78BFA'; e.currentTarget.style.background = 'white'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#F9FAFB'; }}
              />
            </div>

            {/* Poster URL — collapsible */}
            <div>
              <button
                type="button"
                onClick={() => setShowPosterUrl(v => !v)}
                className="flex items-center gap-1.5 transition-colors"
                style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}
              >
                URL del poster (opcional)
                {showPosterUrl ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showPosterUrl && (
                <input
                  value={form.poster ?? ''}
                  onChange={e => set('poster', e.target.value || null)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 rounded-2xl border outline-none transition-all mt-2"
                  style={{ fontSize: '13px', borderColor: '#E5E7EB', background: '#F9FAFB' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#A78BFA'; e.currentTarget.style.background = 'white'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#F9FAFB'; }}
                />
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border-2 border-gray-200 transition-colors hover:bg-gray-50"
            style={{ fontSize: '14px', fontWeight: 600, color: '#6B7280' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.title.trim()}
            className="flex-1 py-3 rounded-2xl text-white transition-all"
            style={{
              fontSize: '14px',
              fontWeight: 700,
              background: form.title.trim() ? '#7C3AED' : '#C4B5FD',
              boxShadow: form.title.trim() ? '0 4px 14px rgba(124,58,237,0.3)' : 'none',
            }}
          >
            {isEdit ? 'Guardar cambios' : 'Agregar película'}
          </button>
        </div>
      </div>
    </div>
  );
}
