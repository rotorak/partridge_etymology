import { useEffect, useRef, useMemo, useState, useId } from 'react';
import * as d3 from 'd3';
import { buildWordTree } from '../../utils/languageData';
import { type DictionaryEntry } from '../../types';
import { drawTimeline } from './draw';
import { computeFamilyLayout } from './layout';
import { cleanupZoom, computeFitTransform, createTimelineZoom } from './zoom';

interface Props {
    wordEntry: DictionaryEntry;
    width: number;
}

const NODE_HEIGHT = 70;
const NODE_WIDTH = 100;
const LEVEL_DISTANCE = 180;




export default function LanguageTimeline({ wordEntry, width }: Props) {
    const [targetWidth, setTargetWidth] = useState(width);
    const svgRef = useRef<SVGSVGElement>(null);
    const contentRef = useRef<SVGGElement>(null);
    const viewPortRef = useRef<SVGGElement>(null);
    const [computedHeight, setComputedHeight] = useState<number>(300);


    const clipId = useId();
    const data = useMemo(() => {
        return buildWordTree(wordEntry, NODE_WIDTH, NODE_HEIGHT, LEVEL_DISTANCE);
    }, [wordEntry]);

    useEffect(() => {
        if (!svgRef.current || !viewPortRef.current || !contentRef.current || !data.treeData) return;

        const { treeData, minX: minY } = data;
        const rootG = d3.select(contentRef.current);
        rootG.selectAll('*').remove();
        const startY = -minY + 100;
        const svgSelect = d3.select(svgRef.current);
        const viewportSelect = d3.select(viewPortRef.current);
        const defs = svgSelect.select<SVGDefsElement>('defs');


        const {
            allNodes,
            topRoots,
            childRoots,
            getTopOwner,
            getChildOwner,
            getNodeYOffset } = computeFamilyLayout(treeData);

        drawTimeline({
            rootG,
            startY,
            data: { treeData, allNodes, topRoots, childRoots, getTopOwner, getChildOwner, getNodeYOffset },
            config: { defs, nodeWidth: NODE_WIDTH, nodeHeight: NODE_HEIGHT},
        });

    const box = contentRef.current?.getBBox()
    if (!box) return;

    const {height, initial, calculatedTargetWidth} = computeFitTransform({box, targetWidth});

    setComputedHeight(height);

    setTargetWidth(calculatedTargetWidth);

    const zoom = createTimelineZoom({viewportSelect, box, targetWidth, height});

    svgSelect.call(zoom);
    svgSelect.call(zoom.transform as any, initial);


    return () => {cleanupZoom(svgSelect)};




}, [data, width]);

if (!data.treeData) return null;


return (
    <div>
        <svg
            ref={svgRef}
            width="100%"
            height={computedHeight}
            viewBox={`0 0 ${targetWidth} ${computedHeight}`}
        >
            <defs>
                <clipPath id={clipId}>
                    <rect x="0" y="0" width={targetWidth} height={computedHeight} />
                </clipPath>
            </defs>

            <rect x={0} y={0} width={targetWidth} height={computedHeight}
                className='fill-slate-50 stroke-slate-200 stroke-[1] rx-2' />

            <g clipPath={`url(#${clipId})`}>
                <g ref={viewPortRef}>
                    <g ref={contentRef} />
                </g>
            </g>

            <g style={{ pointerEvents: 'none' }}>
                <text
                    x={width - 12}
                    y={16}
                    textAnchor="end"
                    className="fill-slate-500 text-[12px] font-medium opacity-90"
                >
                    <tspan x={targetWidth - 12} dy={0}>Drag to pan</tspan>
                    <tspan x={targetWidth - 12} dy={14}>Shift+scroll or pinch to zoom</tspan>
                </text>
            </g>
        </svg>
    </div>
);
}