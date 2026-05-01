// origins/src/types.ts

export type StructuredSection = {
    type: 'main_heading' | 'subheading' | 'paragraph' | 'spacing';
    text?: string;
    expanded?: string;
};

export type DictionaryEntry = {
    word: string,
    definition: string | null,
    main?: string,
    headings?: string[],
    structured?: StructuredSection[],
    expanded?: string,
    links_to?: Array<string>,
    links_from?: Array<string>
    language_families?: string[];                    // e.g. ["Romance languages"]
    languages?: Array<{ abbr: string; full: string; family: string }>;
    language_tree?: {                                 // single root node for D3 hierarchy
        abbr: string;
        full: string | null;
        family: string | null;
        children: Array<DictionaryEntry>;
    };
}

export type DictionaryData = {
    dictionary: Array<DictionaryEntry>
}

export type GraphNode = {
    id: string;
    word: string;
    definition: string;
    nodeType: 'main' | 'links_from' | 'links_to';
}

export type GraphLink = {
    source: string | GraphNode;
    target: string | GraphNode;
    linkType: 'links_to' | 'links_from';
}