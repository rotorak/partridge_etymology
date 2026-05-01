import * as d3 from 'd3';
import type { TimelineNode } from './layout';

type TimelineGroups = {
    visG: d3.Selection<SVGGElement, unknown, null, undefined>;
    panelG: d3.Selection<SVGGElement, unknown, null, undefined>;
    linkG: d3.Selection<SVGGElement, unknown, null, undefined>;
    nodeG: d3.Selection<SVGGElement, unknown, null, undefined>;
};

type DrawConstants = {
    nodeWidth: number;
    nodeHeight: number;
    panelPadding: number;
    titleHeight: number;
};

type RenderPanelsArgs = {
    panelG: d3.Selection<SVGGElement, unknown, null, undefined>;
    topRoots: TimelineNode[];
    childRoots: TimelineNode[];
    allNodes: TimelineNode[];
    getTopOwner: (node: TimelineNode) => TimelineNode | null;
    getChildOwner: (node: TimelineNode) => TimelineNode | null;
    getNodeYOffset: (node: TimelineNode) => number;
    colorScale: d3.ScaleOrdinal<string, string>;
    constants: DrawConstants;
}

type DrawTimelineInput = {
    rootG: d3.Selection<SVGGElement, unknown, null, undefined>;
    startY: number;
    data: {
        treeData: TimelineNode;
        allNodes: TimelineNode[];
        topRoots: TimelineNode[];
        childRoots: TimelineNode[];
        getTopOwner: (n: TimelineNode) => TimelineNode | null;
        getChildOwner: (n: TimelineNode) => TimelineNode | null;
        getNodeYOffset: (n: TimelineNode) => number;
    };
    config: {
        defs: d3.Selection<SVGDefsElement, unknown, null, undefined>;
        nodeWidth: number;
        nodeHeight: number;
    };
};


type Bounds = { left: number; right: number; top: number; bottom: number };

const ARROW_MARKER_ID = 'arrow-marker'

const createTimelineGroups = (
    contentG: d3.Selection<SVGGElement, unknown, null, undefined>,
    startY: number
): TimelineGroups => {
    const visG = contentG.append('g').attr('transform', `translate(40, ${startY})`);
    const panelG = visG.append('g').attr('class', 'family-panels');
    const linkG = visG.append('g').attr('class', 'links');
    const nodeG = visG.append('g').attr('class', 'nodes');

    return { visG, panelG, linkG, nodeG };
}

const renderArrowMarker = (
    defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
): void => {

    defs.select(`#${ARROW_MARKER_ID}`).remove();
    defs.append('marker')
        .attr('id', ARROW_MARKER_ID)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 0)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#999');
}


const measureBounds = (nodes: d3.HierarchyPointNode<any>[],
    getNodeYOffset: (n: TimelineNode) => number,
    constants: DrawConstants
): Bounds | null => {
    const { nodeWidth, nodeHeight, panelPadding, titleHeight } = constants
    if (nodes.length === 0) return null;
    const adjustedX = nodes.map(n => n.x + getNodeYOffset(n));
    const ys = nodes.map(n => n.y);
    const minYCoord = Math.min(...ys);
    const maxYCoord = Math.max(...ys);
    const minXCoord = Math.min(...adjustedX);
    const maxXCoord = Math.max(...adjustedX);
    return {
        left: minYCoord - nodeWidth / 2 - panelPadding,
        right: maxYCoord + nodeWidth / 2 + panelPadding,
        top: minXCoord - nodeHeight / 2 - panelPadding - titleHeight,
        bottom: maxXCoord + nodeHeight / 2 + panelPadding,
    };
};

const renderPanels = (args: RenderPanelsArgs): void => {
    const { panelG,
        topRoots,
        childRoots,
        allNodes,
        getTopOwner,
        getChildOwner,
        getNodeYOffset,
        colorScale,
        constants
    } = args;

    const drawPanel = (rootNode: TimelineNode, ownedNodes: TimelineNode[]): void => {
        const bounds = measureBounds(ownedNodes, getNodeYOffset, constants);
        if (!bounds) return;
        const familyColor = d3.color(colorScale(rootNode.data.family)) || d3.color('#ccc')!;
        panelG.append('rect')
            .attr('x', bounds.left)
            .attr('y', bounds.top)
            .attr('width', bounds.right - bounds.left)
            .attr('height', bounds.bottom - bounds.top)
            .attr('fill', familyColor.toString())
            .attr('fill-opacity', rootNode.depth === 1 ? 0.05 : 0.1)
            .attr('stroke', familyColor.darker().toString())
            .attr('stroke-opacity', 0.5)
            .attr('stroke-width', 1)
            .attr('rx', 20);
        panelG.append('text')
            .attr('x', bounds.left + 10)
            .attr('y', bounds.top + 25)
            .attr('text-anchor', 'start')
            .attr('font-size', rootNode.depth === 1 ? '22px' : '18px')
            .attr('font-weight', 'bold')
            .attr('fill', familyColor.darker().toString())
            .text(rootNode.data.family);
    };

    topRoots.forEach((topRoot) => {
        const topOwnedNodes = allNodes.filter(n => getTopOwner(n)?.data.abbr === topRoot.data.abbr);
        drawPanel(topRoot, topOwnedNodes);
    });
    childRoots.forEach((childRoot) => {
        const childOwnedNodes = allNodes.filter(n => getChildOwner(n)?.data.abbr === childRoot.data.abbr);
        drawPanel(childRoot, childOwnedNodes);
    });
}

