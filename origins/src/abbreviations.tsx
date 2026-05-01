import React from 'react';
import abbreviationsData from './abbv.json';

const abbreviations: Record<string, string> = abbreviationsData;

interface Props {
  text: string;
}

export const ExpandAbbreviations: React.FC<Props> = ({ text }) => {
  const parts = text.split(/(\{.*?\})/g);

  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/^\{(.*)\}$/);
        if (match) {
          const abbr = match[1];
          const meaning = abbreviations[abbr];
          if (meaning) {
            return (
              <strong key={index} title={meaning} style={{ cursor: 'help' }}>
                {abbr}
              </strong>
            );
          }
        }
        return part;
      })}
    </>
  );
};