/**
 * ChordPro Parser and Transposer
 * Parses .cho files and provides chord transposition functionality
 */

// Chromatic scale for transposition
const CHROMATIC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMATIC_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export interface ChordProLine {
  type: 'text' | 'chord-text' | 'directive' | 'comment' | 'empty';
  text: string;
  chords?: { chord: string; position: number }[];
  directiveKey?: string;
  directiveValue?: string;
}

export interface ChordProSong {
  title: string;
  artist: string;
  key?: string;
  capo?: number;
  tempo?: string;
  lines: ChordProLine[];
  rawContent: string;
}

/**
 * Parse ChordPro content into structured data
 */
export function parseChordPro(content: string): ChordProSong {
  const lines = content.split('\n');
  const parsedLines: ChordProLine[] = [];
  
  let title = '';
  let artist = '';
  let key = '';
  let capo = 0;
  let tempo = '';

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Empty line
    if (!trimmed) {
      parsedLines.push({ type: 'empty', text: '' });
      continue;
    }
    
    // Comment line
    if (trimmed.startsWith('#')) {
      parsedLines.push({ type: 'comment', text: trimmed.substring(1).trim() });
      continue;
    }
    
    // Directive (e.g., {title: Song Name})
    const directiveMatch = trimmed.match(/^\{([^:}]+)(?::(.+))?\}$/);
    if (directiveMatch) {
      const directiveKey = directiveMatch[1].toLowerCase().trim();
      const directiveValue = directiveMatch[2]?.trim() || '';
      
      // Extract metadata
      switch (directiveKey) {
        case 'title':
        case 't':
          title = directiveValue;
          break;
        case 'artist':
        case 'a':
        case 'subtitle':
        case 'st':
          artist = directiveValue;
          break;
        case 'key':
          key = directiveValue;
          break;
        case 'capo':
          capo = parseInt(directiveValue) || 0;
          break;
        case 'tempo':
          tempo = directiveValue;
          break;
      }
      
      parsedLines.push({
        type: 'directive',
        text: trimmed,
        directiveKey,
        directiveValue,
      });
      continue;
    }
    
    // Line with chords in brackets
    const chordRegex = /\[([^\]]+)\]/g;
    const hasChords = chordRegex.test(trimmed);
    
    if (hasChords) {
      // Reset regex
      chordRegex.lastIndex = 0;
      
      const chords: { chord: string; position: number }[] = [];
      let textOnly = '';
      let lastIndex = 0;
      let positionOffset = 0;
      
      let match;
      while ((match = chordRegex.exec(trimmed)) !== null) {
        // Add text before this chord
        const textBefore = trimmed.substring(lastIndex, match.index);
        textOnly += textBefore;
        
        // Record chord position (in the text-only string)
        chords.push({
          chord: match[1],
          position: textOnly.length,
        });
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text
      textOnly += trimmed.substring(lastIndex);
      
      parsedLines.push({
        type: 'chord-text',
        text: textOnly,
        chords,
      });
    } else {
      parsedLines.push({ type: 'text', text: trimmed });
    }
  }

  return {
    title,
    artist,
    key: key || undefined,
    capo: capo || undefined,
    tempo: tempo || undefined,
    lines: parsedLines,
    rawContent: content,
  };
}

/**
 * Extract just the title from a ChordPro file
 */
export function extractChordProTitle(content: string): { title: string; artist: string } {
  const titleMatch = content.match(/\{(?:title|t):([^}]+)\}/i);
  const artistMatch = content.match(/\{(?:artist|a|subtitle|st):([^}]+)\}/i);
  
  return {
    title: titleMatch?.[1]?.trim() || 'Untitled',
    artist: artistMatch?.[1]?.trim() || '',
  };
}

/**
 * Transpose a chord by a number of semitones
 */
