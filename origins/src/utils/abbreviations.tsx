// origins/src/utils/abbreviations.tsx

import abbreviationsData from '../abbv.json';
import React from 'react';

export const abbreviations: Record<string, string> = abbreviationsData as Record<string, string>;

/**
 * Checks if an abbreviation appears in a context where it should be expanded
 * Abbreviations should typically appear:
 * - Followed by a period (like "E." or "S.")
 * - In parentheses (like "(E)" or "(S)")
 * - After certain punctuation that indicates abbreviation usage
 */
function isAbbreviationContext(text: string, abbrev: string, matchIndex: number): boolean {
  const afterMatch = text.substring(matchIndex + abbrev.length);
  const beforeMatch = text.substring(0, matchIndex);
  
  // For single letters, be EXTREMELY restrictive
  if (abbrev.length === 1) {
    // Don't expand if it's part of a Roman numeral pattern at start of line
    if (/^[IVX]+\.\s+[A-Z]/.test(text.trim())) {
      return false;
    }
    // ONLY expand if immediately followed by a period (like "E." or "P.")
    if (!/^\./.test(afterMatch)) {
      return false;
    }
    // Check if in parentheses (like "(E)" or "(P)")
    const beforeContext = beforeMatch.slice(-10);
    const afterContext = afterMatch.slice(0, 10);
    if (beforeContext.includes('(') && afterContext.includes(')')) {
      return true;
    }
    // Only allow if immediately followed by period
    return /^\./.test(afterMatch);
  }
  
  // For two-letter abbreviations, be restrictive
  if (abbrev.length === 2) {
    // Only expand if followed by period, comma, or in parentheses
    if (/^[.,]/.test(afterMatch)) {
      return true;
    }
    // Check if in parentheses
    const beforeContext = beforeMatch.slice(-10);
    const afterContext = afterMatch.slice(0, 10);
    if (beforeContext.includes('(') && afterContext.includes(')')) {
      return true;
    }
    return false;
  }
  
  // For longer abbreviations, use more permissive logic
  if (/^\./.test(afterMatch)) {
    return true;
  }
  
  const beforeContext = beforeMatch.slice(-10);
  const afterContext = afterMatch.slice(0, 10);
  if (beforeContext.includes('(') && afterContext.includes(')')) {
    return true;
  }
  
  return /^[\s\p{P}]/u.test(afterMatch);
}

/**
 * Replaces abbreviations in text with their full forms in brackets and bolded
 * @param text - The definition text to process
 * @returns Processed text with abbreviations replaced
 */
