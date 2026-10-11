import { CalendarDays } from 'lucide-react';
import type { Movie } from '../types';
import { formatActivityDate } from '../movieActivity';

export function MovieDates({ movie, compact = false }: { movie: Movie; compact?: boolean }) {
  const entries = [
    { label: 'Agregada', date: movie.dateAdded },
    ...(movie.startedWatchingAt || movie.status === 'watching' ? [{ label: 'Empezaste a verla', date: movie.startedWatchingAt }] : []),
    ...(movie.lastWatchedAt || movie.status === 'watched' ? [{ label: 'Última visualización', date: movie.lastWatchedAt }] : []),
    ...(!compact && movie.statusChangedAt ? [{ label: 'Último cambio de estado', date: movie.statusChangedAt }] : []),
  ];
  return <div className={compact ? 'mb-3 space-y-1 text-[11px] text-gray-500 dark:text-gray-400' : 'rounded-2xl border border-gray-100 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-800/80 p-4'}>
    {!compact && <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"><CalendarDays size={14} />Fechas y actividad</h3>}
    <dl className={compact ? 'space-y-1' : 'space-y-3 text-sm'}>
      {entries.map(entry => <div key={entry.label} className={compact ? 'flex flex-wrap gap-x-1' : ''}>
        <dt className={compact ? '' : 'text-xs text-gray-500 dark:text-gray-400 mb-0.5'}>{entry.label}{compact ? ':' : ''}</dt>
        <dd className={compact ? '' : 'text-gray-800 dark:text-gray-200'}>
          {entry.date && Number.isFinite(new Date(entry.date).getTime()) ? <time dateTime={entry.date} title={formatActivityDate(entry.date)}>{formatActivityDate(entry.date, compact)}</time> : 'Sin fecha registrada'}
        </dd>
      </div>)}
    </dl>
    {!compact && <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">El inicio se registra al pasar a «Viendo» y la visualización al marcar como «Visto». Las fechas antiguas que no se guardaron no están disponibles.</p>}
    {!compact && !!movie.watchHistory?.length && <details className="mt-3 text-xs text-gray-600 dark:text-gray-300">
      <summary className="cursor-pointer">Historial de visualizaciones ({movie.watchHistory.length})</summary>
      <ul className="mt-2 space-y-1">{[...movie.watchHistory].reverse().map((date, index) => <li key={`${date}-${index}`}>{formatActivityDate(date)}</li>)}</ul>
    </details>}
  </div>;
}
