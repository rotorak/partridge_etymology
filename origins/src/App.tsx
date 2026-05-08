import { useState, useEffect } from 'react'
import { useDictionary } from './hooks/useDictionary'
import { SearchForm } from './searchBar'
import { useStorageState } from './hooks/useStorageState';
import { useDebounce } from './hooks/useDebounce.ts';
import DataGraph from './components/DataGraph.tsx';
import { type DictionaryEntry } from './types.ts';




function App() {
  const [wordEntry, setWordEntry] = useState<DictionaryEntry | null>(null);
  const { loading, error, setError, dbReady, searchWords, getWord } = useDictionary();
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useStorageState('search', '');
  const [suggestions, setSuggestions] = useState<string[]>([])

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    console.debug('[App] state', {
      loading,
      dbReady,
      searchTerm,
      debouncedSearchTerm,
      selectedWord,
      suggestionsCount: suggestions.length,
      hasWordEntry: !!wordEntry,
      error
    });
  }, [loading, dbReady, searchTerm, debouncedSearchTerm, selectedWord, suggestions.length, wordEntry, error]);



  useEffect(() => {
    console.debug('[App] suggestions effect start', { loading, dbReady, searchTerm, debouncedSearchTerm });
    if (loading || !dbReady) return;
    if (!searchTerm.trim()) {
      console.debug('[App] suggestions cleared: empty searchTerm');
      setSuggestions([]);
      return;
    }
    if (debouncedSearchTerm.trim().length < 3) {
      console.debug('[App] suggestions cleared: below min length', { debouncedSearchTerm });
      setSuggestions([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        console.debug('[App] suggestions query start', { debouncedSearchTerm });
        const list = await searchWords(debouncedSearchTerm, 10);
        if (cancelled) return;
        console.debug('[App] suggestions query result', { debouncedSearchTerm, count: list.length, list });
        setSuggestions(list);
      }
      catch (err) {
        if (cancelled) return;
        console.error('[App] suggestions query failed', { debouncedSearchTerm, err });
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      console.debug('[App] suggestions effect cleanup', { debouncedSearchTerm });
      cancelled = true;
    };

  }, [loading, dbReady, debouncedSearchTerm, searchTerm]);

  useEffect(() => {
    console.debug('[App] selectedWord effect start', { loading, dbReady, selectedWord });
    if (loading || !dbReady) return;
    if (!selectedWord?.trim()) {
      console.debug('[App] wordEntry cleared: no selectedWord');
      setWordEntry(null);
      return;
    };
    (async () => {
      try {
        if (!selectedWord) return;

        console.debug('[App] getWord direct start', { selectedWord });
        const direct = await getWord(selectedWord);
        console.debug('[App] getWord direct result', { selectedWord, hasDirect: !!direct, linksTo: direct?.links_to });
        if (direct?.links_to?.[0]) {
          console.debug('[App] getWord linked start', { linkedWord: direct.links_to[0] });
          const linked = await getWord(direct.links_to[0]);
          console.debug('[App] getWord linked result', { linkedWord: direct.links_to[0], hasLinked: !!linked });
          setWordEntry(linked ?? null);
        } else {
          console.debug('[App] set direct wordEntry', { selectedWord, hasDirect: !!direct });
          setWordEntry(direct ?? null);
        }
      } catch (err) {
        console.error('[App] selectedWord effect failed', { selectedWord, err });
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

  }, [loading, dbReady, selectedWord, getWord, setError])


  if (loading) return <div>Loading dictionary...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!dbReady) return <div>Preparing dictionary…</div>;

  const handleSearchInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
  };


  const searchAction = (formData: FormData) => {
    const term = formData.get('search');
    const value = term != null ? String(term).trim() : '';
    if (value) {
      setSelectedWord(value);
    }
  };

  const handleWordClick = (word: string) => {
    const normalized = word.trim();
    setSelectedWord(normalized);
  };

  const handleSuggestionClick = (word: string) => {
    setSearchTerm(word);
    setSelectedWord(word);
  }

  return (
    <div>
      <h1>
        Origins
      </h1>
      <SearchForm searchTerm={searchTerm}
        onSearchInput={handleSearchInput}
        searchAction={searchAction}
        suggestions={suggestions}
        onSuggestionClick={handleSuggestionClick} />
      {wordEntry && (
        <div className="">
          <DataGraph
            wordEntry={wordEntry}
            getWord={getWord}
            onWordClick={handleWordClick}
            searchTerm={searchTerm}
            selectedWord={selectedWord}
          />
        </div>
      )}

    </div>
  )
}

export default App
