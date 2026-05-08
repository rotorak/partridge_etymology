import React, { useState } from 'react';
import abbreviationsData from './abbv.json';

const abbreviations: Record<string, string> = abbreviationsData;

interface Props {
  text: string;
}

export const ExpandAbbreviations: React.FC<Props> = ({ text }) => {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const parts = text.split(/(\{.*?\})/g);

  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/^\{(.*)\}$/);
        if (!match) return <React.Fragment key={`text-${index}`}>{part}</React.Fragment>;

        const abbr = match[1];
        const meaning = abbreviations[abbr];
        if (!meaning) return <React.Fragment key={`abbr-${index}`}>{abbr}</React.Fragment>;

        const key = `${abbr}-${index}`;
        const isOpen = openKey === key;

        return (
          <span key={key} className="relative inline-block align-baseline">
            <button
              type="button"
              onClick={() => setOpenKey(isOpen ? null : key)}
              aria-expanded={isOpen}
              aria-label={`${abbr}: ${meaning}`}
              title={meaning}
              className="font-bold underline decoration-dotted underline-offset-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm"
            >
              {abbr}
            </button>

            {isOpen && (
              <span
                role="note"
                className="absolute left-0 top-[1.45em] z-20 min-w-[11rem] max-w-[16rem] rounded-md bg-neutral-900 text-white text-xs font-normal leading-snug px-2 py-1.5 shadow-lg whitespace-normal"
              >
                {meaning}
              </span>
            )}
          </span>
        );
      })}
    </>
  );
};