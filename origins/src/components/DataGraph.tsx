import { useEffect, useRef, useState } from 'react';
import { type DictionaryEntry } from '../types.ts';
import RelatedWords from './RelatedWords.tsx';
import DefinitionCard from './DefinitionCard.tsx';
import LanguageTimeline from './LanguageTimeline/LanguageTimeline.tsx';


type DataGraphProps = {
    wordEntry: DictionaryEntry;
    getWord: (word: string) => Promise<DictionaryEntry | undefined>;
    onWordClick: (word: string) => void;
    searchTerm: string;
};


export default function DataGraph({ wordEntry }: DataGraphProps) {

    const topContentRef = useRef<SVGGElement>(null);

    const [viewportWidth, setViewportWidth] = useState(window.innerWidth)

    const containerHeight = window.innerHeight;
    const branchY = 100;




    useEffect(() => {
        const onResize = () => {
            setViewportWidth(window.innerWidth);

        };

        window.addEventListener('resize', onResize);
        onResize()

        return () => {
            window.removeEventListener('resize', onResize);
        };
    }, []);

    useEffect(() => {
        if (!topContentRef.current) return;

    }, [wordEntry, viewportWidth, containerHeight]);
    return (
        <div>
            <div style={{ width: '100%', height: 'auto' }}>
                <DefinitionCard
                    wordEntry={wordEntry}
                    x={0}
                    y={branchY}
                    containerWidth={viewportWidth}
                    containerHeight={containerHeight}
                />
                <RelatedWords
                    wordEntry={wordEntry}
                    containerWidth={viewportWidth}
                    containerHeight={containerHeight}
                />
            </div >
            <div className='timeline-section pb-8'>
                <LanguageTimeline
                    wordEntry={wordEntry}
                    width={viewportWidth * 0.9}
                />
            </div>
        </div>

    );
}