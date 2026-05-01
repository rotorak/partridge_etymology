import * as d3 from 'd3';
import type {WordTreeNode} from '../../utils/languageData'

type ChildPanel = {
    root: TimelineNode ;
    rawTop: number;
    rawBottom: number;
    offset: number;
};

type TopPanel = {
    root: TimelineNode ;
    rawTop: number;
    rawBottom: number;
    offset: number;
};

export type TimelineNode = d3.HierarchyPointNode<WordTreeNode>;

export type ComputeFamilyLayoutResult = {
    allNodes: TimelineNode[];
    topRoots: TimelineNode[];
    childRoots: TimelineNode[];
    getTopOwner: (node: TimelineNode) => TimelineNode | null;
    getChildOwner: (node: TimelineNode) => TimelineNode | null;
    getNodeYOffset: (node: TimelineNode) => number;
};

export function getTargetWidth(contentW: number, contentH: number, viewportWidth: number): number {
    const ratio = contentW / contentH;
    const minFrac = 0.6;
    const maxFrac = 0.9;

    const t = Math.max(0, Math.min(1, (ratio - 0.8) / (2.0 - 0.8)));
    const frac = minFrac + (maxFrac - minFrac) * t;
    const targetWidth = Math.max(700, Math.min(viewportWidth * frac, 1200));

    return targetWidth;
}


export function computeFamilyLayout(treeData: TimelineNode) {

    const NODE_HEIGHT = 70;
    const topOffsetByAbbr = new Map<string, number>();
    const childOffsetByAbbr = new Map<string, number>();
    const hasSyntheticRoot = treeData.data.abbr === 'ROOT';
    const topDepth = hasSyntheticRoot ? 1 : 0;
    const childDepth = topDepth + 1;

    const familyRoots = treeData.descendants().filter(d => {
        if (d.depth === topDepth) return true;
        if (d.depth < topDepth) return false;

        const parentFamily = d.parent ? d.parent.data.family : null;
        const currentFamily = d.data.family;
        return parentFamily && currentFamily && parentFamily !== currentFamily;
    });

    const allNodes = treeData.descendants().filter(n => n.data.abbr !== 'ROOT');
    const topRoots = familyRoots.filter(fr => fr.depth === topDepth);
    const childRoots = familyRoots.filter(fr => fr.depth === childDepth);

    const panelPadding = 25;
    const titleHeight = 30;
    const panelGap = 55;

    const getTopOwner = (node: TimelineNode): TimelineNode | null => {
        let cur: TimelineNode | null = node;
        while (cur && cur.depth > topDepth) cur = cur.parent;
        return cur && cur.depth === topDepth ? cur : null;
    };
    const getChildOwner = (node: TimelineNode): TimelineNode | null => {
        let cur: TimelineNode | null = node;
        while (cur && cur.depth > childDepth) cur = cur.parent;
        return cur && cur.depth === childDepth ? cur : null;
    };

    const getNodeYOffset = (node: TimelineNode): number => {
        const top = getTopOwner(node);
        const topOffset = top ? (topOffsetByAbbr.get(top.data.abbr) ?? 0) : 0;
        const child = getChildOwner(node);
        const childOffset = child ? (childOffsetByAbbr.get(child.data.abbr) ?? 0) : 0;
        return topOffset + childOffset;
    };

    // Global pass for actually rendered top-family panels.
    const topPanels: TopPanel[] = topRoots.map((topRoot) => {
        const topOwnedNodes = allNodes.filter(n => getTopOwner(n)?.data.abbr === topRoot.data.abbr);
        if (topOwnedNodes.length === 0) {
            return { root: topRoot, rawTop: 0, rawBottom: 0, offset: 0 };
        }
        const xs = topOwnedNodes.map(n => n.x);
        return {
            root: topRoot,
            rawTop: Math.min(...xs) - NODE_HEIGHT / 2 - panelPadding - titleHeight,
            rawBottom: Math.max(...xs) + NODE_HEIGHT / 2 + panelPadding,
            offset: 0,
        };
    }).filter(p => p.rawBottom >= p.rawTop);

    topPanels.sort((a, b) => a.rawTop - b.rawTop);
    let topCursor = topPanels.length > 0 ? topPanels[0].rawTop : 0;
    topPanels.forEach((panel) => {
        panel.offset = topCursor - panel.rawTop;
        topOffsetByAbbr.set(panel.root.data.abbr, panel.offset);
        topCursor += (panel.rawBottom - panel.rawTop) + panelGap;
    });

    topRoots.forEach((topRoot) => {
        const topAbbr = topRoot.data.abbr;
        const childRootsUnder = childRoots.filter(cr => cr.parent?.data?.abbr === topAbbr);
        const childPanels: ChildPanel[] = childRootsUnder.map((childRoot) => {
            const childOwnedNodes = allNodes.filter(n => getChildOwner(n)?.data.abbr === childRoot.data.abbr);
            if (childOwnedNodes.length === 0) {
                return { root: childRoot, rawTop: 0, rawBottom: 0, offset: 0 };
            }
            const xs = childOwnedNodes.map(n => n.x);
            return {
                root: childRoot,
                rawTop: Math.min(...xs) - NODE_HEIGHT / 2 - panelPadding - titleHeight,
                rawBottom: Math.max(...xs) + NODE_HEIGHT / 2 + panelPadding,
                offset: 0,
            };
        }).filter(p => p.rawBottom >= p.rawTop);

        childPanels.sort((a, b) => a.rawTop - b.rawTop);
        let cursorTop = childPanels.length > 0 ? childPanels[0].rawTop : 0;
        childPanels.forEach((panel) => {
            // Strict band layout: each child-family panel gets a non-overlapping vertical slot.
            panel.offset = cursorTop - panel.rawTop;
            childOffsetByAbbr.set(panel.root.data.abbr, panel.offset);
            cursorTop += (panel.rawBottom - panel.rawTop) + panelGap;
        });
    });

    return {
        allNodes,
        topRoots,
        childRoots,
        getTopOwner,
        getChildOwner,
        getNodeYOffset,
    };

}