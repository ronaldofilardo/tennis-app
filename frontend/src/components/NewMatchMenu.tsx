// frontend/src/components/NewMatchMenu.tsx
// Menu de opções ao criar ou encontrar partidas.
// Permite: Criar nova partida, Descobrir partidas abertas para anotar.

import React, { useRef, useEffect, useCallback } from 'react';

interface NewMatchMenuProps {
  /** Chamado ao selecionar "Criar Nova Partida" */
  onCreateMatch: () => void;
  /** Chamado ao selecionar "Descobrir Partidas" */
  onDiscoverMatches: () => void;
  /** Fechar o menu */
  onClose: () => void;
  /** Elemento âncora para posicionamento */
  anchorRef: React.RefObject<HTMLElement>;
}

const NewMatchMenu: React.FC<NewMatchMenuProps> = ({
  onCreateMatch,
  onDiscoverMatches,
  onClose,
  anchorRef,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    },
    [onClose, anchorRef],
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [handleOutsideClick]);

  // Fechar ao pressionar Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div ref={menuRef} role="menu" aria-label="Opções de partida" className="new-match-menu">
      <button
        role="menuitem"
        className="new-match-menu__item"
        onClick={() => {
          onClose();
          onCreateMatch();
        }}
      >
        <span className="new-match-menu__icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            width={18}
            height={18}
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
        <span className="new-match-menu__text">
          <strong>Nova Partida</strong>
          <small>Criar e acompanhar uma partida</small>
        </span>
      </button>

      <div className="new-match-menu__divider" role="separator" />

      <button
        role="menuitem"
        className="new-match-menu__item"
        onClick={() => {
          onClose();
          onDiscoverMatches();
        }}
      >
        <span className="new-match-menu__icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            width={18}
            height={18}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <span className="new-match-menu__text">
          <strong>Descobrir Partidas</strong>
          <small>Anotar partidas de outros atletas</small>
        </span>
      </button>
    </div>
  );
};

export default NewMatchMenu;
