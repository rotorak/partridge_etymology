import { useState, useEffect, useRef } from 'react';
import { type DictionaryEntry } from '../types';
import { createSQLiteThread, createHttpBackend } from 'sqlite-wasm-http';
import sqliteWorkerUrl from '../../node_modules/sqlite-wasm-http/dist/sqlite-worker.js?url';

type DbPromiser = Awaited<ReturnType<typeof createSQLiteThread>>;

type ExecArgs = {
    sql: string;
    bind?: Record<string, unknown> | unknown[];
    callback: (msg: { row?: unknown[]; columnNames?: string[]; rowNumber?: number | null }) => void;
};

type DictionaryRow = {
    word: string;
    word_lower: string; // used for look-up and indexing
    definition: string | null;
    main: string | null;
    headings: string | null;
    structured: string | null;
    expanded: string | null;
    links_to: string | null;
    links_from: string | null;
    language_families: string | null;
    languages: string | null;
    language_tree: string | null;
};

export function useDictionary() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const dbRef = useRef<DbPromiser | null>(null);
    const execTailRef = useRef<Promise<void>>(Promise.resolve());

    useEffect(() => {
        let cancelled = false;
        const LOAD_TIMEOUT_MS = 10000;
        console.debug('[useDictionary] init start');

        const timeoutId = window.setTimeout(() => {
            if (cancelled) return;
            console.error('[useDictionary] load timeout', { timeoutMs: LOAD_TIMEOUT_MS });
            setError('Dictionary load timed out.');
            setLoading(false);
        }, LOAD_TIMEOUT_MS);

        (async () => {
            try {
                const httpBackend = createHttpBackend({
                    maxPageSize: 1024,
                    timeout: 30000,
                    cacheSize: 4096,
                    backendType: 'sync',
                } as Parameters<typeof createHttpBackend>[0]);

                const dbPromiserRaw = await createSQLiteThread({
                    http: httpBackend,
                    worker: () => {
                        const w = new Worker(sqliteWorkerUrl, { type: 'module' });
                        const backend = httpBackend as { type?: string; options?: unknown; createNewChannel?: () => Promise<{ port: MessagePort }> };
                        w.postMessage({ httpChannel: true, httpOptions: backend.options });
                        return w;
                    },
                } as Parameters<typeof createSQLiteThread>[0]);

                if (cancelled) return;

                const dbPromiser = dbPromiserRaw as DbPromiser;

                if (!dbPromiser || typeof dbPromiser !== 'function') {
                    clearTimeout(timeoutId);
                    setError('Dictionary failed: db handle is not callable.');
                    setLoading(false);
                    return;
                }

                if (cancelled) return;

                const remoteDB = `${import.meta.env.BASE_URL}final_def_linkage.db`.replace(/\/+/g, '/');
                console.debug('[useDictionary] opening db', { remoteDB });
                
                const openArgs = { filename: 'file:' + encodeURI(remoteDB), vfs: 'http' as const };
                let openResult: unknown;

                openResult = await dbPromiser('open', openArgs);
                if (cancelled) return;
                console.debug('[useDictionary] open result', { openResult });

                const dbId =
                    openResult != null &&
                        typeof openResult === 'object' &&
                        'dbId' in openResult
                        ? (openResult as { dbId: unknown }).dbId
                        : null;

                if (dbId != null) {
                    try {
                        const pragmaRows = await execQuery<{ page_size?: number }>(
                            dbPromiser,
                            'PRAGMA page_size;'
                        );
                        const schemaRows = await execQuery<{ name?: string }>(
                            dbPromiser,
                            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
                        );
                        console.debug('[useDictionary] startup probe', {
                            dbId,
                            remoteDB,
                            pageSize: pragmaRows[0]?.page_size,
                            tables: schemaRows.map((r) => r.name).filter(Boolean)
                        });
                        try {
                            const countRows = await execQuery<{ total?: number }>(
                                dbPromiser,
                                'SELECT COUNT(*) AS total FROM dictionary;'
                            );
                            console.debug('[useDictionary] startup dictionary count', {
                                dbId,
                                total: countRows[0]?.total
                            });
                        } catch (err) {
                            console.error('[useDictionary] startup dictionary count failed', {
                                dbId,
                                err
                            });
                        }
                    } catch (err) {
                        console.error('[useDictionary] startup probe failed', { dbId, remoteDB, err });
                    }
                    clearTimeout(timeoutId);
                    dbRef.current = dbPromiser;
                    console.debug('[useDictionary] db ready', { dbId });
                    setLoading(false);
                } else {
                    clearTimeout(timeoutId);
                    console.error('[useDictionary] open failed: missing dbId', { openResult });
                    setError('Failed to open database: no dbId returned.');
                    setLoading(false);
                }
            } catch (err) {
                if (!cancelled) {
                    clearTimeout(timeoutId);
                    console.error('[useDictionary] init error', { err });
                    setError(err instanceof Error ? err.message : String(err));
                    setLoading(false);
                }
            } finally {
                clearTimeout(timeoutId);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    function execQuery<T = Record<string, unknown>>(
        dbInstance: DbPromiser,
        sql: string,
        bind?: Record<string, unknown> | unknown[],
        maxRows?: number
    ): Promise<T[]> {
        const run = (): Promise<T[]> =>
            new Promise((resolve, reject) => {
                if (typeof dbInstance !== 'function') {
                    reject(new Error('Database not ready'));
                    return;
                }
                const rows: T[] = [];
                let resolved = false;
                const timeoutMs = 5000;
                const timeoutId = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        reject(new Error('Query timed out'));
                    }
                }, timeoutMs);
                const callback = (msg: { row?: unknown[]; columnNames?: string[]; rowNumber?: number | null }) => {
                    if (resolved) return;
                    if (msg.row != null && msg.columnNames) {
                        const row = {} as T;
                        msg.columnNames.forEach((col, i) => (row as Record<string, unknown>)[col] = msg.row![i]);
                        rows.push(row);
                        if (maxRows != null && rows.length >= maxRows) {
                            clearTimeout(timeoutId);
                            resolved = true;
                            resolve(rows);
                            return;
                        }
                    }
                    if (msg.rowNumber === null) {
                        clearTimeout(timeoutId);
                        if (!resolved) {
                            resolved = true;
                            resolve(rows);
                        }
                    }
                };
                (dbInstance as (type: 'exec', args: ExecArgs) => Promise<unknown>)('exec', { sql, bind, callback })
                    .catch((err) => {
                        clearTimeout(timeoutId);
                        console.error('[useDictionary] exec failed', { sql, bind, err });
                        if (!resolved) {
                            resolved = true;
                            reject(err);
                        }
                    });
            });
        const prev = execTailRef.current;
        const myPromise = prev.then(() => run(), () => run());
        execTailRef.current = myPromise.then(() => undefined, () => undefined);
        return myPromise;
    }

    const sqlGetWord = 'SELECT word, word_lower, definition, main, headings, structured, expanded, links_to, links_from, language_families, languages, language_tree FROM dictionary WHERE word_lower = ?';
    const sqlSearchWords = "SELECT word FROM dictionary WHERE word_lower >= ? AND word_lower < ? ORDER BY word_lower LIMIT ?";

    function rowToEntry(row: DictionaryRow): DictionaryEntry {
        const r = row as Record<string, unknown>;
        const safeJson = (key: string) => {
            const val = r[key] ?? r[key.charAt(0).toUpperCase() + key.slice(1)];
            if (val == null || typeof val !== 'string') return undefined;
            try {
                return JSON.parse(val);
            } catch {
                return undefined;
            }
        };
        return {
            word: row.word,
            definition: row.definition,
            main: row.main ?? undefined,
            headings: safeJson('headings'),
            structured: safeJson('structured'),
            expanded: row.expanded ?? undefined,
            links_to: safeJson('links_to'),
            links_from: safeJson('links_from'),
            language_families: safeJson('language_families'),
            languages: safeJson('languages'),
            language_tree: safeJson('language_tree')
        };
    }


    const getWord = async (word: string): Promise<DictionaryEntry | undefined> => {
        const dbToUse = dbRef.current;
        if (!dbToUse || loading || typeof dbToUse !== 'function') {
            console.debug('[useDictionary] getWord skipped', { word, loading, hasDb: !!dbToUse });
            return undefined;
        }
        try {
            console.debug('[useDictionary] getWord start', { word });
            const rows = await execQuery<DictionaryRow>(dbToUse, sqlGetWord, [word.toLowerCase()]);
            let entry = rows[0] ? rowToEntry(rows[0]) : undefined;
            console.debug('[useDictionary] getWord result', { word, rowCount: rows.length, found: !!entry });
            return entry;
        } catch (err) {
            console.error('[useDictionary] getWord failed', { word, err });
            return undefined;
        }
    };

    const searchWords = async (term: string, limit: number = 10): Promise<string[]> => {
        const dbToUse = dbRef.current;
        if (!dbToUse || loading || typeof dbToUse !== 'function') {
            console.debug('[useDictionary] searchWords skipped', { term, limit, loading, hasDb: !!dbToUse });
            return [];
        }
        const lower = term.toLowerCase();
        const nextPrefix = lower.length > 0
            ? lower.slice(0, -1) + String.fromCharCode(lower.charCodeAt(lower.length - 1) + 1)
            : '\uFFFF';
        const bindSearch = [lower, nextPrefix, limit];
        try {
            console.debug('[useDictionary] searchWords start', { term, limit, bindSearch });
            const rows = await execQuery<DictionaryRow>(dbToUse, sqlSearchWords, bindSearch, limit);
            console.debug('[useDictionary] searchWords result', { term, rowCount: rows.length });
            return rows.map(r => r.word);
        } catch (err) {
            console.error('[useDictionary] searchWords failed', { term, limit, bindSearch, err });
            return [];
        }
    };


    const dbReady = (typeof dbRef.current === 'function');
    return {
        loading,
        setError,
        error,
        dbReady,
        searchWords,
        getWord
    }
}

