import type { Album } from './types';

export type AlbumVisualMood = {
  paletteName: string;
  className: string;
  accentWords: string[];
  motifs: string[];
};

export type VisualReferenceOption = {
  label: string;
  description: string;
  url: string;
};

type MoodInput = Pick<Album, 'title' | 'artist' | 'year' | 'genre'> & {
  themes?: string[];
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function textBag(album: MoodInput) {
  return [album.title, album.artist, album.genre, ...(album.themes ?? [])].join(' ').toLowerCase();
}

export function albumVisualMood(album: MoodInput): AlbumVisualMood {
  const bag = textBag(album);

  if (bag.includes('dark side') || bag.includes('space') || bag.includes('studio-as-instrument') || bag.includes('mortality')) {
    return {
      paletteName: 'Cosmic prism',
      className: 'mood-cosmic-prism',
      accentWords: ['heartbeat', 'prism', 'mortality'],
      motifs: ['orbit', 'pulse', 'spectrum', 'eclipse', 'waveform']
    };
  }

  if (bag.includes('soul') || bag.includes('funk') || bag.includes('marvin') || bag.includes('social consciousness')) {
    return {
      paletteName: 'Soul sunrise',
      className: 'mood-soul-sunrise',
      accentWords: ['warmth', 'streetlight', 'testimony'],
      motifs: ['sun', 'vinyl', 'signal', 'halo', 'groove']
    };
  }

  if (bag.includes('punk') || bag.includes('clash') || bag.includes('conflict') || bag.includes('war')) {
    return {
      paletteName: 'Electric unrest',
      className: 'mood-electric-unrest',
      accentWords: ['static', 'pressure', 'riot'],
      motifs: ['bolt', 'cutout', 'sirens', 'grit', 'signal']
    };
  }

  if (bag.includes('jazz') || bag.includes('blue') || bag.includes('melancholy')) {
    return {
      paletteName: 'Midnight blue',
      className: 'mood-midnight-blue',
      accentWords: ['smoke', 'blue hour', 'silence'],
      motifs: ['moon', 'smoke', 'brush', 'window', 'breath']
    };
  }

  return {
    paletteName: album.year < 1970 ? 'Analog glow' : 'Deep vinyl',
    className: `mood-${album.year < 1970 ? 'analog-glow' : 'deep-vinyl'}`,
    accentWords: ['needle', 'sleeve', 'room tone'],
    motifs: ['ring', 'grain', 'wave', 'spark', slug(album.genre ?? 'album')]
  };
}

export function youtubeAlbumSearchUrl(album: Pick<Album, 'artist' | 'title'>) {
  const query = `${album.artist} ${album.title} official full album visualizer`;
  return `https://www.youtube.com/results?${new URLSearchParams({ search_query: query }).toString()}`;
}

export function wikipediaArtistUrl(artist: string) {
  return `https://en.wikipedia.org/wiki/${artist.trim().replace(/\s+/g, '_')}`;
}

export function wikimediaCommonsSearchUrl(query: string) {
  return `https://commons.wikimedia.org/w/index.php?${new URLSearchParams({
    search: query.trim(),
    title: 'Special:MediaSearch',
    type: 'image'
  }).toString()}`;
}

export function albumVisualReferenceOptions(
  album: Pick<Album, 'artist' | 'title'>,
  owned: boolean
): VisualReferenceOption[] {
  const youtubeOption = {
    label: 'Visualizer search',
    description: 'Find official full-album videos, live footage, or visualizers without storing third-party images.',
    url: youtubeAlbumSearchUrl(album)
  };

  if (!owned) return [youtubeOption];

  return [
    {
      label: 'Artist page',
      description: 'Open the Wikipedia artist page first; use images only when license and attribution are clear.',
      url: wikipediaArtistUrl(album.artist)
    },
    {
      label: 'Commons images',
      description: 'Search Wikimedia Commons for reusable artist/band photos with source and license metadata.',
      url: wikimediaCommonsSearchUrl(`${album.artist} band`)
    },
    youtubeOption
  ];
}
