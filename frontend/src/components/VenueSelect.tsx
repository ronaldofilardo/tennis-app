// frontend/src/components/VenueSelect.tsx
// Autocomplete para seleção de local de partida.
// - Debounce 300 ms → GET /api/venues?q=texto
// - Opção "+ Adicionar '[texto]'" cria via POST /api/venues
// - Props: value/onChange tipados, disabled

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { httpClient } from '../config/httpClient';
import './VenueSelect.css';

export interface VenueOption {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
}

export interface VenueValue {
  venueId: string | null;
  venueName: string;
}

interface VenueSelectProps {
  value: VenueValue;
  onChange: (v: VenueValue) => void;
  disabled?: boolean;
  placeholder?: string;
}

const VenueSelect: React.FC<VenueSelectProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Buscar ou criar local...',
}) => {
  const [inputText, setInputText] = useState(value.venueName);
  const [options, setOptions] = useState<VenueOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincroniza inputText quando value.venueName muda externamente
  useEffect(() => {
    setInputText(value.venueName);
  }, [value.venueName]);

  const fetchVenues = useCallback(async (q: string) => {
    try {
      const res = await httpClient.get<VenueOption[]>('/venues', { params: { q } });
      setOptions(res.data);
    } catch {
      setOptions([]);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);
    // Limpa seleção ao digitar livremente
    onChange({ venueId: null, venueName: text });
    setIsOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchVenues(text), 300);
  };

  const handleSelect = (venue: VenueOption) => {
    setInputText(venue.name);
    onChange({ venueId: venue.id, venueName: venue.name });
    setIsOpen(false);
  };

  const handleCreate = async () => {
    const name = inputText.trim();
    if (!name) return;
    setIsCreating(true);
    try {
      const res = await httpClient.post<VenueOption>('/venues', { name });
      const created = res.data;
      setInputText(created.name);
      onChange({ venueId: created.id, venueName: created.name });
      setOptions((prev) => [created, ...prev]);
    } catch {
      // Falha silenciosa — mantém texto livre
    } finally {
      setIsCreating(false);
      setIsOpen(false);
    }
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showCreate =
    inputText.trim().length > 0 &&
    !options.some((o) => o.name.toLowerCase() === inputText.trim().toLowerCase());

  return (
    <div className="venue-select" ref={containerRef}>
      <input
        type="text"
        className="venue-select__input"
        value={inputText}
        onChange={handleInputChange}
        onFocus={() => {
          fetchVenues(inputText);
          setIsOpen(true);
        }}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        aria-label="Local da partida"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        role="combobox"
      />
      {value.venueId && (
        <span className="venue-select__badge" aria-label="Local selecionado">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
      {isOpen && (
        <ul className="venue-select__dropdown" role="listbox" aria-label="Opções de local">
          {options.map((opt) => (
            <li
              key={opt.id}
              className="venue-select__option"
              role="option"
              aria-selected={opt.id === value.venueId}
              onMouseDown={() => handleSelect(opt)}
            >
              <span className="venue-select__option-name">{opt.name}</span>
              {opt.city && <span className="venue-select__option-city">{opt.city}</span>}
            </li>
          ))}
          {showCreate && (
            <li
              className="venue-select__option venue-select__option--create"
              role="option"
              aria-selected={false}
              onMouseDown={handleCreate}
            >
              {isCreating ? (
                <span>Criando...</span>
              ) : (
                <span>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ marginRight: 6, verticalAlign: 'middle' }}
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Adicionar &ldquo;{inputText.trim()}&rdquo;
                </span>
              )}
            </li>
          )}
          {options.length === 0 && !showCreate && (
            <li className="venue-select__empty">Nenhum local encontrado</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default VenueSelect;
