import abbreviationsData from '../../public/abbv.json';

export const abbreviations: Record<string, string> = abbreviationsData as Record<string, string>;

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
      // Create regex to match abbreviation as whole word (not part of another word)
      // Match abbreviations that are:
      // - At start of string or after space/punctuation
      // - Followed by space, punctuation, or end of string
      const regex = new RegExp(`(^|[\\s\\p{P}])${abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[\\s\\p{P}]|$)`, 'gu');
      
      processed = processed.replace(regex, (match, prefix) => {
        const fullForm = abbreviations[abbrev];
        return `${prefix}**[${fullForm}]**`;
      });
    }
    
    return processed;
  }
  
  /**
   * Converts markdown-style bold (**text**) to React JSX with bold styling
   * @param text - Text with markdown-style bold markers
   * @returns Array of React elements or strings
   */
  export function renderWithBold(text: string): (string | JSX.Element)[] {
    const parts: (string | JSX.Element)[] = [];
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let lastIndex = 0;
    let match;
    let key = 0;
    
    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the bold
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Add the bold text
      parts.push(
        <strong key={key++} className="font-bold">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : [text];
  }
