export type MovieStatus = 'pending' | 'watching' | 'watched';
export type ContentType = 'movie' | 'series';

export interface MovieComment {
  id: string;
  user: string;
  text: string;
  date: string;
}

export interface Movie {
  id: string;
  type: ContentType;           // movie or series
  title: string;
  year: number | null;
  poster: string | null;
  overview: string;
  genres: string[];
  platform: string;
  streamingPlatforms?: string[];
  status: MovieStatus;
  rating: number;
  notes: string;
  dateAdded: string;
  tmdbId?: number;
  // Series-only fields
  seasons?: number;
  episodes?: number;
  seriesStatus?: string;       // 'En emisión' | 'Finalizada' | 'Cancelada'
  currentSeason?: number;      // which season they're on
  
  // Social Collaboration Fields
  matchVotes?: Record<string, 'yes' | 'no'>;
  interestVotes?: string[];
  userRatings?: Record<string, number>;
  comments?: MovieComment[];
  watchingSince?: string;
}

export interface TMDBMovie {
  id: number;
  title: string;
  release_date: string;
  overview: string;
  poster_path: string | null;
  genre_ids: number[];
  vote_average: number;
}

export interface TMDBSeries {
  id: number;
  name: string;
  first_air_date: string;
  overview: string;
  poster_path: string | null;
  genre_ids: number[];
  vote_average: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
}

export const TMDB_GENRES: Record<number, string> = {
  28: 'Acción',
  12: 'Aventura',
  16: 'Animación',
  35: 'Comedia',
  80: 'Crimen',
  99: 'Documental',
  18: 'Drama',
  10751: 'Familia',
  14: 'Fantasía',
  36: 'Historia',
  27: 'Terror',
  10402: 'Música',
  9648: 'Misterio',
  10749: 'Romance',
  878: 'Ciencia Ficción',
  10770: 'Película de TV',
  53: 'Suspenso',
  10752: 'Bélica',
  37: 'Western',
  // TV-specific genres
  10759: 'Acción y Aventura',
  10762: 'Infantil',
  10763: 'Noticias',
  10764: 'Reality',
  10765: 'Sci-Fi y Fantasía',
  10766: 'Telenovela',
  10767: 'Talk Show',
  10768: 'War & Politics',
};

export const SERIES_STATUS_MAP: Record<string, string> = {
  'Returning Series': 'En emisión',
  'Ended':            'Finalizada',
  'Canceled':         'Cancelada',
  'In Production':    'En producción',
  'Planned':          'Planeada',
};

export const PLATFORMS = [
  'Netflix', 'Prime Video', 'Disney+', 'Max', 'Apple TV+',
  'Mubi', 'Crunchyroll', 'Paramount+', 'Cine', 'Otro',
];

export const PLATFORM_STYLE: Record<string, { bg: string; color: string }> = {
  'Netflix':              { bg: '#E50914', color: '#fff' },
  'Disney Plus':          { bg: '#113CCF', color: '#fff' },
  'Disney+':              { bg: '#113CCF', color: '#fff' },
  'Max':                  { bg: '#0027CA', color: '#fff' },
  'HBO Max':              { bg: '#6F00FF', color: '#fff' },
  'Amazon Prime Video':   { bg: '#00A8E0', color: '#fff' },
  'Prime Video':          { bg: '#00A8E0', color: '#fff' },
  'Apple TV Plus':        { bg: '#111', color: '#fff' },
  'Apple TV+':            { bg: '#111', color: '#fff' },
  'Paramount Plus':       { bg: '#0064FF', color: '#fff' },
  'Paramount+':           { bg: '#0064FF', color: '#fff' },
  'Mubi':                 { bg: '#181818', color: '#fff' },
  'Crunchyroll':          { bg: '#F47521', color: '#fff' },
  'Movistar Plus':        { bg: '#019DF4', color: '#fff' },
  'Movistar+':            { bg: '#019DF4', color: '#fff' },
  'Claro Video':          { bg: '#E2001A', color: '#fff' },
  'Tubi':                 { bg: '#FA5400', color: '#fff' },
  'Pluto TV':             { bg: '#FFC72C', color: '#111' },
  'Peacock':              { bg: '#000', color: '#fff' },
};

export function platformStyle(name: string): { bg: string; color: string } {
  return PLATFORM_STYLE[name] ?? { bg: '#6B7280', color: '#fff' };
}

export const ALL_GENRES = [
  'Acción', 'Aventura', 'Animación', 'Comedia', 'Crimen',
  'Documental', 'Drama', 'Familia', 'Fantasía', 'Historia',
  'Terror', 'Misterio', 'Romance', 'Ciencia Ficción', 'Suspenso',
  'Bélica', 'Western', 'Música',
];
