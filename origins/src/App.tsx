import { useState, useEffect } from 'react'
import { useDictionary } from './hooks/useDictionary'
import { SearchForm } from './searchBar'
import { useStorageState } from './hooks/useStorageState';
import DataGraph from './components/DataGraph.tsx';
import { type DictionaryEntry } from './types.ts';


function App() {
  const [wordEntry, setWordEntry] = useState<DictionaryEntry | null>(null);
  const { loading, error, setError, dbReady, searchWords, getWord } = useDictionary();
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useStorageState('search', '');
  const [suggestions, setSuggestions] = useState<string[]>([])


  useEffect(() => {
    if (loading || !dbReady) return;
    if (!searchTerm.trim()) {
      setSuggestions([]);
      if (!selectedWord) setWordEntry(null);
      return;
    }

    (async () => {
      try {
        const list = await searchWords(searchTerm, 10);
        setSuggestions(list);

        /* null type protection */
        if (!selectedWord) return;

        const direct = await getWord(selectedWord);
        if (direct?.links_to?.[0]) {
          const linked = await getWord(direct.links_to[0]);
          setWordEntry(linked ?? null);
        } else {
          setWordEntry(direct ?? null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

  }, [loading, dbReady, selectedWord, searchTerm]);


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
    setSelectedWord(word);
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
          <DataGraph wordEntry={wordEntry}
            getWord={getWord}
            onWordClick={handleWordClick}
            searchTerm={searchTerm} />
        </div>
      )}

    </div>
  )
}

export default App
