// frontend/src/components/AthleteSearchInput.tsx
// Componente de busca de atletas com autocomplete — Fase 2

import React, { useState, useRef, useEffect, useCallback } from "react";
import httpClient from "../config/httpClient";
import "./AthleteSearchInput.css";

export interface AthleteResult {
  id: string;
  name: string;
  nickname?: string;
  category?: string;
  ranking?: number;
  clubName?: string;
  isOwnClub?: boolean;
}

interface AthleteSearchInputProps {
  /** Label do campo */
  label?: string;
  /** Placeholder */
  placeholder?: string;
  /** Atleta selecionado */
  value?: AthleteResult | null;
  /** Callback quando atleta é selecionado */
  onSelect: (athlete: AthleteResult | null) => void;
  /** Permite criar atleta convidado (digitando nome livre) */
  allowGuest?: boolean;
  /** Classes CSS extras */
  className?: string;
  /** Desabilitar */
  disabled?: boolean;
  /** ID para label/accessibility */
  id?: string;
}

const DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

const AthleteSearchInput: React.FC<AthleteSearchInputProps> = ({
  label,
  placeholder = "Buscar atleta por nome...",
  value,
  onSelect,
  allowGuest = true,
  className = "",
  disabled = false,
  id,
}) => {
  const [query, setQuery] = useState(value?.name || "");
  const [results, setResults] = useState<AthleteResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync value externo
  useEffect(() => {
    if (value) {
      setQuery(value.name);
    }
  }, [value?.id]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchAthletes = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await httpClient.get<{
        athletes: AthleteResult[];
      }>(`/athletes?q=${encodeURIComponent(searchQuery)}&limit=10`);

      setResults(response.data.athletes || []);
      setIsOpen(true);
      setHighlightIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    // Se havia um atleta selecionado e o user editou, desmarcar
    if (value) {
      onSelect(null);
    }

    // Debounce da busca
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAthletes(val), DEBOUNCE_MS);
  };

  const handleSelect = (athlete: AthleteResult) => {
    setQuery(athlete.name);
    setIsOpen(false);
    setHighlightIndex(-1);
    onSelect(athlete);
  };

  const handleGuestSelect = () => {
    if (!query.trim()) return;
    const guest: AthleteResult = {
      id: `guest_${Date.now()}`,
      name: query.trim(),
      category: "Convidado",
    };
    onSelect(guest);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const totalOptions = results.length + (allowGuest && query.trim() ? 1 : 0);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((prev) => (prev < totalOptions - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : totalOptions - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < results.length) {
          handleSelect(results[highlightIndex]);
        } else if (
          highlightIndex === results.length &&
          allowGuest &&
          query.trim()
        ) {
          handleGuestSelect();
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const handleFocus = () => {
    if (results.length > 0 || query.length >= MIN_SEARCH_LENGTH) {
      setIsOpen(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`athlete-search ${className} ${value ? "has-value" : ""}`}
    >
      {label && (
        <label htmlFor={id} className="athlete-search-label">
          {label}
        </label>
      )}

      <div className="athlete-search-input-wrapper">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="athlete-search-input"
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />

        {isLoading && <span className="athlete-search-spinner">⟳</span>}

        {value && (
          <button
            type="button"
            className="athlete-search-clear"
            onClick={() => {
              setQuery("");
              onSelect(null);
              inputRef.current?.focus();
            }}
            aria-label="Limpar seleção"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (results.length > 0 || (allowGuest && query.trim())) && (
        <ul className="athlete-search-results" role="listbox">
          {results.map((athlete, idx) => (
            <li
              key={athlete.id}
              role="option"
              aria-selected={highlightIndex === idx}
              className={`athlete-result-item ${highlightIndex === idx ? "highlighted" : ""}`}
              onClick={() => handleSelect(athlete)}
              onMouseEnter={() => setHighlightIndex(idx)}
            >
              <div className="athlete-result-main">
                <span className="athlete-result-name">{athlete.name}</span>
                {athlete.nickname && (
                  <span className="athlete-result-nickname">
                    ({athlete.nickname})
                  </span>
                )}
              </div>
              <div className="athlete-result-meta">
                {athlete.clubName && (
                  <span
                    className={`athlete-result-club ${athlete.isOwnClub ? "own" : ""}`}
                  >
                    {athlete.clubName}
                  </span>
                )}
                {athlete.category && (
                  <span className="athlete-result-category">
                    {athlete.category}
                  </span>
                )}
                {athlete.ranking != null && (
                  <span className="athlete-result-ranking">
                    #{athlete.ranking}
                  </span>
                )}
              </div>
            </li>
          ))}

          {allowGuest && query.trim() && (
            <li
              role="option"
              aria-selected={highlightIndex === results.length}
              className={`athlete-result-item guest-option ${highlightIndex === results.length ? "highlighted" : ""}`}
              onClick={handleGuestSelect}
              onMouseEnter={() => setHighlightIndex(results.length)}
            >
              <div className="athlete-result-main">
                <span className="athlete-result-name">
                  Usar "{query.trim()}" como convidado
                </span>
              </div>
              <div className="athlete-result-meta">
                <span className="athlete-result-category">Sem cadastro</span>
              </div>
            </li>
          )}
        </ul>
      )}

      {isOpen &&
        results.length === 0 &&
        !isLoading &&
        query.length >= MIN_SEARCH_LENGTH &&
        !allowGuest && (
          <div className="athlete-search-empty">
            Nenhum atleta encontrado para "{query}"
          </div>
        )}
    </div>
  );
};

export default AthleteSearchInput;
