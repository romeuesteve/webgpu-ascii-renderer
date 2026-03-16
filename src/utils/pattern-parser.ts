export interface PatternSegment {
  type: 'char' | 'segment';
  chars: string;
}

export interface ParsedPattern {
  segments: PatternSegment[];
  charCount: number;
}

export function parsePattern(pattern: string): ParsedPattern {
  const segments: PatternSegment[] = [];
  let i = 0;
  let charCount = 0;

  while (i < pattern.length) {
    if (pattern[i] === '[') {
      const endIndex = pattern.indexOf(']', i);
      if (endIndex === -1) {
        segments.push({ type: 'char', chars: pattern[i] });
        charCount++;
        i++;
      } else {
        const segmentContent = pattern.substring(i + 1, endIndex);
        segments.push({ type: 'segment', chars: segmentContent });
        charCount++;
        i = endIndex + 1;
      }
    } else {
      segments.push({ type: 'char', chars: pattern[i] });
      charCount++;
      i++;
    }
  }

  return { segments, charCount };
}

export function getPatternChar(
  parsedPattern: ParsedPattern,
  brightnessIndex: number,
  x: number,
  y: number
): string {
  const clampedIndex = Math.max(0, Math.min(brightnessIndex, parsedPattern.segments.length - 1));
  const segment = parsedPattern.segments[clampedIndex];

  if (segment.type === 'segment') {
    const pos = x + y;
    const charIndex = pos % segment.chars.length;
    return segment.chars[charIndex];
  }

  return segment.chars;
}