export function expandAbbreviations(text: string): string {
  let processed = text;
  
  // Sort abbreviations by length (longest first) to avoid partial matches
  const sortedAbbrevs = Object.keys(abbreviations).sort((a, b) => b.length - a.length);
  
  for (const abbrev of sortedAbbrevs) {
    // Skip single-letter Roman numerals (I, V, X) when they're part of section headings
    if (abbrev.length === 1 && /^[IVX]$/.test(abbrev)) {
      const regex = new RegExp(
        `(^|[\\s\\p{P}])${abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![IVX]*\\.\\s+[A-Z])(?=\\.)`, 
        'gu'
      );
      const replacements: Array<{start: number, end: number, replacement: string}> = [];
      let match;
      let lastIndex = 0;
      let iterations = 0;
      const maxIterations = 1000;
      
      while ((match = regex.exec(processed)) !== null && iterations < maxIterations) {
        iterations++;
        if (match.index === lastIndex) {
          break;
        }
        lastIndex = match.index;
        
        const matchIndex = match.index + match[1].length;
        if (isAbbreviationContext(processed, abbrev, matchIndex)) {
          replacements.push({
            start: match.index,
            end: match.index + match[0].length,
            replacement: `${match[1]}**[${abbreviations[abbrev]}]**`
          });
        }
      }
      
      for (let i = replacements.length - 1; i >= 0; i--) {
        const rep = replacements[i];
        processed = processed.substring(0, rep.start) + rep.replacement + processed.substring(rep.end);
      }
    } 
    // For single-letter abbreviations (non-Roman), be very restrictive
    else if (abbrev.length === 1) {
      const regex = new RegExp(
        `(^|[\\s\\p{P}])${abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\.)`, 
        'gu'
      );
      
      const replacements: Array<{start: number, end: number, replacement: string}> = [];
      let match;
      let lastIndex = 0;
      let iterations = 0;
      const maxIterations = 1000;
      
      while ((match = regex.exec(processed)) !== null && iterations < maxIterations) {
        iterations++;
        if (match.index === lastIndex) {
          break;
        }
        lastIndex = match.index;
        
        const matchIndex = match.index + match[1].length;
        if (isAbbreviationContext(processed, abbrev, matchIndex)) {
          replacements.push({
            start: match.index,
            end: match.index + match[0].length,
            replacement: `${match[1]}**[${abbreviations[abbrev]}]**`
          });
        }
      }
      
      for (let i = replacements.length - 1; i >= 0; i--) {
        const rep = replacements[i];
        processed = processed.substring(0, rep.start) + rep.replacement + processed.substring(rep.end);
      }
    } 
    // For two-letter abbreviations
    else if (abbrev.length === 2) {
      const regex = new RegExp(
        `(^|[\\s\\p{P}])${abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[.,])(?!\\n)`, 
        'gu'
      );
      
      const replacements: Array<{start: number, end: number, replacement: string}> = [];
      let match;
      let lastIndex = 0;
      let iterations = 0;
      const maxIterations = 1000;
      
      while ((match = regex.exec(processed)) !== null && iterations < maxIterations) {
        iterations++;
        if (match.index === lastIndex) {
          break;
        }
        lastIndex = match.index;
        
        const matchIndex = match.index + match[1].length;
        const afterMatch = processed.substring(matchIndex + abbrev.length, matchIndex + abbrev.length + 1);
        if (afterMatch === '\n') {
          continue;
        }
        if (isAbbreviationContext(processed, abbrev, matchIndex)) {
          replacements.push({
            start: match.index,
            end: match.index + match[0].length,
            replacement: `${match[1]}**[${abbreviations[abbrev]}]**`
          });
        }
      }
      
      for (let i = replacements.length - 1; i >= 0; i--) {
        const rep = replacements[i];
        processed = processed.substring(0, rep.start) + rep.replacement + processed.substring(rep.end);
      }
    }
    else {
      // For longer abbreviations, use context-aware matching
      const regex = new RegExp(
        `(^|[\\s\\p{P}])${abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[\\s\\p{P}]|$)(?!\\n)`, 
        'gu'
      );
      
      const replacements: Array<{start: number, end: number, replacement: string}> = [];
      let match;
      let lastIndex = 0;
      let iterations = 0;
      const maxIterations = 1000;
      
      while ((match = regex.exec(processed)) !== null && iterations < maxIterations) {
        iterations++;
        if (match.index === lastIndex) {
          break;
        }
        lastIndex = match.index;
        
        const matchIndex = match.index + match[1].length;
        const afterMatch = processed.substring(matchIndex + abbrev.length, matchIndex + abbrev.length + 1);
        if (afterMatch === '\n') {
          continue;
        }
        if (isAbbreviationContext(processed, abbrev, matchIndex)) {
          replacements.push({
            start: match.index,
            end: match.index + match[0].length,
            replacement: `${match[1]}**[${abbreviations[abbrev]}]**`
          });
        }
      }
      
      for (let i = replacements.length - 1; i >= 0; i--) {
        const rep = replacements[i];
        processed = processed.substring(0, rep.start) + rep.replacement + processed.substring(rep.end);
      }
    }
  }
  
  return processed;
}

/**
 * Converts markdown-style bold (**text**) to React JSX with bold styling
 * @param text - Text with markdown-style bold markers
 * @returns Array of React elements or strings
 */
export function renderWithBold(text: string): (string | React.ReactElement)[] {
  const parts: (string | React.ReactElement)[] = [];
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  
  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <strong key={key++} className="font-bold">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}