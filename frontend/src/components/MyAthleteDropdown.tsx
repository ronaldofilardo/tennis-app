import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { httpClient } from '../config/httpClient';
import './MyAthleteDropdown.css';

export interface MyAthlete {
  id: string;
  name: string;
  nickname?: string;
  gender?: string;
  age?: number;
  ranking?: number;
  clubName?: string;
  dominance?: string;
  backhand?: string;
}

interface MyAthleteDropdownProps {
  label?: string;
  placeholder?: string;
  value: MyAthlete | null;
  onSelect?: (athlete: MyAthlete | null) => void;
  onChange?: (athlete: MyAthlete | null) => void;
  onCreateNew: () => void;
  className?: string;
  disabled?: boolean;
  excludeAthleteId?: string;
}

const MyAthleteDropdown: React.FC<MyAthleteDropdownProps> = ({
  label,
  placeholder = 'Selecione um atleta...',
  value,
  onSelect,
  onChange,
  onCreateNew,
  className = '',
  disabled = false,
  excludeAthleteId,
}) => {
  const handleSelection = onChange ?? onSelect ?? (() => {});

  const [athletes, setAthletes] = useState<MyAthlete[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Carrega atletas no mount
  useEffect(() => {
    const loadAthletes = async () => {
      setIsLoading(true);
      try {
        console.log('[MyAthleteDropdown] Loading athletes from /athletes/my...');
        const response = await httpClient.get<{ athletes: MyAthlete[] }>('/athletes/my');
        console.log('[MyAthleteDropdown] Response:', response);
        console.log('[MyAthleteDropdown] Athletes loaded:', response.data.athletes);
        const filtered = response.data.athletes.filter((a) => a.id !== excludeAthleteId);
        setAthletes(filtered);
      } catch (err) {
        console.error('[MyAthleteDropdown] error loading athletes:', err);
        console.error('[MyAthleteDropdown] error details:', JSON.stringify(err, null, 2));
        setAthletes([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAthletes();
  }, [excludeAthleteId]);

  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isClickingItemRef = useRef(false);

  // Close on click outside (usando mousedown para capturar antes do click handler)
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideContainer = containerRef.current?.contains(target);
      const isInsideMenu = menuRef.current?.contains(target);

      // Se clicou dentro, marcar que está clicando um item
      if (isInsideMenu) {
        isClickingItemRef.current = true;
        return;
      }

      // Se clicou fora do container e do menu, fechar
      if (!isInsideContainer && !isInsideMenu) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleMouseDown, true);
      return () => document.removeEventListener('mousedown', handleMouseDown, true);
    }
  }, [isOpen]);

  // Reset flag após click completar (usado para permitir que onClick do item dispare)
  useEffect(() => {
    const handleMouseUp = () => {
      isClickingItemRef.current = false;
    };

    if (isOpen) {
      document.addEventListener('mouseup', handleMouseUp, true);
      return () => document.removeEventListener('mouseup', handleMouseUp, true);
    }
  }, [isOpen]);

  // Cleanup timeout ao desmontar
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  // Calcula posição do menu usando o trigger (position: fixed, portal no body)
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuStyle({
        top: `${rect.bottom + window.scrollY + 4}px`,
        left: `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`,
      });
    }
  }, [isOpen]);

  const handleSelectAthlete = (athlete: MyAthlete) => {
    handleSelection(athlete);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    onCreateNew();
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleSelection(null);
  };

  const filteredAthletes = athletes.filter((a) => a.id !== excludeAthleteId);

  return (
    <div
      ref={containerRef}
      className={`my-athlete-dropdown ${className} ${value ? 'has-value' : ''} ${disabled ? 'disabled' : ''}`}
    >
      {label && <label className="my-athlete-dropdown-label">{label}</label>}

      <div
        ref={triggerRef}
        className="my-athlete-dropdown-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="my-athlete-dropdown-value">{value ? value.name : placeholder}</span>
        {value && (
          <button
            type="button"
            className="my-athlete-dropdown-clear"
            onClick={handleClear}
            aria-label="Limpar seleção"
          >
            ✕
          </button>
        )}
        <span className={`my-athlete-dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>

      {isOpen &&
        ReactDOM.createPortal(
          <div ref={menuRef} className="my-athlete-dropdown-menu" style={menuStyle}>
            {isLoading && <div className="my-athlete-dropdown-loading">Carregando...</div>}

            {!isLoading && (
              <>
                {/* Opção "Novo atleta" */}
                <div className="my-athlete-dropdown-group">
                  <button
                    type="button"
                    className="my-athlete-dropdown-item new-athlete"
                    onClick={() => handleCreateNew()}
                  >
                    <span className="new-athlete-icon">+</span>
                    <span className="new-athlete-label">Novo atleta</span>
                  </button>
                </div>

                {/* Divisor */}
                {filteredAthletes.length > 0 && <div className="my-athlete-dropdown-divider" />}

                {/* Lista de atletas */}
                {filteredAthletes.length > 0 ? (
                  <div className="my-athlete-dropdown-group">
                    {filteredAthletes.map((athlete) => (
                      <button
                        key={athlete.id}
                        type="button"
                        className={`my-athlete-dropdown-item ${value?.id === athlete.id ? 'selected' : ''}`}
                        onClick={() => handleSelectAthlete(athlete)}
                      >
                        <div className="my-athlete-dropdown-item-name">{athlete.name}</div>
                        <div className="my-athlete-dropdown-item-meta">
                          {athlete.clubName && (
                            <span className="my-athlete-dropdown-item-club">
                              {athlete.clubName}
                            </span>
                          )}
                          {athlete.ranking != null && (
                            <span className="my-athlete-dropdown-item-ranking">
                              #{athlete.ranking}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : !isLoading ? (
                  <div className="my-athlete-dropdown-empty">Nenhum atleta cadastrado</div>
                ) : null}
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default MyAthleteDropdown;
