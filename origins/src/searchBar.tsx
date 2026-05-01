import { useEffect, useRef, useState } from 'react'

type SearchFormProps = {
    searchTerm: string;
    onSearchInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
    searchAction: (formData: FormData) => void | Promise<void>;
    suggestions?: string[];
    onSuggestionClick?: (word: string) => void;
};

type InputLabelProps = {
    id: string;
    name: string;
    value: string;
    type?: string;
    onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    isFocused: boolean;
    children: React.ReactNode;
};



export const InputWithLabel = ({
    id,
    name,
    value,
    type = 'text',
    onInputChange,
    isFocused,
    children,
}: InputLabelProps) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isFocused && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isFocused]);

    return (
        <>
            <label htmlFor={id}>{children}</label>
            &nbsp;
            <input
                ref={inputRef}
                id={id}
                name={name}
                type={type}
                value={value}
                onChange={onInputChange}
            />
        </>
    );
};



export const SearchForm = ({
    searchTerm,
    onSearchInput,
    searchAction,
    suggestions = [],
    onSuggestionClick }: SearchFormProps) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setShowSuggestions(suggestions.length > 0 && searchTerm.trim().length > 0);
    }, [suggestions, searchTerm]);

    useEffect(() => {
        if (!showSuggestions) return;
        
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        if (showSuggestions) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);

        }
    }, [showSuggestions]);

    return (
        <div ref={suggestionRef} style={{ position: "relative" }}>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    searchAction(formData);
                }}
            >
                <InputWithLabel
                    id="search"
                    name="search"
                    value={searchTerm}
                    isFocused
                    onInputChange={onSearchInput}
                >
                    <strong>Search:</strong>
                </InputWithLabel>

                <button type="submit" disabled={!searchTerm}>
                    Submit
                </button>
            </form>

            {showSuggestions && suggestions.length > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '4px'
                    }}
                >
                    {suggestions.map((word, index) => (
                        <div
                            key={index}
                            onClick={() => {
                                if (onSuggestionClick) {
                                    onSuggestionClick(word);
                                    setShowSuggestions(false);
                                }
                            }}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: index < suggestions.length - 1 ? '1px solid #eee' : 'none'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f0f0f0';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'white';
                            }}
                        >
                            {word}
                        </div>
                    ))}
                </div>
            )}
            </div>
    );
};