export function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord;
  
  // Normalize semitones to 0-11 range
  const steps = ((semitones % 12) + 12) % 12;
  if (steps === 0) return chord;
  
  // Match root note (with optional sharp/flat) and suffix
  const match = chord.match(/^([A-G])([#b])?(.*)$/);
  if (!match) return chord;
  
  const [, root, accidental, suffix] = match;
  const noteWithAccidental = root + (accidental || '');
  
  // Find current position
  let currentIndex = CHROMATIC_SHARP.indexOf(noteWithAccidental);
  if (currentIndex === -1) {
    currentIndex = CHROMATIC_FLAT.indexOf(noteWithAccidental);
  }
  if (currentIndex === -1) {
    // Try just the root
    currentIndex = CHROMATIC_SHARP.indexOf(root);
    if (currentIndex === -1) return chord;
  }
  
  // Calculate new position
  const newIndex = (currentIndex + steps) % 12;
  
  // Prefer sharp or flat based on original chord
  const useFlat = accidental === 'b';
  const newNote = useFlat ? CHROMATIC_FLAT[newIndex] : CHROMATIC_SHARP[newIndex];
  
  return newNote + suffix;
}

/**
 * Transpose all chords in a parsed song
 */
export function transposeSong(song: ChordProSong, semitones: number): ChordProSong {
  if (semitones === 0) return song;
  
  return {
    ...song,
    key: song.key ? transposeChord(song.key, semitones) : undefined,
    lines: song.lines.map(line => {
      if (line.type !== 'chord-text' || !line.chords) return line;
      
      return {
        ...line,
        chords: line.chords.map(c => ({
          ...c,
          chord: transposeChord(c.chord, semitones),
        })),
      };
    }),
  };
}

/**
 * Render a ChordPro song to plain text (lyrics only)
 */
export function renderLyricsOnly(song: ChordProSong): string {
  return song.lines
    .filter(l => l.type === 'text' || l.type === 'chord-text')
    .map(l => l.text)
    .join('\n');
}

/**
 * Render a ChordPro song with chords above lyrics
 */
export function renderWithChords(song: ChordProSong): string {
  const result: string[] = [];
  
  for (const line of song.lines) {
    if (line.type === 'empty') {
      result.push('');
      continue;
    }
    
    if (line.type === 'comment') {
      continue; // Skip comments in output
    }
    
    if (line.type === 'directive') {
      // Only show certain directives
      if (['chorus', 'verse', 'bridge', 'tab', 'grid'].includes(line.directiveKey || '')) {
        result.push(`[${line.directiveValue || line.directiveKey}]`);
      }
      continue;
    }
    
    if (line.type === 'text') {
      result.push(line.text);
      continue;
    }
    
    if (line.type === 'chord-text' && line.chords && line.chords.length > 0) {
      // Build chord line
      let chordLine = '';
      let lastPos = 0;
      
      for (const { chord, position } of line.chords) {
        // Add spaces to reach the position
        while (chordLine.length < position) {
          chordLine += ' ';
        }
        chordLine += chord;
        lastPos = chordLine.length;
      }
      
      // Only add chord line if it has content
      if (chordLine.trim()) {
        result.push(chordLine);
      }
      result.push(line.text);
    }
  }
  
  return result.join('\n');
}

/**
 * Convert ChordPro back to raw format (for editing)
 */
export function toChordProFormat(song: ChordProSong): string {
  const lines: string[] = [];
  
  // Add metadata
  if (song.title) lines.push(`{title: ${song.title}}`);
  if (song.artist) lines.push(`{artist: ${song.artist}}`);
  if (song.key) lines.push(`{key: ${song.key}}`);
  if (song.capo) lines.push(`{capo: ${song.capo}}`);
  if (song.tempo) lines.push(`{tempo: ${song.tempo}}`);
  
  // Add empty line after metadata
  if (lines.length > 0) lines.push('');
  
  // Add content lines
  for (const line of song.lines) {
    if (line.type === 'empty') {
      lines.push('');
    } else if (line.type === 'directive') {
      lines.push(line.text);
    } else if (line.type === 'comment') {
      lines.push(`# ${line.text}`);
    } else if (line.type === 'chord-text' && line.chords) {
      // Rebuild line with chords in brackets
      let result = '';
      let lastPos = 0;
      
      // Sort chords by position (descending) to insert from end
      const sortedChords = [...line.chords].sort((a, b) => b.position - a.position);
      let text = line.text;
      
      // Insert chords from end to start to maintain positions
      for (const { chord, position } of sortedChords) {
        const before = text.substring(0, position);
        const after = text.substring(position);
        text = before + `[${chord}]` + after;
      }
      
      lines.push(text);
    } else {
      lines.push(line.text);
    }
  }
  
  return lines.join('\n');
}
