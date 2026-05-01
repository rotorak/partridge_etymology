import { type DictionaryEntry } from '../types.ts';
import { ExpandAbbreviations } from '../abbreviations';
import { useEffect, useRef } from 'react';

type DefinitionProp = {
    wordEntry: DictionaryEntry;
    x: number;
    y: number;
    containerWidth?: number;
    containerHeight?: number;
};

type HeadingItem = { title: string; content: string };

function headingToTitle(h: unknown): string {
    if (h == null) return '';
    if (typeof h === 'string') return h;
    if (typeof h === 'object') {
        const t = (h as Record<string, unknown>).title;
        return typeof t === 'string' ? t : '';
    }
    return '';
}
function itemContent(s: unknown): string {
    if (s == null) return '';
    if (typeof s === 'string') return s.trim();
    if (typeof s === 'object') {
        const c = (s as Record<string, unknown>).content;
        return typeof c === 'string' ? c.trim() : '';
    }
    return '';
}

function normalizeHeadings(wordEntry: DictionaryEntry): HeadingItem[] {
    const rawHeadings = Array.isArray(wordEntry.headings) ? wordEntry.headings : [];
    const out: HeadingItem[] = [];

    rawHeadings.forEach((h: unknown) => {
        const title = headingToTitle(h);
        const subs = (h != null && typeof h === 'object')
            ? (h as Record<string, unknown>).subheadings
            : undefined;
        const nested = subs != null && Array.isArray(subs) ? subs : [];
        const content = nested.map(itemContent).filter(Boolean).join('\n\n');

        out.push({
            title: title || '',
            content: content.trim(),
        });
    });

    return out;
}

export default function DefinitionCard({ wordEntry, containerWidth, containerHeight }: DefinitionProp) {
    const scrollRef = useRef<HTMLElement | null>(null);
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
      }, [wordEntry.word]);


    const mainDef = wordEntry.main ?? (typeof wordEntry.definition === 'string' ? wordEntry.definition : undefined);
    const headings = normalizeHeadings(wordEntry);
    if (!mainDef && headings.length === 0) return null;
    if (!containerWidth)
        containerWidth = window.innerWidth
    if (!containerHeight)
        containerHeight = window.innerHeight


    const mainCardWidth = containerWidth * 0.6;
    const mainCardHeight = containerHeight * 0.4;

    return (
        <section
            className="related-words-card"
            style={{
                width: "100%",
                maxWidth: mainCardWidth,
                maxHeight: mainCardHeight,
                overflow: 'auto',
                margin: '40px auto 24px',
                boxSizing: 'border-box',
                background: '#f9f9f9',
                border: '1px solid #ddd',
                borderRadius: 3,
                paddingTop: 0,
            }}
            ref={scrollRef}
        >
            <h2 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 'bold', color: '#111' }}>
                Definition
            </h2>
            <div
                style={{
                    fontSize: "14px",
                    height: "100%",
                    padding: "5px",
                    background: "white",
                    whiteSpace: "pre-wrap"
                }}
            >                    {mainDef &&
                <div key="main">
                    <ExpandAbbreviations text={mainDef} />
                </div>}

                {headings.map(({ title: titleStr, content: allContent }) => {
                    const title = titleStr.length > 35 ? titleStr.substring(0, 35) + "..." : titleStr;
                    return (
                        <div key={`${titleStr}::${allContent}`}>
                            <h2 style={{ fontSize: "16px", fontWeight: 'bold', marginTop: "8px", whiteSpace: "pre-line" }}>{title}</h2>
                            {allContent ? (
                                <ExpandAbbreviations text={allContent} />
                            ) : '\u00a0'}
                        </div>
                    );
                })}
            </div>
        </section>
    )
}
