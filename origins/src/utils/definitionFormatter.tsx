// origins/src/utils/definitionFormatter.tsx
import React from 'react';
import { renderWithBold } from './abbreviations';
import { type DictionaryEntry } from '../types';

type StructuredSection = {
  type: 'main_heading' | 'subheading' | 'paragraph' | 'spacing';
  text?: string;
  expanded?: string;
};

type DefinitionObject = {
  main?: string;
  headings?: Array<{
    title?: string;
    /** Nested content blocks under this heading (content-only, no separate subheading titles). */
    subheadings?: Array<{ content?: string }>;
  }>;
};

export function renderFormattedDefinition(
  definition: string | { structured?: StructuredSection[] } | DictionaryEntry
): React.ReactElement {
  // Handle null/undefined
  if (definition === null || definition === undefined) {
    return <div>No definition available</div>;
  }
  
  // Handle DictionaryEntry object (has 'word' property)
  if (typeof definition === 'object' && definition !== null && 'word' in definition) {
    const entry = definition as DictionaryEntry;
    
    // First check structured data
    if (entry.structured && entry.structured.length > 0) {
      return renderStructuredDefinition(entry.structured);
    }
    
    // Check if definition is an object with a 'main' property
    if (entry.definition && typeof entry.definition === 'object' && 'main' in entry.definition) {
      return renderDefinitionObject(entry.definition as DefinitionObject);
    }
    
    // Fallback to definition string (check it's not null and has content)
    if (entry.definition && typeof entry.definition === 'string' && entry.definition.trim()) {
      return renderLegacyDefinition(entry.definition);
    }
    
    // Fallback to main field at entry level
    if (entry.main && typeof entry.main === 'string' && entry.main.trim()) {
      return renderLegacyDefinition(entry.main);
    }
    
    // No definition available
    return <div>No definition available</div>;
  }
  
  // Check if we have structured data (object with structured property but not DictionaryEntry)
  if (typeof definition === 'object' && definition !== null && 'structured' in definition && definition.structured) {
    return renderStructuredDefinition(definition.structured);
  }
  
  // Fallback to old format (backward compatibility)
  if (typeof definition === 'string') {
    if (definition.trim()) {
      return renderLegacyDefinition(definition);
    }
    return <div>No definition available</div>;
  }
  
  return <div>No definition available</div>;
}

function renderDefinitionObject(defObj: DefinitionObject): React.ReactElement {
  const elements: React.ReactElement[] = [];
  let key = 0;
  
  // Render main text first
  if (defObj.main && typeof defObj.main === 'string' && defObj.main.trim()) {
    const mainLines = defObj.main.split('\n').filter(line => line.trim());
    mainLines.forEach((line) => {
      elements.push(
        <p key={key++} className="text-sm mb-2 text-gray-700">
          {renderWithBold(line)}
        </p>
      );
    });
  }
  
  // Render headings and their content (nested content blocks flattened into one block per heading)
  if (defObj.headings && Array.isArray(defObj.headings)) {
    defObj.headings.forEach((heading) => {
      if (heading.title && heading.title.trim()) {
        elements.push(
          <h3
            key={key++}
            className="font-semibold text-base mt-4 mb-2 text-gray-800 first:mt-0"
          >
            {renderWithBold(heading.title)}
          </h3>
        );
      }
      const parts: string[] = [];
      if (heading.subheadings && Array.isArray(heading.subheadings)) {
        heading.subheadings.forEach((item) => {
          if (item.content && item.content.trim()) parts.push(item.content.trim());
        });
      }
      const block = parts.join('\n\n');
      if (block) {
        block.split('\n').filter(line => line.trim()).forEach((line) => {
          elements.push(
            <p key={key++} className="text-gray-700 text-sm leading-relaxed mb-2">
              {renderWithBold(line)}
            </p>
          );
        });
      }
    });
  }
  
  return (
    <div className="definition-content">
      {elements}
    </div>
  );
}

function renderStructuredDefinition(sections: StructuredSection[]): React.ReactElement {
  const elements: React.ReactElement[] = [];
  let key = 0;
  
  sections.forEach((section) => {
    switch (section.type) {
      case 'main_heading':
        const headingContent = section.expanded 
          ? renderWithBold(section.expanded)
          : section.text || '';
        elements.push(
          <h3
            key={key++}
            className="font-semibold text-base mt-4 mb-2 text-gray-800 first:mt-0"
          >
            {headingContent}
          </h3>
        );
        break;
        
      case 'subheading':
        // Treat as paragraph (no separate subheading UI)
      case 'paragraph':
        const paraContent = section.expanded
          ? renderWithBold(section.expanded)
          : section.text || '';
        elements.push(
          <p
            key={key++}
            className="text-gray-700 text-sm leading-relaxed mb-2"
          >
            {paraContent}
          </p>
        );
        break;
        
      case 'spacing':
        elements.push(<div key={key++} className="h-2" />);
        break;
    }
  });
  
  return (
    <div className="definition-content">
      {elements}
    </div>
  );
}

function renderLegacyDefinition(text: string): React.ReactElement {
  // Simple fallback for old format
  const lines = text.split('\n').filter(line => line.trim());
  return (
    <div className="definition-content">
      {lines.map((line, i) => (
        <p key={i} className="text-sm mb-2">{line}</p>
      ))}
    </div>
  );
}