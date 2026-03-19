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
  globalId?: string; // Código único no diretório central
}

interface AthleteSearchInputProps {
  /** Label do campo */
  label?: string;
  /** Placeholder */
  placeholder?: string;
  /** Atleta selecionado */
  value?: AthleteResult | null;
  /** Callback quando atleta é selecionado ou alterado */
  onSelect: (athlete: AthleteResult | null) => void;
  /** Callback opcional quando o texto do input muda sem seleção formal */
  onQueryChange?: (query: string) => void;
  /** Permite criar atleta convidado (digitando nome livre) */
  allowGuest?: boolean;
  /** Classes CSS extras */
  className?: string;
  /** Desabilitar */
  disabled?: boolean;
  /** ID para label/accessibility */
  id?: string;
  /** userId do usuário logado — exclui da busca para não aparecer como opção */
  excludeUserId?: string;
  /** AthleteProfile.id a excluir dos resultados (ex: o jogador já selecionado no campo oposto) */
  excludeAthleteId?: string;
}

const DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

const AthleteSearchInput: React.FC<AthleteSearchInputProps> = ({
  label,
  placeholder = "Buscar atleta por nome ou código...",
  value,
  onSelect,
  onQueryChange,
  allowGuest = true,
  className = "",
  disabled = false,
  id,
  excludeUserId,
  excludeAthleteId,
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
    } else if (value === null) {
      // Se for explicitamente null, mas o query não bater (foi limpo externamente)
      // Não mexer se o user estiver digitando
    }
  }, [value?.id, value?.name]);

  // Quando excludeAthleteId muda (jogador oposto selecionado), filtra resultados em cache
  // e re-busca se o dropdown estiver aberto para garantir consistência
  useEffect(() => {
    // Filtra imediatamente o resultado já carregado
    if (excludeAthleteId) {
      setResults((prev) => prev.filter((a) => a.id !== excludeAthleteId));
    }
    // Se dropdown aberto, re-busca para garantir lista atualizada
    if (isOpen) {
      searchAthletes(query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludeAthleteId]);

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

  const searchAthletes = useCallback(
    async (searchQuery: string) => {
      setIsLoading(true);
      try {
        const excludeParam = excludeUserId
          ? `&excludeUserId=${encodeURIComponent(excludeUserId)}`
          : "";
        const excludeAthleteParam = excludeAthleteId
          ? `&excludeAthleteId=${encodeURIComponent(excludeAthleteId)}`
          : "";
        const response = await httpClient.get<{
          athletes: AthleteResult[];
        }>(
          `/athletes?q=${encodeURIComponent(searchQuery)}&limit=20${excludeParam}${excludeAthleteParam}`,
        );

        // A API retorna { athletes: [...] } — normaliza arrays legados
        const raw = response.data as any;
        const list: AthleteResult[] = Array.isArray(raw)
          ? raw
          : (raw?.athletes ?? []);

        setResults(list);
        setIsOpen(true);
        setHighlightIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [excludeUserId, excludeAthleteId],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    // COMUNICAR AO PAI O NOVO TEXTO IMEDIATAMENTE (solução definitiva para o bug de nomes vazios)
    if (onQueryChange) {
      onQueryChange(val);
    }

    // Se havia um atleta de banco selecionado (ID numérico/UUID) e o user editou, desmarcar
    // Mantemos atletas "guest_" porque eles já representam texto livre
    if (value && value.id && !value.id.startsWith("guest_")) {
      onSelect(null);
    }

    // Debounce da busca (mínimo de 2 caracteres)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
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
    if (results.length > 0) {
      setIsOpen(true);
    } else {
      // Carrega todos os atletas imediatamente ao focar (mesmo com campo vazio)
      searchAthletes(query);
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

      {value?.globalId && !value.id.startsWith("guest_") && (
        <div className="athlete-selected-code">
          <code>[{value.globalId.slice(0, 8).toUpperCase()}]</code>
        </div>
      )}

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
                {athlete.globalId && (
                  <code className="athlete-result-code">
                    [{athlete.globalId.slice(0, 8).toUpperCase()}]
                  </code>
                )}
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
