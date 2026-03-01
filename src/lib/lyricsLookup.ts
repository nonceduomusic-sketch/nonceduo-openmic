import { supabase } from '@/integrations/supabase/client';

/**
 * Normalize a title for flexible matching:
 * removes articles, parentheses, quotes, punctuation, spaces
 */
function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/\([^)]*\)/g, '') // Remove parentheses content
    .replace(/['''`´""\"]/g, '') // Remove quotes
    .replace(/[^\w\sàáâãäåèéêëìíîïòóôõöùúûüñç]/g, '') // Keep letters+accents
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Strip leading Italian articles for base comparison
 */
function stripArticle(text: string): string {
  return text
    .toLowerCase()
    .replace(/^(l'|l'|il\s+|la\s+|lo\s+|i\s+|gli\s+|le\s+|un'|un'\s*|una?\s+|uno\s+)/i, '')
    .trim();
}

/**
 * Extract article from parenthesized suffix: "Avventura (Un')" → base="avventura", article="un"
 */
function extractParenArticle(title: string): { base: string; withArticle: string } | null {
  const match = title.match(/^(.+?)\s*\((l'|il|la|lo|i|gli|le|un'?|una|uno)\)$/i);
  if (!match) return null;
  const base = match[1].trim().toLowerCase();
  const article = match[2].replace(/['''`´]/g, '').toLowerCase();
  return { base, withArticle: `${article}${base}`.replace(/\s+/g, '') };
}

/**
 * Look up a song in the database. ALWAYS returns an internal result.
 * If no match found, returns a fallback internal page.
 */
export async function findLyricsUrl(
  title: string,
  artist: string
): Promise<{ type: 'internal'; url: string; songId?: string; hasLyrics: boolean }> {
  const normalizedTitle = normalizeForSearch(title);
  const strippedTitle = stripArticle(title).replace(/[^\w]/g, '');
  const parenResult = extractParenArticle(title);

  // Build all normalized variants to try
  const titleVariants = new Set<string>();
  titleVariants.add(normalizedTitle);
  titleVariants.add(strippedTitle);
  if (parenResult) {
    titleVariants.add(normalizeForSearch(parenResult.base));
    titleVariants.add(parenResult.withArticle);
  }

  const normalizedArtist = artist.toLowerCase().trim().split('/')[0].trim();

  try {
    // Fetch songs matching artist (broad match)
    const { data } = await supabase
      .from('songs')
      .select('id, titolo, artista, testo')
      .ilike('artista', `%${normalizedArtist}%`)
      .limit(100);

    if (data && data.length > 0) {
      // Try to find a match using all title variants
      const match = data.find(s => {
        const dbNorm = normalizeForSearch(s.titolo);
        const dbStripped = stripArticle(s.titolo).replace(/[^\w]/g, '');
        const dbParen = extractParenArticle(s.titolo);

        const dbVariants = new Set<string>();
        dbVariants.add(dbNorm);
        dbVariants.add(dbStripped);
        if (dbParen) {
          dbVariants.add(normalizeForSearch(dbParen.base));
          dbVariants.add(dbParen.withArticle);
        }

        // Check if ANY variant from search matches ANY variant from DB
        for (const tv of titleVariants) {
          for (const dv of dbVariants) {
            if (tv === dv) return true;
            if (tv.length > 3 && dv.length > 3 && (tv.includes(dv) || dv.includes(tv))) return true;
          }
        }
        return false;
      });

      if (match) {
        return { type: 'internal', url: `/lyrics/${match.id}`, songId: match.id, hasLyrics: !!match.testo };
      }
    }

    // Broader search: just by title if artist didn't match
    const { data: titleData } = await supabase
      .from('songs')
      .select('id, titolo, artista, testo')
      .limit(200);

    if (titleData && titleData.length > 0) {
      const titleMatch = titleData.find(s => {
        const dbNorm = normalizeForSearch(s.titolo);
        const dbStripped = stripArticle(s.titolo).replace(/[^\w]/g, '');
        for (const tv of titleVariants) {
          if (tv === dbNorm || tv === dbStripped) return true;
        }
        return false;
      });

      if (titleMatch) {
        return { type: 'internal', url: `/lyrics/${titleMatch.id}`, songId: titleMatch.id, hasLyrics: !!titleMatch.testo };
      }
    }
  } catch (error) {
    console.error('Error looking up lyrics:', error);
  }

  // NEVER go to Google. Return internal "not found" page.
  return { type: 'internal', url: '/lyrics/not-found', hasLyrics: false };
}

/**
 * Navigate to lyrics - always internal
 */
export async function openLyrics(
  title: string,
  artist: string,
  navigate: (path: string) => void
): Promise<void> {
  const result = await findLyricsUrl(title, artist);
  navigate(result.url);
}
