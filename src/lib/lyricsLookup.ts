import { supabase } from '@/integrations/supabase/client';

/**
 * Look up a song in the database and return the lyrics page URL if found.
 * Falls back to Google search URL if not found.
 * 
 * @param title - Song title from the songs.ts list
 * @param artist - Artist name from the songs.ts list
 * @returns Promise<{ type: 'internal' | 'external', url: string }>
 */
export async function findLyricsUrl(
  title: string,
  artist: string
): Promise<{ type: 'internal' | 'external'; url: string; songId?: string }> {
  const normalizedTitle = title.toLowerCase().trim();
  const normalizedArtist = artist.toLowerCase().trim();

  try {
    // Strategy 1: Exact title match (handles apostrophes, parentheses, special chars)
    const { data: exactData } = await supabase
      .from('songs')
      .select('id, titolo, artista, testo')
      .ilike('titolo', normalizedTitle)
      .limit(10);

    if (exactData && exactData.length > 0) {
      // Prefer exact title+artist match with lyrics
      const exactMatch = exactData.find(s => 
        s.testo && 
        s.artista.toLowerCase().trim() === normalizedArtist
      );
      
      if (exactMatch) {
        return { type: 'internal', url: `/lyrics/${exactMatch.id}`, songId: exactMatch.id };
      }

      // Fallback to any title match with lyrics
      const matchWithLyrics = exactData.find(s => s.testo);
      if (matchWithLyrics) {
        return { type: 'internal', url: `/lyrics/${matchWithLyrics.id}`, songId: matchWithLyrics.id };
      }
    }

    // Strategy 2: Search by artist and find partial title match
    const { data: artistData } = await supabase
      .from('songs')
      .select('id, titolo, artista, testo')
      .ilike('artista', `%${normalizedArtist}%`)
      .limit(30);

    if (artistData && artistData.length > 0) {
      // Find partial title match with lyrics
      const partialMatch = artistData.find(s => {
        if (!s.testo) return false;
        const dbTitle = s.titolo.toLowerCase().trim();
        // Check both directions for substring match
        return dbTitle.includes(normalizedTitle) || normalizedTitle.includes(dbTitle);
      });

      if (partialMatch) {
        return { type: 'internal', url: `/lyrics/${partialMatch.id}`, songId: partialMatch.id };
      }
    }

    // Strategy 3: Fuzzy match - remove parentheses and special chars
    const cleanTitle = normalizedTitle
      .replace(/\([^)]*\)/g, '') // Remove parentheses content
      .replace(/[''"]/g, '')     // Remove quotes/apostrophes
      .trim();

    if (cleanTitle !== normalizedTitle) {
      const { data: fuzzyData } = await supabase
        .from('songs')
        .select('id, titolo, artista, testo')
        .ilike('titolo', `%${cleanTitle}%`)
        .limit(20);

      if (fuzzyData && fuzzyData.length > 0) {
        const fuzzyMatch = fuzzyData.find(s => 
          s.testo && 
          s.artista.toLowerCase().includes(normalizedArtist.split('/')[0].trim())
        );

        if (fuzzyMatch) {
          return { type: 'internal', url: `/lyrics/${fuzzyMatch.id}`, songId: fuzzyMatch.id };
        }
      }
    }
  } catch (error) {
    console.error('Error looking up lyrics:', error);
  }

  // Fallback: Google search
  const searchQuery = encodeURIComponent(`${title} ${artist} testo`);
  return { type: 'external', url: `https://www.google.com/search?q=${searchQuery}` };
}

/**
 * Navigate to lyrics - either internal page or external Google search
 */
export async function openLyrics(
  title: string,
  artist: string,
  navigate: (path: string) => void
): Promise<void> {
  const result = await findLyricsUrl(title, artist);
  
  if (result.type === 'internal') {
    navigate(result.url);
  } else {
    window.open(result.url, '_blank');
  }
}
