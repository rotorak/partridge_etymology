import rawLanguagesData from '../languages.json';
import * as d3 from 'd3';
import { type DictionaryEntry } from '../types';

export interface FlatLanguage {
    abbr: string;
    full: string;
    parent: string | null;
    family: string;
    depth: number;
    hasChildren?: boolean;
}

interface LanguageNode {
    abbr: string;
    full: string;
    children?: LanguageNode[];
    family?: string;
}

export const languages: Record<string, FlatLanguage> = {};

const processLanguages = (nodes: LanguageNode[], parent: string | null, family: string | null, depth: number) => {
    if (!Array.isArray(nodes)) return;

    nodes.forEach((node) => {
        const currentFamily = node.family || family || node.abbr;
        languages[node.abbr] = {
            abbr: node.abbr,
            full: node.full,
            parent,
            family: currentFamily,
            depth,
            hasChildren: !!node.children && node.children.length > 0
        };

        if (node.children) {
            processLanguages(node.children, node.abbr, currentFamily, depth + 1);
        }
    });
};

// Handle potential default export from JSON import depending on tsconfig
const data = (rawLanguagesData as any).default || rawLanguagesData;

if (Array.isArray(data)) {
    processLanguages(data as LanguageNode[], null, null, 0);
}

export interface PrebuiltLanguageNode {
    abbr: string;
    full: string | null;
    family: string | null;
    children: PrebuiltLanguageNode[];
}

export interface WordTreeNode {
    abbr: string;
    full: string;
    family: string;
    children: WordTreeNode[];
}

function extractDefinitionText(wordEntry: DictionaryEntry): string {
    const definition = (wordEntry as any).definition;
    if (typeof definition === 'string') return definition;
    if (definition && typeof definition === 'object') {
        const defObj = definition as { main?: string; headings?: any[] };
        return (defObj.main || '') + (defObj.headings || [])
            .map((h: any) => (h?.title || '') + (h?.subheadings || []).map((s: any) => s?.content || '').join(''))
            .join('');
    }

    const main = (wordEntry as any).main;
    const headings = (wordEntry as any).headings;
    const headingsText = Array.isArray(headings)
        ? headings.map((h: any) => {
            if (typeof h === 'string') return h;
            if (!h || typeof h !== 'object') return '';
            return (h.title || '') + (h.subheadings || []).map((s: any) => s?.content || '').join('');
        }).join('')
        : '';
    return (typeof main === 'string' ? main : '') + headingsText;
}

function buildRuntimeHierarchy(wordEntry: DictionaryEntry): WordTreeNode | null {
    const text = extractDefinitionText(wordEntry);
    const matches = text.match(/\{.*?\}/g);
    if (!matches) return null;

    const activeCodes = Array.from(new Set(matches.map((m: string) => m.replace(/[{}]/g, ''))));
    const activeNodes = activeCodes.map((code) => languages[code]).filter(Boolean);
    if (activeNodes.length === 0) return null;

    const included = new Map<string, FlatLanguage>();
    activeNodes.forEach((node) => {
        let current: FlatLanguage | undefined = node;
        while (current) {
            if (included.has(current.abbr)) break;
            included.set(current.abbr, current);
            current = current.parent ? languages[current.parent] : undefined;
        }
    });

    const byAbbr = new Map<string, WordTreeNode>();
    included.forEach((lang) => {
        byAbbr.set(lang.abbr, {
            abbr: lang.abbr,
            full: lang.full,
            family: lang.family,
            children: [],
        });
    });

    const roots: WordTreeNode[] = [];
    byAbbr.forEach((node) => {
        const source = included.get(node.abbr);
        if (!source) return;
        if (source.parent && byAbbr.has(source.parent)) {
            byAbbr.get(source.parent)!.children.push(node);
        } else {
            roots.push(node);
        }
    });

    if (roots.length === 0) return null;
    if (roots.length === 1) return roots[0];

    return {
        abbr: 'ROOT',
        full: 'ROOT',
        family: 'ROOT',
        children: roots,
    };
}

export function buildWordTree(
    wordEntry: DictionaryEntry,
    _nodeWidth: number,
    nodeHeight: number,
    levelDistance: number
): { treeData: d3.HierarchyPointNode<WordTreeNode> | null; minX: number; maxX: number } {
    const hierarchyRoot = buildRuntimeHierarchy(wordEntry);
    if (!hierarchyRoot) {
        return { treeData: null, minX: 0, maxX: 0 };
    }

    const root = d3.hierarchy(hierarchyRoot);
    const treeLayout = d3.tree<WordTreeNode>()
        .nodeSize([nodeHeight + 40, levelDistance])
        .separation((a, b) => a.parent === b.parent ? 1.1 : 1.3);

    const treeData = treeLayout(root);

    treeData.each((d) => {
        d.y -= levelDistance;
    });

    let minX = 0;
    let maxX = 0;
    let first = true;
    treeData.each((d) => {
        if (d.data.abbr !== 'ROOT') {
            if (first) {
                minX = maxX = d.x;
                first = false;
            } else {
                if (d.x < minX) minX = d.x;
                if (d.x > maxX) maxX = d.x;
            }
        }
    });

    return { treeData, minX, maxX };
}