const renderLinks = (args: {
    linkG: d3.Selection<SVGGElement, unknown, null, undefined>;
    treeData: TimelineNode;
    getNodeYOffset: (node: TimelineNode) => number;
    nodeWidth: number;
}): void => {
    const { linkG, treeData, getNodeYOffset, nodeWidth } = args;
    const linkGen = d3.linkHorizontal()
        .x((d: any) => d[0])
        .y((d: any) => d[1]);
    linkG.selectAll('path.link')
        .data(treeData.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', (d: any) => {
            if (d.source.data.abbr === 'ROOT') return null;
            return linkGen({
                source: [d.source.y + nodeWidth / 2, d.source.x + getNodeYOffset(d.source)],
                target: [d.target.y - nodeWidth / 2, d.target.x + getNodeYOffset(d.target)]
            });
        })
        .attr('fill', 'none')
        .attr('stroke', '#999')
        .attr('stroke-width', 1.5)
        .attr('marker-end', (d: any) => d.source.data.abbr === 'ROOT' ? null : `url(#${ARROW_MARKER_ID})`);
}

const renderNodes = (args: {
    nodeG: d3.Selection<SVGGElement, unknown, null, undefined>;
    treeData: TimelineNode;
    colorScale: d3.ScaleOrdinal<string, string>;
    getNodeYOffset: (node: TimelineNode) => number;
    nodeWidth: number;
    nodeHeight: number;
}): void => {

    const { nodeG, treeData, colorScale, getNodeYOffset, nodeWidth, nodeHeight } = args;

    const getShade = (family: string, abbr: string) => {
        const base = d3.hsl(colorScale(family));
        let hash = 0;
        for (let i = 0; i < abbr.length; i++) {
            hash = ((hash << 5) - hash) + abbr.charCodeAt(i);
            hash |= 0;
        }
        const normalizedHash = (Math.abs(hash) % 100) / 100; 

        base.l = 0.4 + (normalizedHash * 0.4);

        return base.toString();
    };

    const nodes = nodeG.selectAll('g.node')
        .data(treeData.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', (d: any) => `translate(${d.y}, ${d.x + getNodeYOffset(d)})`)
        .style('display', (d: any) => {
            if (d.data.abbr === 'ROOT') return 'none';
            else return 'block';
        });

    nodes.append('rect')
        .attr('x', -nodeWidth / 2)
        .attr('y', -nodeHeight / 2)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('fill', (d: any) => getShade(d.data.family, d.data.abbr))
        .attr('fill-opacity', 0.5)
        .attr('stroke', (d: any) => d3.color(getShade(d.data.family, d.data.abbr))?.darker().toString() || '#999')
        .attr('rx', 4);

    nodes.append('text')
        .attr('x', 0)
        .attr('y', -4)
        .attr('text-anchor', 'middle')
        .attr('font-weight', 'bold')
        .attr('font-size', '12px')
        .text((d: any) => d.data.abbr);

    nodes.append('text')
        .attr('x', 0)
        .attr('y', 12)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .each(function (d: any) {
            const full = d.data.full || '';
            const [line1, line2] = wrapWords(full, 16);
            const text = d3.select(this);

            text.append('tspan')
                .attr('x', 0)
                .attr('dy', 0)
                .text(line1);

            if (line2) {
                text.append('tspan')
                    .attr('x', 0)
                    .attr('dy', 11)
                    .text(line2);
            }
        });
}

const wrapWords = (fullName: string, maxCharsPerLine: number): [string, string] => {

    const words = fullName.trim().split(/\s+/);
    if (words.length === 0) return ['', ''];
    let line1 = '';
    let i = 0;

    while (i < words.length) {
        const candidate = line1 ? `${line1} ${words[i]}` : words[i];
        if (candidate.length > maxCharsPerLine) break;
        line1 = candidate;
        i++;
    }

    if (!line1) {
        line1 = words[0].slice(0, Math.max(1, maxCharsPerLine - 3)) + '...';
        i = 1;
    }

    let line2 = words.slice(i).join(' ');
    if (line2.length > maxCharsPerLine) {
        line2 = line2.slice(0, Math.max(1, maxCharsPerLine - 3)) + '...';
    }

    return [line1, line2];
};

export const drawTimeline = (args: DrawTimelineInput): TimelineGroups => {

    const panelPadding = 25;
    const titleHeight = 30;
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    const { rootG, startY, data, config } = args;
    const { visG, panelG, linkG, nodeG } = createTimelineGroups(rootG, startY);
    const {defs, nodeWidth, nodeHeight } = config;
    const { treeData, allNodes, topRoots, childRoots, getTopOwner, getChildOwner, getNodeYOffset } = data;

    renderArrowMarker(defs);

    renderPanels({
        panelG,
        topRoots,
        childRoots,
        allNodes,
        getTopOwner,
        getChildOwner,
        getNodeYOffset,
        colorScale,
        constants: { nodeWidth, nodeHeight, panelPadding, titleHeight },
    });

    renderLinks({linkG, treeData, getNodeYOffset, nodeWidth});

    renderNodes({nodeG, treeData, colorScale, getNodeYOffset, nodeWidth, nodeHeight});

    return { visG, panelG, linkG, nodeG }
}

