import { supabase } from '@/integrations/supabase/client';

/**
 * Look up a song in the database and return the lyrics page URL if found.
 * Falls back to Google search URL if not found.
 * 
 * @param title - Song title from the songs.ts list
 * @param artist - Artist name from the songs.ts list
 * @returns Promise<{ type: 'internal' | 'external', url: string }>
 */
/**
 * Normalize a title for flexible matching:
 * - Converts "Avventura (Un')" to "unavventura" 
 * - Converts "Un'Avventura" to "unavventura"
 * - Handles L', Il, La, Un, Un', Una, etc.
 */
function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/\([^)]*\)/g, '') // Remove parentheses content like "(Un')"
    .replace(/['''`´""\"]/g, '') // Remove all quote types
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, '') // Remove spaces
    .trim();
}

/**
 * Extract the article if present at start or in parentheses at end
 * "Avventura (Un')" -> "un", "Un'Avventura" -> "un", "L'Amore" -> "l"
 */
function extractArticle(title: string): { article: string; base: string } {
  const lowerTitle = title.toLowerCase().trim();
  
  // Check for article in parentheses at end: "Avventura (Un')" 
  const parenMatch = lowerTitle.match(/^(.+?)\s*\((l'|il|la|lo|i|gli|le|un'?|una|uno)\)$/i);
  if (parenMatch) {
    return { 
      article: parenMatch[2].replace(/['`´]/g, ''), 
      base: parenMatch[1].trim() 
    };
  }
  
  // Check for article at start: "L'Avventura", "Un'Avventura", "La Canzone"
  const startMatch = lowerTitle.match(/^(l'|il\s|la\s|lo\s|i\s|gli\s|le\s|un'|una?\s|uno\s)(.+)$/i);
  if (startMatch) {
    return { 
      article: startMatch[1].replace(/['`´\s]/g, ''), 
      base: startMatch[2].trim() 
    };
  }
  
  return { article: '', base: lowerTitle };
}

export async function findLyricsUrl(
  title: string,
  artist: string
): Promise<{ type: 'internal' | 'external'; url: string; songId?: string }> {
  const normalizedTitle = normalizeForSearch(title);
  const normalizedArtist = artist.toLowerCase().trim();
  const { article, base } = extractArticle(title);

  try {
    // Strategy 1: Search by normalized base title (handles both formats)
    const searchTerms = [
      base, // "avventura" from both "Avventura (Un')" and "Un'Avventura"
      title.toLowerCase().trim(), // Original as-is
    ];
    
    // Add the full normalized version with article prepended
    if (article) {
      searchTerms.push(`${article}${base}`.replace(/\s+/g, ''));
    }

    for (const searchTerm of searchTerms) {
      const { data } = await supabase
        .from('songs')
        .select('id, titolo, artista, testo')
        .limit(50);

      if (data && data.length > 0) {
        // Find matches using normalized comparison
        const match = data.find(s => {
          if (!s.testo) return false;
          const dbNormalized = normalizeForSearch(s.titolo);
          const dbArtist = s.artista.toLowerCase();
          
          // Check if normalized versions match
          const titleMatch = dbNormalized === normalizedTitle || 
                            dbNormalized.includes(searchTerm) ||
                            searchTerm.includes(dbNormalized);
          
          // Check artist (handle multiple artists like "Artist1 / Artist2")                  
          const artistMatch = dbArtist.includes(normalizedArtist.split('/')[0].trim()) ||
                             normalizedArtist.includes(dbArtist.split('/')[0].trim());
          
          return titleMatch && artistMatch;
        });

        if (match) {
          return { type: 'internal', url: `/lyrics/${match.id}`, songId: match.id };
        }
        
        // Fallback: just title match with any song that has lyrics
        const titleOnlyMatch = data.find(s => {
          if (!s.testo) return false;
          const dbNormalized = normalizeForSearch(s.titolo);
          return dbNormalized === normalizedTitle;
        });
        
        if (titleOnlyMatch) {
          return { type: 'internal', url: `/lyrics/${titleOnlyMatch.id}`, songId: titleOnlyMatch.id };
        }
      }
      
      break; // Only need one successful query
    }

    // Strategy 2: Fuzzy artist search with partial title match
    const { data: artistData } = await supabase
      .from('songs')
      .select('id, titolo, artista, testo')
      .ilike('artista', `%${normalizedArtist.split('/')[0].trim()}%`)
      .limit(30);

    if (artistData && artistData.length > 0) {
      const fuzzyMatch = artistData.find(s => {
        if (!s.testo) return false;
        const dbNormalized = normalizeForSearch(s.titolo);
        // Partial match: either contains the other
        return dbNormalized.includes(normalizedTitle) || 
               normalizedTitle.includes(dbNormalized) ||
               dbNormalized.includes(base);
      });

      if (fuzzyMatch) {
        return { type: 'internal', url: `/lyrics/${fuzzyMatch.id}`, songId: fuzzyMatch.id };
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
