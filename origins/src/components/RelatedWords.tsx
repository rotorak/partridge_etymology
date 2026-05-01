import { type DictionaryEntry } from '../types.ts';


type RelatedWordsProps = {
    wordEntry: DictionaryEntry;
    containerWidth: number;
    containerHeight: number;
};


const COLUMNS = 10;



export default function RelatedWords({ wordEntry, containerWidth, containerHeight }: RelatedWordsProps) {
    const linksFrom = wordEntry.links_from || [];
    if (linksFrom.length === 0) return null;
    const cardWidth = containerWidth * 0.6;
    const maxCardHeight = Math.min(containerHeight * 0.35, 360);
    return (
        <section
            className="related-words-card"
            style={{
                width: "100%",
                maxWidth: cardWidth,
                margin: '30px auto 24px',
                boxSizing: 'border-box',
                background: '#f9f9f9',
                border: '1px solid #ddd',
                borderRadius: 3,
                padding: 12,
            }}
        >
            <h2 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 'bold', color: '#111' }}>
                Related Words
            </h2>
            <div
                style={{
                    maxHeight: maxCardHeight,
                    overflow: 'auto',
                    background: 'white',
                    padding: 8,
                    borderRadius: 2,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))`,
                    columnGap: 10,
                    rowGap: 6,
                    alignContent: 'start',
                    fontSize: 11,
                    color: '#111',
                }}
            >
                {linksFrom.map((word, i) => (
                    <div
                        key={`${word}-${i}`}
                        style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: '16px',
                        }}
                        title={word}
                    >
                        {word}
                    </div>
                ))}
            </div>
        </section>
    )

}