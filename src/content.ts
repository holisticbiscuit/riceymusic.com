// ---------------------------------------------------------------------------
// Site content. Everything editable lives here so copy changes never mean
// touching layout code.
//
// TO FILL IN: the three empty release links below. A platform only renders
// once it has a URL, so nothing on the site is ever a dead link.
// ---------------------------------------------------------------------------

export const EMAIL = 'contact@riceymusic.com'
export const INSTAGRAM = 'https://www.instagram.com/riceymusic/'
export const SOUNDCLOUD = 'https://soundcloud.com/riceymusic'
export const SPOTIFY_TRACK = 'https://open.spotify.com/track/6IcqC8WxfxqSkZU4AEIV3c'

export const FACTS: [string, string][] = [
  ['Based', 'London, UK'],
  ['Genre', 'House, Techno, Progressive'],
  ['Label', 'mau5trap'],
  ['Also', 'Mixing & Mastering'],
]

export const RELEASE = {
  title: 'Years',
  label: 'mau5trap',
  year: '2026',
  format: 'Single',
  art: '/images/years.jpg',
  blurb:
    'Ricey’s debut single on mau5trap. Progressive house. Personal. About time passing and everything you carry with you when it does.',
  links: [
    { name: 'Spotify', url: SPOTIFY_TRACK },
    { name: 'Apple Music', url: '' },
    { name: 'Beatport', url: '' },
    { name: 'YouTube', url: '' },
  ],
}

// Add real quotes only. Each needs the words and who said them.
// e.g. { quote: 'Huge record.', source: 'deadmau5', context: 'mau5trap radio' }
export const SUPPORT: { quote: string; source: string; context?: string }[] = []

// Paste a Spotify playlist URL here once it exists and the section appears.
export const PLAYLIST = { url: '', title: 'On rotation' }

export const RATES = [
  {
    name: 'Mastering',
    desc: 'A single track, finished for release. Loud where it should be, clear everywhere it plays.',
    price: '£50',
    unit: '/ track',
  },
  {
    name: 'Stem Mastering',
    desc: 'The same finish, working from grouped stems. More room to move when the mix calls for it.',
    price: '£50',
    unit: '+ £10 / stem',
  },
]

export const CREDITS =
  'Tracks mastered here have been released through Sony Music, Columbia Records, Polydor, Virgin Music, Universal Music Group and The Orchard.'
