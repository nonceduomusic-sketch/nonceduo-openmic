import React from 'react';
import type { ChordProSong, ChordProLine } from './chordpro';

/**
 * Responsive ChordPro renderer.
 * 
 * Each chord-text line is split into segments: each segment is an inline-block
 * <span> containing the chord above and the syllable below. This ensures chords
 * stay aligned with their text even when lines wrap on narrow screens.
 */

interface ChordSegment {
  chord: string;
  text: string;
}

/**
 * Split a chord-text line into segments where each segment
 * pairs a chord (or empty) with the text that follows it.
 */
function splitIntoSegments(line: ChordProLine): ChordSegment[] {
  if (!line.chords || line.chords.length === 0) {
    return [{ chord: '', text: line.text }];
  }

  const segments: ChordSegment[] = [];
  const text = line.text;
  let lastPos = 0;

  for (let i = 0; i < line.chords.length; i++) {
    const { chord, position } = line.chords[i];
    const nextPos = i < line.chords.length - 1 ? line.chords[i + 1].position : text.length;

    // Text before first chord (no chord above it)
    if (i === 0 && position > 0) {
      segments.push({ chord: '', text: text.substring(0, position) });
    }

    // This chord's segment: from this chord's position to the next chord's position
    segments.push({
      chord,
      text: text.substring(position, nextPos),
    });

    lastPos = nextPos;
  }

  // Any remaining text after last chord
  if (lastPos < text.length) {
    segments.push({ chord: '', text: text.substring(lastPos) });
  }

  return segments;
}

interface RenderOptions {
  /** Show chords colored with primary color */
  coloredChords?: boolean;
  /** Custom chord CSS class */
  chordClassName?: string;
}

/**
 * Render a single chord-text line responsively.
 * Returns inline-block segments that wrap correctly on any screen width.
 */
export function renderResponsiveChordLine(
  line: ChordProLine,
  options: RenderOptions = {}
): React.ReactNode {
  const { coloredChords = true, chordClassName } = options;
  const segments = splitIntoSegments(line);

  const chordClass = chordClassName || (coloredChords ? 'text-primary' : 'text-muted-foreground');

  return (
    <span className="inline leading-normal">
      {segments.map((seg, i) => (
        <span
          key={i}
          className="inline-block align-bottom"
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {/* Chord row - only render if there's a chord */}
          <span
            className={`block font-bold text-[0.85em] leading-tight min-h-[1.1em] ${chordClass}`}
          >
            {seg.chord || '\u00A0'}
          </span>
          {/* Text row */}
          <span className="block leading-normal">
            {seg.text || '\u00A0'}
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * Render an entire ChordPro song with responsive chord alignment.
 * Each line gets a `data-line` attribute for scroll sync.
 */
export function renderResponsiveSong(
  song: ChordProSong,
  options: RenderOptions = {}
): React.ReactNode[] {
  const result: React.ReactNode[] = [];

  song.lines.forEach((line, index) => {
    if (line.type === 'empty') {
      result.push(<div key={`e-${index}`} data-line={index} className="h-4" />);
      return;
    }
    if (line.type === 'comment' || line.type === 'directive') {
      // Show section markers (chorus, verse, etc.)
      if (line.type === 'directive' && ['chorus', 'verse', 'bridge', 'tab', 'grid', 'soc', 'eoc', 'sov', 'eov'].includes(line.directiveKey || '')) {
        const label = line.directiveValue || line.directiveKey;
        if (label && !['soc', 'eoc', 'sov', 'eov'].includes(line.directiveKey || '')) {
          result.push(
            <div key={`d-${index}`} data-line={index} className="mt-3 mb-1">
              <span className="text-[0.75em] uppercase tracking-wider text-muted-foreground font-semibold">
                {label}
              </span>
            </div>
          );
        }
      }
      return;
    }
    if (line.type === 'text') {
      result.push(
        <div key={`t-${index}`} data-line={index} className="leading-normal">
          {line.text}
        </div>
      );
      return;
    }
    if (line.type === 'chord-text' && line.chords && line.chords.length > 0) {
      result.push(
        <div key={`ct-${index}`} data-line={index} className="leading-normal">
          {renderResponsiveChordLine(line, options)}
        </div>
      );
    }
  });

  return result;
}

/**
 * Render song as plain text lines (no chords) with data-line attrs.
 */
export function renderLyricsOnlyNodes(song: ChordProSong): React.ReactNode[] {
  const result: React.ReactNode[] = [];

  song.lines.forEach((line, index) => {
    if (line.type === 'empty') {
      result.push(<div key={`e-${index}`} data-line={index} className="h-4" />);
      return;
    }
    if (line.type === 'comment' || line.type === 'directive') return;
    if (line.type === 'text' || line.type === 'chord-text') {
      result.push(
        <div key={`t-${index}`} data-line={index} className="leading-normal">
          {line.text}
        </div>
      );
    }
  });

  return result;
}
